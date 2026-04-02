const Payroll    = require("../models/Payroll");
const Employee   = require("../models/Employee");
const Attendance = require("../models/Attendance");
const { computeMonthlyPayroll, WORKING_DAYS } = require("../services/payrollService");
const { log } = require("../services/auditService");

// POST /api/payroll/generate — manual trigger (HR)
exports.generate = async (req, res) => {
  try {
    const { employee: empId, month, bonus = 0 } = req.body;
    if (!empId || !month) return res.status(400).json({ error: "employee and month are required" });

    const emp = await Employee.findById(empId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    // Fetch attendance for the month
    const records = await Attendance.find({
      employee: empId,
      date: { $regex: `^${month}` },
      status: { $in: ["Present", "Half Day"] },
    });
    const daysWorked = records.reduce((s, r) => s + (r.status === "Half Day" ? 0.5 : 1), 0) || WORKING_DAYS;

    const calc = computeMonthlyPayroll(emp.ctcBreakdown, daysWorked, Number(bonus));

    const payroll = await Payroll.findOneAndUpdate(
      { employee: empId, month },
      { employee: empId, month, ...calc, status: "Processed", generatedBy: req.user?._id?.toString() || "manual" },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).populate("employee", "name empId department position");

    await log({
      action: "PAYROLL_GENERATED",
      entity: "Payroll",
      entityId: payroll._id,
      performedBy: req.user?._id?.toString() || "manual",
      details: { empId: emp.empId, month, netSalary: calc.netSalary },
      ip: req.ip,
    });

    res.status(201).json(payroll);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

// POST /api/payroll/run-month — run for ALL employees (HR)
exports.runForMonth = async (req, res) => {
  try {
    const { month } = req.body;
    if (!month) return res.status(400).json({ error: "month is required (YYYY-MM)" });

    const { runMonthlyPayroll } = require("../services/cronService");
    await runMonthlyPayroll(month);
    res.json({ message: `Payroll run triggered for ${month}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/payroll — all records with filters
exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.query.month)    filter.month    = req.query.month;
    if (req.query.employee) filter.employee = req.query.employee;
    if (req.query.status)   filter.status   = req.query.status;

    // Manager: restrict to their department
    if (req.teamFilter?.department) {
      const teamIds = await Employee.find({ department: req.teamFilter.department }, "_id");
      filter.employee = { $in: teamIds.map((e) => e._id) };
    }

    const records = await Payroll.find(filter)
      .populate("employee", "name empId department position")
      .sort({ month: -1, createdAt: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/payroll/slip/:id
exports.getSlip = async (req, res) => {
  try {
    const slip = await Payroll.findById(req.params.id)
      .populate("employee", "name empId department position email phone doj ctcBreakdown");
    if (!slip) return res.status(404).json({ error: "Payroll record not found" });
    // Employee: can only view their own slip
    if (req.selfEmployeeId && slip.employee._id.toString() !== req.selfEmployeeId)
      return res.status(403).json({ error: "Access denied" });
    res.json(slip);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/payroll/employee/:employeeId
exports.getByEmployee = async (req, res) => {
  try {
    // Employee: can only fetch their own records
    const empId = req.selfEmployeeId || req.params.employeeId;
    if (req.selfEmployeeId && req.params.employeeId !== req.selfEmployeeId)
      return res.status(403).json({ error: "Access denied" });
    const records = await Payroll.find({ employee: empId })
      .populate("employee", "name empId department position")
      .sort({ month: -1 });
    res.json(records);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// PUT /api/payroll/:id/status
exports.updateStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Draft", "Processed", "Paid"].includes(status))
      return res.status(400).json({ error: "Invalid status" });

    const record = await Payroll.findByIdAndUpdate(req.params.id, { status }, { new: true })
      .populate("employee", "name empId");

    await log({
      action: "PAYROLL_STATUS_UPDATED",
      entity: "Payroll",
      entityId: record._id,
      performedBy: req.user?._id?.toString() || "system",
      details: { status, empId: record.employee?.empId },
      ip: req.ip,
    });

    res.json(record);
  } catch (err) { res.status(400).json({ error: err.message }); }
};
