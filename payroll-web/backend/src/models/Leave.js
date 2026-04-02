const mongoose = require("mongoose");

const leaveSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  type:      { type: String, enum: ["Sick", "Casual", "Earned", "Unpaid"], required: true },
  from:      { type: String, required: true },   // "YYYY-MM-DD"
  to:        { type: String, required: true },
  days:      { type: Number, required: true },
  reason:    { type: String, required: true },
  status:    { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending" },
  reviewedBy:{ type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Leave", leaveSchema);
