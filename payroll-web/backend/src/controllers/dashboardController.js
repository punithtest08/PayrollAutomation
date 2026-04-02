const Employee   = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Leave      = require("../models/Leave");
const Payroll    = require("../models/Payroll");
const AuditLog   = require("../models/AuditLog");

exports.getSummary = async (req, res) => {
  try {
    const today        = new Date().toISOString().split("T")[0];
    const currentMonth = today.slice(0, 7);
    const prevMonth    = (() => {
      const d = new Date(); d.setMonth(d.getMonth() - 1);
      return d.toISOString().slice(0, 7);
    })();

    const [
      totalEmployees, activeEmployees,
      todayAttendance, pendingLeaves,
      currentPayroll, prevPayroll,
      deptBreakdown, recentAudit,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: "Active" }),
      Attendance.find({ date: today }),
      Leave.countDocuments({ status: "Pending" }),
      Payroll.find({ month: currentMonth }),
      Payroll.find({ month: prevMonth }),
      Employee.aggregate([
        { $group: { _id: "$department", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      AuditLog.find().sort({ createdAt: -1 }).limit(10),
    ]);

    const presentToday   = todayAttendance.filter((a) => a.status === "Present").length;
    const absentToday    = todayAttendance.filter((a) => a.status === "Absent").length;
    const monthlyNet     = currentPayroll.reduce((s, p) => s + (p.netSalary || 0), 0);
    const monthlyGross   = currentPayroll.reduce((s, p) => s + (p.grossSalary || 0), 0);
    const prevNet        = prevPayroll.reduce((s, p) => s + (p.netSalary || 0), 0);
    const payrollGrowth  = prevNet ? Math.round(((monthlyNet - prevNet) / prevNet) * 100) : 0;

    // Monthly payroll trend (last 6 months)
    const trend = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const m = d.toISOString().slice(0, 7);
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      trend.push({ month: m, label });
    }
    const trendData = await Promise.all(
      trend.map(async ({ month, label }) => {
        const records = await Payroll.find({ month });
        return {
          month: label,
          netPayroll: Math.round(records.reduce((s, p) => s + (p.netSalary || 0), 0)),
          employees:  records.length,
        };
      })
    );

    res.json({
      totalEmployees, activeEmployees,
      presentToday, absentToday,
      attendanceRate: totalEmployees ? Math.round((presentToday / totalEmployees) * 100) : 0,
      pendingLeaves,
      monthlyPayroll: Math.round(monthlyNet),   // alias used by frontend
      monthlyNet:     Math.round(monthlyNet),
      totalGross:     Math.round(monthlyGross),
      monthlyGross:   Math.round(monthlyGross),
      processedPayrolls: currentPayroll.length,
      payrollGrowth,
      deptBreakdown,
      trendData,
      recentAudit,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// GET /api/dashboard/audit-logs
exports.getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find()
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit) || 50);
    res.json(logs);
  } catch (err) { res.status(500).json({ error: err.message }); }
};
