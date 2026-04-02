const Attendance = require("../models/Attendance");
const Employee = require("../models/Employee");

// POST /api/attendance — mark attendance
exports.mark = async (req, res) => {
  try {
    const { employee, date, status, checkIn, checkOut } = req.body;
    const record = await Attendance.findOneAndUpdate(
      { employee, date },
      { employee, date, status, checkIn, checkOut },
      { upsert: true, new: true, runValidators: true }
    ).populate("employee", "name empId department");
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/attendance?date=YYYY-MM-DD
exports.getByDate = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: "date query param required" });

    let empFilter = {};
    if (req.teamFilter?.department) {
      const teamIds = await Employee.find({ department: req.teamFilter.department }, "_id");
      empFilter = { employee: { $in: teamIds.map((e) => e._id) } };
    }

    const records = await Attendance.find({ date, ...empFilter })
      .populate("employee", "name empId department");
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/attendance/:employeeId
exports.getByEmployee = async (req, res) => {
  try {
    const empId = req.selfEmployeeId || req.params.employeeId;
    // Manager: verify employee belongs to their department
    if (!req.selfEmployeeId && req.teamFilter?.department) {
      const emp = await Employee.findOne({ _id: req.params.employeeId, department: req.teamFilter.department });
      if (!emp) return res.status(403).json({ error: "Employee not in your department" });
    }
    const records = await Attendance.find({ employee: empId })
      .sort({ date: -1 })
      .populate("employee", "name empId");
    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/attendance/summary/:employeeId
exports.getMonthlySummary = async (req, res) => {
  try {
    const empId = req.selfEmployeeId || req.params.employeeId;
    const { month } = req.query;
    const filter = { employee: empId };
    if (month) filter.date = { $regex: `^${month}` };
    const records = await Attendance.find(filter);
    const summary = {
      present:  records.filter((r) => r.status === "Present").length,
      absent:   records.filter((r) => r.status === "Absent").length,
      halfDay:  records.filter((r) => r.status === "Half Day").length,
      leave:    records.filter((r) => r.status === "Leave").length,
      total:    records.length,
    };
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
