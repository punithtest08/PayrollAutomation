const mongoose = require("mongoose");

const interviewSchema = new mongoose.Schema({
  date:        { type: String },
  time:        { type: String },
  interviewer: { type: String },
  mode:        { type: String, enum: ["Video Call", "In-Person", "Phone"], default: "Video Call" },
  notes:       { type: String, default: "" },
  scheduledBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  scheduledAt: { type: Date, default: Date.now },
}, { _id: false });

const stageHistorySchema = new mongoose.Schema({
  stage:     { type: String },
  movedBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  movedAt:   { type: Date, default: Date.now },
  note:      { type: String, default: "" },
}, { _id: false });

const candidateSchema = new mongoose.Schema({
  name:       { type: String, required: true, trim: true },
  email:      { type: String, required: true, lowercase: true, trim: true },
  phone:      { type: String, default: "" },
  job:        { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
  skills:     [{ type: String }],
  resumeUrl:  { type: String, default: "", validate: { validator: (v) => v === "" || v.endsWith(".pdf"), message: "Resume must be a PDF file" } },
  score:      { type: Number, default: 0, min: 0, max: 100 },
  stage:      { type: String, enum: ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"], default: "Applied" },
  stageHistory: [stageHistorySchema],
  interview:  { type: interviewSchema, default: null },
  notes:      { type: String, default: "" },
  addedBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

module.exports = mongoose.model("Candidate", candidateSchema);
