const cron = require("node-cron");
const Employee   = require("../models/Employee");
const Attendance = require("../models/Attendance");
const Payroll    = require("../models/Payroll");
const { computeMonthlyPayroll, WORKING_DAYS } = require("./payrollService");
const { log } = require("./auditService");

/**
 * Generate payroll for ONE employee for a given month.
 * Safe to call multiple times — uses upsert to prevent duplicates.
 */
async function generatePayrollForEmployee(emp, month) {
  // Count attendance for the month
  const records = await Attendance.find({
    employee: emp._id,
    date: { $regex: `^${month}` },
    status: { $in: ["Present", "Half Day"] },
  });

  const daysWorked = records.reduce(
    (sum, r) => sum + (r.status === "Half Day" ? 0.5 : 1), 0
  );

  // If no attendance at all, use full working days (new joiner / no data)
  const effectiveDays = daysWorked > 0 ? daysWorked : WORKING_DAYS;

  const calc = computeMonthlyPayroll(emp.ctcBreakdown, effectiveDays);

  const payroll = await Payroll.findOneAndUpdate(
    { employee: emp._id, month },
    {
      employee: emp._id,
      month,
      ...calc,
      status: "Processed",
      generatedBy: "system",
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  await log({
    action: "PAYROLL_GENERATED",
    entity: "Payroll",
    entityId: payroll._id,
    details: { empId: emp.empId, month, netSalary: calc.netSalary },
  });

  return payroll;
}

/**
 * Run payroll for ALL active employees for a given month.
 */
async function runMonthlyPayroll(month) {
  console.log(`[CRON] Running payroll for ${month}…`);
  const employees = await Employee.find({ status: "Active" });
  let success = 0, failed = 0;

  for (const emp of employees) {
    try {
      await generatePayrollForEmployee(emp, month);
      success++;
    } catch (err) {
      console.error(`[CRON] Failed for ${emp.empId}:`, err.message);
      failed++;
    }
  }

  console.log(`[CRON] Payroll done — ${success} success, ${failed} failed`);
  await log({
    action: "CRON_PAYROLL_RUN",
    entity: "Payroll",
    details: { month, success, failed, total: employees.length },
  });
}

/**
 * Schedule: 1st of every month at midnight IST
 */
function startCronJobs() {
  cron.schedule("0 0 1 * *", async () => {
    const now   = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await runMonthlyPayroll(month);
  }, { timezone: "Asia/Kolkata" });

  console.log("[CRON] Payroll scheduler registered (runs 1st of every month)");
}

module.exports = { startCronJobs, runMonthlyPayroll, generatePayrollForEmployee };
