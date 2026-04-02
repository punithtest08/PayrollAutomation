const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({
  employee:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date:      { type: String, required: true },   // "YYYY-MM-DD"
  status:    { type: String, enum: ["Present", "Absent", "Half Day", "Leave"], required: true },
  checkIn:   { type: String },
  checkOut:  { type: String },
}, { timestamps: true });

// One record per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

module.exports = mongoose.model("Attendance", attendanceSchema);
