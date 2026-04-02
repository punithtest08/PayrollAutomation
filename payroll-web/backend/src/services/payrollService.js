/**
 * payrollService.js
 * Single source of truth for ALL salary and tax calculations.
 * Used by: employeeController (CTC breakdown on create),
 *          payrollController (monthly payroll generation),
 *          cronJob (auto payroll)
 */

const WORKING_DAYS   = 26;
const PROF_TAX       = 200;
const PF_WAGE_CAP    = 15000;   // PF calculated on max ₹15,000 basic/month
const BASIC_PCT      = 0.50;    // Basic = 50% of CTC
const HRA_PCT        = 0.40;    // HRA   = 40% of Basic
const PF_PCT         = 0.12;    // PF    = 12% of Basic (employee share)
const GRATUITY_PCT   = 0.0481;  // Gratuity = 4.81% of Basic

const r = (n) => Math.round(n * 100) / 100;

/**
 * Compute full annual CTC breakdown.
 * Called when employee is created/updated.
 * @param {number} annualCTC
 * @returns {object} ctcBreakdown
 */
function computeCTCBreakdown(annualCTC) {
  const basic            = r(annualCTC * BASIC_PCT);
  const hra              = r(basic * HRA_PCT);
  const pf               = r(Math.min(basic / 12, PF_WAGE_CAP) * PF_PCT * 12);  // annual PF
  const gratuity         = r(basic * GRATUITY_PCT);
  const specialAllowance = r(annualCTC - basic - hra - pf - gratuity);

  const monthlyBasic   = r(basic / 12);
  const monthlyHRA     = r(hra / 12);
  const monthlyPF      = r(pf / 12);
  const monthlyGratuity= r(gratuity / 12);
  const monthlySpecial = r(specialAllowance / 12);
  const monthlyGross   = r(annualCTC / 12);

  return {
    ctc: annualCTC,
    basic, hra, pf, gratuity, specialAllowance,
    monthlyGross, monthlyBasic, monthlyHRA,
    monthlyPF, monthlyGratuity, monthlySpecial,
  };
}

/**
 * India New Tax Regime FY 2024-25
 * Standard deduction ₹75,000 | Rebate 87A ≤ ₹7L | 4% cess
 */
function computeAnnualTax(annualIncome) {
  const taxable = Math.max(0, annualIncome - 75000);
  const slabs   = [
    [300000, 0.00],
    [400000, 0.05],
    [300000, 0.10],
    [200000, 0.15],
    [300000, 0.20],
    [Infinity, 0.30],
  ];
  let tax = 0, rem = taxable;
  for (const [limit, rate] of slabs) {
    if (rem <= 0) break;
    const chunk = Math.min(rem, limit);
    tax += chunk * rate;
    rem -= chunk;
  }
  if (taxable <= 700000) tax = 0;          // Rebate u/s 87A
  return r(tax * 1.04);                    // +4% cess
}

/**
 * Generate one month's payroll for an employee.
 * @param {object} ctcBreakdown  — from Employee.ctcBreakdown
 * @param {number} daysWorked    — from Attendance records
 * @param {number} bonus         — optional
 * @param {number} workingDays   — default 26
 */
function computeMonthlyPayroll(ctcBreakdown, daysWorked, bonus = 0, workingDays = WORKING_DAYS) {
  const { monthlyBasic, monthlyHRA, monthlySpecial, monthlyGross, ctc } = ctcBreakdown;

  // Prorate by attendance
  const ratio          = Math.min(daysWorked, workingDays) / workingDays;
  const proratedBasic  = r(monthlyBasic  * ratio);
  const proratedHRA    = r(monthlyHRA    * ratio);
  const proratedSpecial= r(monthlySpecial* ratio);
  const grossSalary    = r(proratedBasic + proratedHRA + proratedSpecial + bonus);

  // Deductions
  const pfBase         = Math.min(proratedBasic, PF_WAGE_CAP);
  const pf             = r(pfBase * PF_PCT);
  const gratuity       = r(proratedBasic * GRATUITY_PCT);
  const professionalTax= PROF_TAX;

  // Tax on annualised prorated income
  const annualisedIncome = (proratedBasic + proratedHRA + proratedSpecial) * 12 + bonus;
  const annualTax        = computeAnnualTax(annualisedIncome);
  const tds              = r(annualTax / 12);

  const totalDeductions  = r(pf + tds + professionalTax);
  const netSalary        = r(grossSalary - totalDeductions);

  return {
    annualCTC: ctc,
    monthlyGross,
    workingDays,
    daysWorked,
    proratedBasic,
    proratedHRA,
    proratedSpecial,
    bonus,
    grossSalary,
    pf,
    gratuity,
    professionalTax,
    tds,
    annualTax,
    totalDeductions,
    netSalary,
  };
}

module.exports = { computeCTCBreakdown, computeMonthlyPayroll, computeAnnualTax, WORKING_DAYS };
