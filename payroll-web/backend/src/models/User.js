const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true },
  email:    { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, default: null },
  googleId: { type: String, default: null },
  avatar:   { type: String, default: null },
  otp:         { type: String,  default: null },
  otpExpiry:   { type: Date,    default: null },
  role:            { type: String, enum: ["HR", "Manager", "Employee", "Recruiter"], default: "Manager" },
  department:      { type: String, default: null },
  linkedEmployee:  { type: mongoose.Schema.Types.ObjectId, ref: "Employee", default: null },
}, { timestamps: true });

// Hash password before save (skip if no password — Google OAuth users)
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.matchPassword = function (plain) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model("User", userSchema);
