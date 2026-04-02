const jwt      = require("jsonwebtoken");
const Employee = require("../models/Employee");
const Attendance= require("../models/Attendance");
const Payroll  = require("../models/Payroll");
const Leave    = require("../models/Leave");
const ExitRequest = require("../models/ExitRequest");
const { computeCTCBreakdown }          = require("../services/payrollService");
const { generatePayrollForEmployee }   = require("../services/cronService");
const { sendOfferConfirmationEmail }   = require("../services/emailService");
const { log }                          = require("../services/auditService");

// GET /api/employees/me — Employee self-profile
exports.getSelf = async (req, res) => {
  try {
    if (!req.user.linkedEmployee)
      return res.status(404).json({ error: "No employee profile linked" });
    const emp = await Employee.findById(req.user.linkedEmployee).populate("manager", "name email");
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/employees
exports.getAll = async (req, res) => {
  try {
    const { search, department, status } = req.query;
    const filter = { ...req.teamFilter }; // {} for HR, { manager: id } for Manager
    if (search) filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { empId: { $regex: search, $options: "i" } },
      { department: { $regex: search, $options: "i" } },
    ];
    if (department) filter.department = department;
    if (status)     filter.status     = status;
    const employees = await Employee.find(filter).populate("manager", "name email").sort({ createdAt: -1 });
    res.json(employees);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/employees/departments
exports.getDepartments = async (_req, res) => {
  try {
    const depts = await Employee.distinct("department");
    res.json(depts);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/employees/:id
exports.getOne = async (req, res) => {
  try {
    const filter = { _id: req.params.id, ...req.teamFilter };
    const emp = await Employee.findOne(filter).populate("manager", "name email");
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/employees/:id/full-profile
exports.getFullProfile = async (req, res) => {
  try {
    const id = req.params.id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const filter = { _id: id, ...req.teamFilter };
    const [emp, attendance, payroll, leaves, exitRequest] = await Promise.all([
      Employee.findOne(filter).populate("manager", "name email"),
      Attendance.find({ employee: id }).sort({ date: -1 }).limit(60),
      Payroll.find({ employee: id }).sort({ month: -1 }).limit(12),
      Leave.find({ employee: id }).sort({ createdAt: -1 }).limit(20),
      ExitRequest.findOne({ employee: id })
        .populate("hrApproval.by", "name role"),
    ]);

    if (!emp) return res.status(404).json({ error: "Employee not found" });

    // Attendance summary for current month
    const monthAtt = attendance.filter((a) => a.date.startsWith(currentMonth));
    const attSummary = {
      present:   monthAtt.filter((a) => a.status === "Present").length,
      absent:    monthAtt.filter((a) => a.status === "Absent").length,
      halfDay:   monthAtt.filter((a) => a.status === "Half Day").length,
      onLeave:   monthAtt.filter((a) => a.status === "Leave").length,
    };

    res.json({ employee: emp, attendance, payroll, leaves, attSummary, exitRequest });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/employees
exports.create = async (req, res) => {
  try {
    const { salary: annualCTC, ...rest } = req.body;
    if (!annualCTC || annualCTC <= 0)
      return res.status(400).json({ error: "Valid annual CTC is required" });

    // Compute CTC breakdown
    const ctcBreakdown = computeCTCBreakdown(Number(annualCTC));

    // Confirmation tokens
    const confirmToken = jwt.sign({ action: "confirm" }, process.env.JWT_SECRET, { expiresIn: "72h" });
    const disputeToken = jwt.sign({ action: "dispute" }, process.env.JWT_SECRET, { expiresIn: "72h" });

    const emp = await Employee.create({
      ...rest,
      salary: Number(annualCTC),
      ctcBreakdown,
      confirmToken,
    });

    // Send offer email (non-blocking)
    let emailSent = false;
    try {
      const base = process.env.FRONTEND_URL || "http://localhost:3000";
      await sendOfferConfirmationEmail(
        emp,
        `${base}/confirm?token=${confirmToken}&empId=${emp._id}&action=confirm`,
        `${base}/confirm?token=${disputeToken}&empId=${emp._id}&action=dispute`
      );
      emailSent = true;
    } catch (e) { console.error("Email failed:", e.message); }

    // Trigger initial payroll for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    try {
      await generatePayrollForEmployee(emp, currentMonth);
    } catch (e) { console.error("Initial payroll failed:", e.message); }

    await log({
      action: "EMPLOYEE_CREATED",
      entity: "Employee",
      entityId: emp._id,
      performedBy: req.user?._id?.toString() || "system",
      details: { empId: emp.empId, name: emp.name, ctc: annualCTC },
      ip: req.ip,
    });

    res.status(201).json({ ...emp.toObject(), emailSent });
  } catch (err) {
    if (err.code === 11000) return res.status(400).json({ error: "Employee ID or email already exists" });
    res.status(400).json({ error: err.message });
  }
};

// PUT /api/employees/:id
exports.update = async (req, res) => {
  try {
    const updates = { ...req.body };

    // Recompute CTC if salary changed
    if (updates.salary) {
      updates.ctcBreakdown = computeCTCBreakdown(Number(updates.salary));
    }

    const emp = await Employee.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true });
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    await log({
      action: "EMPLOYEE_UPDATED",
      entity: "Employee",
      entityId: emp._id,
      performedBy: req.user?._id?.toString() || "system",
      details: { empId: emp.empId, changes: Object.keys(updates) },
      ip: req.ip,
    });

    res.json(emp);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// DELETE /api/employees/:id
exports.remove = async (req, res) => {
  try {
    const emp = await Employee.findByIdAndDelete(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    await log({
      action: "EMPLOYEE_DELETED",
      entity: "Employee",
      entityId: emp._id,
      performedBy: req.user?._id?.toString() || "system",
      details: { empId: emp.empId },
      ip: req.ip,
    });

    res.json({ message: "Employee deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/employees/resend-confirmation/:id
exports.resendConfirmation = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const confirmToken = jwt.sign({ action: "confirm" }, process.env.JWT_SECRET, { expiresIn: "72h" });
    const disputeToken = jwt.sign({ action: "dispute" }, process.env.JWT_SECRET, { expiresIn: "72h" });
    emp.confirmToken  = confirmToken;
    emp.confirmStatus = "Pending";
    await emp.save();

    const base = process.env.FRONTEND_URL || "http://localhost:3000";
    await sendOfferConfirmationEmail(
      emp,
      `${base}/confirm?token=${confirmToken}&empId=${emp._id}&action=confirm`,
      `${base}/confirm?token=${disputeToken}&empId=${emp._id}&action=dispute`
    );
    res.json({ message: "Confirmation email resent" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/employees/confirm — PUBLIC
exports.confirmOffer = async (req, res) => {
  try {
    const { token, empId, action, note } = req.query;
    if (!token || !empId || !action)
      return res.status(400).json({ error: "Missing parameters" });

    try { jwt.verify(token, process.env.JWT_SECRET); }
    catch { return res.status(400).json({ error: "Link has expired or is invalid" }); }

    const emp = await Employee.findById(empId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    if (action === "confirm") {
      emp.confirmStatus = "Confirmed";
      emp.confirmedAt   = new Date();
    } else if (action === "dispute") {
      emp.confirmStatus = "Disputed";
      emp.disputeNote   = note || "";
    } else {
      return res.status(400).json({ error: "Invalid action" });
    }

    await emp.save();
    res.json({
      success: true, action,
      employee: { name: emp.name, empId: emp.empId, position: emp.position, department: emp.department, doj: emp.doj, confirmStatus: emp.confirmStatus },
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
