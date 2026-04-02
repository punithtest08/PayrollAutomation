/**
 * fnfService.js
 * Full & Final Settlement calculation engine.
 *
 * Tax regime: India New Tax Regime FY 2024-25
 * Slabs (as specified):
 *   0–3L   → 0%
 *   3–6L   → 5%
 *   6–9L   → 10%
 *   9–12L  → 15%
 *   12–15L → 20%
 *   >15L   → 30%
 * Standard deduction: ₹75,000 | Rebate 87A ≤ ₹7L | 4% cess
 */

const Payroll = require("../models/Payroll");

const r = (n) => Math.round(n * 100) / 100;
const PF_PCT      = 0.12;
const PF_WAGE_CAP = 15000;
const PROF_TAX    = 200;

/**
 * FNF-specific tax slabs (as specified in requirements).
 * Slightly different slab boundaries from the monthly payroll slabs.
 */
function computeAnnualTaxFNF(annualIncome) {
  const taxable = Math.max(0, annualIncome - 75000); // std deduction
  const slabs = [
    [300000, 0.00],   // 0–3L
    [300000, 0.05],   // 3–6L
    [300000, 0.10],   // 6–9L
    [300000, 0.15],   // 9–12L
    [300000, 0.20],   // 12–15L
    [Infinity, 0.30], // >15L
  ];
  let tax = 0, rem = taxable;
  for (const [limit, rate] of slabs) {
    if (rem <= 0) break;
    const chunk = Math.min(rem, limit);
    tax += chunk * rate;
    rem -= chunk;
  }
  if (taxable <= 700000) tax = 0; // Rebate u/s 87A
  return r(tax * 1.04);           // +4% cess
}

/**
 * Calculate Full & Final Settlement.
 *
 * @param {object} emp            - Employee document (with ctcBreakdown)
 * @param {Date}   lastWorkingDay
 * @param {number} noticePeriodDays  - Required notice days per contract
 * @param {number} noticeDaysServed  - Actual days served in notice
 * @param {number} leaveBalance      - Unused leave days to encash
 * @param {number} bonus             - Any additional bonus/incentive
 * @param {number} otherDeductions   - Loans, advances, etc.
 * @param {string} employeeId        - MongoDB _id for fetching past payroll
 */
async function computeFNF({
  emp,
  lastWorkingDay,
  noticePeriodDays,
  noticeDaysServed,
  leaveBalance    = 0,
  bonus           = 0,
  otherDeductions = 0,
}) {
  const ctc = emp.ctcBreakdown;
  const monthlyGross = ctc.monthlyGross;
  const monthlyBasic = ctc.monthlyBasic;

  // ── 1. Salary till LWD (prorated by calendar days) ──────────────────────
  const lwd = new Date(lastWorkingDay);
  const calendarDaysInMonth = new Date(lwd.getFullYear(), lwd.getMonth() + 1, 0).getDate();
  const daysWorkedInMonth   = lwd.getDate(); // day-of-month = days worked in final month
  const salaryTillLWD       = r((monthlyGross / calendarDaysInMonth) * daysWorkedInMonth);

  // ── 2. Leave Encashment ──────────────────────────────────────────────────
  const leaveEncashment = r(Math.max(0, leaveBalance) * (monthlyGross / 30));

  // ── 3. Notice Period Deduction ───────────────────────────────────────────
  const noticeShortfall  = Math.max(0, noticePeriodDays - noticeDaysServed);
  const noticeDeduction  = r((monthlyGross / 30) * noticeShortfall);

  // ── 4. PF on final month basic ───────────────────────────────────────────
  const finalBasic = r((monthlyBasic / calendarDaysInMonth) * daysWorkedInMonth);
  const pf         = r(Math.min(finalBasic, PF_WAGE_CAP) * PF_PCT);

  // ── 5. Tax adjustment (balance TDS) ─────────────────────────────────────
  // Sum all TDS already deducted this financial year from monthly payrolls
  const fyStart = lwd.getMonth() >= 3
    ? `${lwd.getFullYear()}-04`
    : `${lwd.getFullYear() - 1}-04`;

  const pastPayrolls = await Payroll.find({
    employee: emp._id,
    type: "monthly",
    month: { $gte: fyStart },
  });

  const taxAlreadyDeducted = r(pastPayrolls.reduce((s, p) => s + (p.tds || 0), 0));

  // Annualise total income for the year (past months + final settlement)
  const pastGross      = pastPayrolls.reduce((s, p) => s + (p.grossSalary || 0), 0);
  const totalYearIncome = r(pastGross + salaryTillLWD + leaveEncashment + bonus);
  const annualTaxLiability = computeAnnualTaxFNF(totalYearIncome);
  const balanceTDS     = r(Math.max(0, annualTaxLiability - taxAlreadyDeducted));

  // ── 6. Totals ────────────────────────────────────────────────────────────
  const totalEarnings   = r(salaryTillLWD + leaveEncashment + bonus);
  const totalDeductions = r(pf + PROF_TAX + noticeDeduction + otherDeductions + balanceTDS);
  const netFNF          = r(totalEarnings - totalDeductions);

  return {
    // Earnings
    salaryTillLWD,
    leaveEncashment,
    bonus,
    totalEarnings,
    // Deductions
    pf,
    professionalTax: PROF_TAX,
    noticeDeduction,
    otherDeductions,
    balanceTDS,
    totalDeductions,
    // Net
    netFNF,
    // Inputs (stored for audit/display)
    daysWorkedInMonth,
    calendarDaysInMonth,
    leaveBalance,
    noticeDaysServed,
    noticeShortfall,
    taxAlreadyDeducted,
    annualTaxLiability,
  };
}

module.exports = { computeFNF, computeAnnualTaxFNF };
