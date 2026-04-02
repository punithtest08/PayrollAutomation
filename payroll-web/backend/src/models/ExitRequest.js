const mongoose = require("mongoose");

const approvalSchema = new mongoose.Schema({
  status:    { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  by:        { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  comment:   { type: String, default: "" },
  at:        { type: Date },
}, { _id: false });

const fnfSchema = new mongoose.Schema({
  // Earnings
  salaryTillLWD:      { type: Number, default: 0 },  // prorated salary up to LWD
  leaveEncashment:    { type: Number, default: 0 },  // leaveBalance × (monthlyGross/30)
  bonus:              { type: Number, default: 0 },
  totalEarnings:      { type: Number, default: 0 },

  // Deductions
  pf:                 { type: Number, default: 0 },
  professionalTax:    { type: Number, default: 0 },
  noticeDeduction:    { type: Number, default: 0 },  // shortfall days × (monthlyGross/30)
  otherDeductions:    { type: Number, default: 0 },
  balanceTDS:         { type: Number, default: 0 },  // remaining tax liability
  totalDeductions:    { type: Number, default: 0 },

  // Net
  netFNF:             { type: Number, default: 0 },

  // Inputs used
  daysWorkedInMonth:  { type: Number, default: 0 },
  calendarDaysInMonth:{ type: Number, default: 30 },
  leaveBalance:       { type: Number, default: 0 },
  noticeDaysServed:   { type: Number, default: 0 },
  noticeShortfall:    { type: Number, default: 0 },
  taxAlreadyDeducted: { type: Number, default: 0 },
  annualTaxLiability: { type: Number, default: 0 },
}, { _id: false });

const exitRequestSchema = new mongoose.Schema({
  employee:        { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true, unique: true },

  // Exit details
  lastWorkingDay:  { type: Date, required: true },
  exitType:        { type: String, enum: ["Resignation", "Termination", "Retirement", "Other"], required: true },
  exitReason:      { type: String, required: true },
  noticePeriodDays:{ type: Number, required: true, default: 30 },

  // Single HR approval
  hrApproval: { type: approvalSchema, default: () => ({}) },

  // Overall status
  status: {
    type: String,
    enum: ["Pending_HR", "Approved", "Rejected", "Completed"],
    default: "Pending_HR",
  },

  // F&F — populated when Finance approves
  fnf:             { type: fnfSchema },
  fnfPayrollId:    { type: mongoose.Schema.Types.ObjectId, ref: "Payroll" },
  fnfCalculatedAt: { type: Date },
  completedAt:     { type: Date },

  initiatedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("ExitRequest", exitRequestSchema);
