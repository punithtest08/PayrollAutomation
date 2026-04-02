const mongoose = require("mongoose");

// CTC breakdown sub-schema — stored permanently in DB
const ctcSchema = new mongoose.Schema({
  ctc:              { type: Number, required: true },   // Annual CTC
  basic:            { type: Number, required: true },   // 50% of CTC
  hra:              { type: Number, required: true },   // 40% of Basic
  pf:               { type: Number, required: true },   // 12% of Basic (capped ₹15k)
  gratuity:         { type: Number, required: true },   // 4.81% of Basic
  specialAllowance: { type: Number, required: true },   // CTC - Basic - HRA - PF - Gratuity
  monthlyGross:     { type: Number, required: true },   // CTC / 12
  monthlyBasic:     { type: Number, required: true },   // Basic / 12
  monthlyHRA:       { type: Number, required: true },
  monthlyPF:        { type: Number, required: true },
  monthlyGratuity:  { type: Number, required: true },
  monthlySpecial:   { type: Number, required: true },
}, { _id: false });

const employeeSchema = new mongoose.Schema({
  empId:         { type: String, required: true, unique: true, trim: true },
  name:          { type: String, required: true, trim: true },
  email:         { type: String, required: true, unique: true, lowercase: true, trim: true },
  department:    { type: String, required: true, trim: true },
  position:      { type: String, required: true, trim: true },
  phone:         { type: String, trim: true },
  doj:           { type: Date, required: true },
  offerLetter:   { type: String, trim: true },
  status:        { type: String, enum: ["Active", "Inactive", "Exit_Initiated", "Exited"], default: "Active" },

  // CTC stored in DB — computed on create/update
  ctcBreakdown:  { type: ctcSchema, required: true },

  // Legacy field kept for backward compat (= annual CTC)
  salary:        { type: Number, required: true },

  // Offer confirmation
  confirmToken:  { type: String },
  confirmStatus: { type: String, enum: ["Pending", "Confirmed", "Disputed"], default: "Pending" },
  confirmedAt:   { type: Date },
  disputeNote:   { type: String },

  // Exit fields
  lastWorkingDay:  { type: Date },
  exitType:        { type: String, enum: ["Resignation", "Termination", "Retirement", "Other"] },
  exitReason:      { type: String },
  // Manager assignment
  manager: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
}, { timestamps: true });

module.exports = mongoose.model("Employee", employeeSchema);
