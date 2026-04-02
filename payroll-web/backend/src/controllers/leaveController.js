const Leave = require("../models/Leave");

// POST /api/leaves
exports.apply = async (req, res) => {
  try {
    // Employee can only apply for themselves
    const employeeId = req.selfEmployeeId || req.body.employee;
    if (!employeeId) return res.status(400).json({ error: "employee is required" });
    const { type, from, to, reason } = req.body;
    const days = Math.ceil((new Date(to) - new Date(from)) / (1000 * 60 * 60 * 24)) + 1;
    const leave = await Leave.create({ employee: employeeId, type, from, to, days, reason });
    await leave.populate("employee", "name empId department");
    res.status(201).json(leave);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// GET /api/leaves
exports.getAll = async (req, res) => {
  try {
    const filter = {};
    if (req.selfEmployeeId) {
      // Employee: own leaves only
      filter.employee = req.selfEmployeeId;
    } else {
      if (req.query.employee) filter.employee = req.query.employee;
      if (req.query.status)   filter.status   = req.query.status;
      // Manager: restrict to their department
      if (req.teamFilter?.department) {
        const teamIds = await require("../models/Employee")
          .find({ department: req.teamFilter.department }, "_id");
        filter.employee = { $in: teamIds.map((e) => e._id) };
      }
    }
    const leaves = await Leave.find(filter)
      .populate("employee", "name empId department")
      .populate("reviewedBy", "name")
      .sort({ createdAt: -1 });
    res.json(leaves);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// PUT /api/leaves/:id/review — approve or reject
exports.review = async (req, res) => {
  try {
    const { status } = req.body;
    if (!["Approved", "Rejected"].includes(status))
      return res.status(400).json({ error: "status must be Approved or Rejected" });

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      { status, reviewedBy: req.user._id },
      { new: true }
    ).populate("employee", "name empId");
    if (!leave) return res.status(404).json({ error: "Leave not found" });
    res.json(leave);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE /api/leaves/:id
exports.remove = async (req, res) => {
  try {
    await Leave.findByIdAndDelete(req.params.id);
    res.json({ message: "Leave deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
