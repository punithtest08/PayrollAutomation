const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  action:     { type: String, required: true },          // e.g. "PAYROLL_GENERATED", "EMPLOYEE_CREATED"
  entity:     { type: String, required: true },          // "Employee" | "Payroll" | "Leave" | "Attendance"
  entityId:   { type: mongoose.Schema.Types.ObjectId },
  performedBy:{ type: String, default: "system" },       // userId or "system" (cron)
  details:    { type: mongoose.Schema.Types.Mixed },     // any extra info
  ip:         { type: String },
}, { timestamps: true });

module.exports = mongoose.model("AuditLog", auditLogSchema);
