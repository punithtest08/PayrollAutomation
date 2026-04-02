const Employee    = require("../models/Employee");
const ExitRequest = require("../models/ExitRequest");
const Payroll     = require("../models/Payroll");
const { computeFNF } = require("../services/fnfService");
const { log }        = require("../services/auditService");

// ── POST /api/exit/:id/initiate ───────────────────────────────────────────────
exports.initiate = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    if (emp.status !== "Active")
      return res.status(400).json({ error: "Only Active employees can initiate exit" });

    const existing = await ExitRequest.findOne({ employee: emp._id });
    if (existing) return res.status(400).json({ error: "Exit already initiated for this employee" });

    const { lastWorkingDay, exitType, exitReason, noticePeriodDays = 30 } = req.body;
    if (!lastWorkingDay || !exitType || !exitReason)
      return res.status(400).json({ error: "lastWorkingDay, exitType and exitReason are required" });

    const exit = await ExitRequest.create({
      employee: emp._id,
      lastWorkingDay: new Date(lastWorkingDay),
      exitType,
      exitReason,
      noticePeriodDays: Number(noticePeriodDays),
      initiatedBy: req.user._id,
    });

    emp.status           = "Exit_Initiated";
    emp.lastWorkingDay   = new Date(lastWorkingDay);
    emp.exitType         = exitType;
    emp.exitReason       = exitReason;
    emp.noticePeriodDays = Number(noticePeriodDays);
    await emp.save();

    await log({
      action: "EXIT_INITIATED", entity: "ExitRequest", entityId: exit._id,
      performedBy: req.user._id.toString(),
      details: { empId: emp.empId, lastWorkingDay, exitType },
      ip: req.ip,
    });

    res.status(201).json(exit);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── POST /api/exit/:id/approve ────────────────────────────────────────────────
// Body: { action: "Approved"|"Rejected", comment: "" }
exports.approve = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const exit = await ExitRequest.findOne({ employee: emp._id });
    if (!exit) return res.status(404).json({ error: "No exit request found" });
    if (exit.status !== "Pending_HR")
      return res.status(400).json({ error: `Exit is already ${exit.status}` });

    const { action, comment = "" } = req.body;
    if (!["Approved", "Rejected"].includes(action))
      return res.status(400).json({ error: "action must be Approved or Rejected" });

    exit.hrApproval = { status: action, by: req.user._id, comment, at: new Date() };
    exit.status     = action === "Approved" ? "Approved" : "Rejected";

    if (action === "Rejected") {
      emp.status = "Active";
      await emp.save();
    }

    await exit.save();

    await log({
      action: `EXIT_HR_${action.toUpperCase()}`,
      entity: "ExitRequest", entityId: exit._id,
      performedBy: req.user._id.toString(),
      details: { empId: emp.empId, comment },
      ip: req.ip,
    });

    res.json(exit);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── GET /api/exit/:id/details ─────────────────────────────────────────────────
exports.getDetails = async (req, res) => {
  try {
    const exit = await ExitRequest.findOne({ employee: req.params.id })
      .populate("employee", "name empId department position ctcBreakdown salary doj")
      .populate("hrApproval.by", "name role")
      .populate("initiatedBy", "name role");
    if (!exit) return res.status(404).json({ error: "No exit request found" });
    res.json(exit);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// ── POST /api/exit/:id/calculate-fnf ─────────────────────────────────────────
exports.calculateFNF = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const exit = await ExitRequest.findOne({ employee: emp._id });
    if (!exit) return res.status(404).json({ error: "No exit request found" });
    if (!["Approved", "Completed"].includes(exit.status))
      return res.status(400).json({ error: "F&F can only be calculated after HR approval" });

    const {
      noticeDaysServed  = exit.noticePeriodDays,
      leaveBalance      = 0,
      bonus             = 0,
      otherDeductions   = 0,
    } = req.body;

    const fnf = await computeFNF({
      emp,
      lastWorkingDay:   exit.lastWorkingDay,
      noticePeriodDays: exit.noticePeriodDays,
      noticeDaysServed: Number(noticeDaysServed),
      leaveBalance:     Number(leaveBalance),
      bonus:            Number(bonus),
      otherDeductions:  Number(otherDeductions),
    });

    exit.fnf             = fnf;
    exit.fnfCalculatedAt = new Date();
    await exit.save();

    await log({
      action: "FNF_CALCULATED", entity: "ExitRequest", entityId: exit._id,
      performedBy: req.user._id.toString(),
      details: { empId: emp.empId, netFNF: fnf.netFNF },
      ip: req.ip,
    });

    res.json({ fnf, exit });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── POST /api/exit/:id/complete ───────────────────────────────────────────────
exports.complete = async (req, res) => {
  try {
    const emp = await Employee.findById(req.params.id);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const exit = await ExitRequest.findOne({ employee: emp._id });
    if (!exit) return res.status(404).json({ error: "No exit request found" });
    if (exit.status !== "Approved")
      return res.status(400).json({ error: "Exit must be approved before completing" });
    if (!exit.fnf || !exit.fnfCalculatedAt)
      return res.status(400).json({ error: "F&F must be calculated before completing exit" });

    const lwd   = new Date(exit.lastWorkingDay);
    const month = `${lwd.getFullYear()}-${String(lwd.getMonth() + 1).padStart(2, "0")}`;
    const fnf   = exit.fnf;

    const fnfPayroll = await Payroll.findOneAndUpdate(
      { employee: emp._id, month, type: "fnf" },
      {
        employee: emp._id, month, type: "fnf",
        annualCTC: emp.salary, monthlyGross: emp.ctcBreakdown.monthlyGross,
        workingDays: fnf.calendarDaysInMonth, daysWorked: fnf.daysWorkedInMonth,
        proratedBasic: fnf.salaryTillLWD, proratedHRA: 0, proratedSpecial: 0,
        bonus: fnf.bonus, grossSalary: fnf.totalEarnings,
        pf: fnf.pf, gratuity: 0, professionalTax: fnf.professionalTax,
        tds: fnf.balanceTDS, annualTax: fnf.annualTaxLiability,
        totalDeductions: fnf.totalDeductions, netSalary: fnf.netFNF,
        status: "Processed", generatedBy: req.user._id.toString(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    exit.status       = "Completed";
    exit.fnfPayrollId = fnfPayroll._id;
    exit.completedAt  = new Date();
    await exit.save();

    emp.status = "Exited";
    await emp.save();

    await log({
      action: "EXIT_COMPLETED", entity: "ExitRequest", entityId: exit._id,
      performedBy: req.user._id.toString(),
      details: { empId: emp.empId, netFNF: fnf.netFNF, month },
      ip: req.ip,
    });

    res.json({ message: "Exit completed successfully", exit, fnfPayroll });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// ── GET /api/exit ─────────────────────────────────────────────────────────────
exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const exits = await ExitRequest.find(filter)
      .populate("employee", "name empId department position")
      .sort({ createdAt: -1 });
    res.json(exits);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
