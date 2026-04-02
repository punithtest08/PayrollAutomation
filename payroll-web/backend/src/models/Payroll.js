const mongoose = require("mongoose");

const payrollSchema = new mongoose.Schema({
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  month:           { type: String, required: true },   // "YYYY-MM"

  // CTC inputs
  annualCTC:       { type: Number, required: true },
  monthlyGross:    { type: Number, required: true },   // annualCTC / 12

  // Attendance
  workingDays:     { type: Number, required: true, default: 26 },
  daysWorked:      { type: Number, required: true },

  // Earnings (prorated by attendance)
  proratedBasic:   { type: Number, required: true },
  proratedHRA:     { type: Number, required: true },
  proratedSpecial: { type: Number, required: true },
  bonus:           { type: Number, default: 0 },
  grossSalary:     { type: Number, required: true },   // proratedBasic + proratedHRA + proratedSpecial + bonus

  // Deductions
  pf:              { type: Number, required: true },   // 12% of proratedBasic (capped ₹15k wage)
  gratuity:        { type: Number, required: true },   // 4.81% of proratedBasic
  professionalTax: { type: Number, required: true },   // fixed ₹200
  tds:             { type: Number, required: true },   // monthly TDS
  annualTax:       { type: Number, required: true },
  totalDeductions: { type: Number, required: true },

  // Net
  netSalary:       { type: Number, required: true },

  status:          { type: String, enum: ["Draft", "Processed", "Paid"], default: "Processed" },
  type:            { type: String, enum: ["monthly", "fnf"], default: "monthly" },
  generatedBy:     { type: String, default: "system" },  // "system" | userId
}, { timestamps: true });

payrollSchema.index({ employee: 1, month: 1 }, { unique: true });

module.exports = mongoose.model("Payroll", payrollSchema);
