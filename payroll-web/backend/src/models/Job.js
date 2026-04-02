const mongoose = require("mongoose");

const jobSchema = new mongoose.Schema({
  title:       { type: String, required: true, trim: true },
  department:  { type: String, required: true, trim: true },
  location:    { type: String, default: "Remote" },
  type:        { type: String, enum: ["Full-time", "Part-time", "Contract", "Internship"], default: "Full-time" },
  openings:    { type: Number, default: 1 },
  status:      { type: String, enum: ["Active", "Paused", "Closed"], default: "Active" },
  description: { type: String, default: "" },
  skills:      [{ type: String }],
  createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Job", jobSchema);
