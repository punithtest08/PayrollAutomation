const jwt      = require("jsonwebtoken");
const crypto   = require("crypto");
const User     = require("../models/User");
const Employee = require("../models/Employee");
const { sendOtpEmail } = require("../services/emailService");

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRY });

const userPayload = (u) => ({
  id:             u._id,
  name:           u.name,
  email:          u.email,
  role:           u.role,
  department:     u.department ?? null,
  avatar:         u.avatar ?? null,
  linkedEmployee: u.linkedEmployee ?? null,
});

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "name, email and password are required" });
    if (role === "Employee")
      return res.status(400).json({ error: "Employee accounts are created by HR" });
    if (role === "Manager" && !department)
      return res.status(400).json({ error: "Department is required for Manager accounts" });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: "Email already registered" });

    const user  = await User.create({ name, email, password, role: role || "Manager", department: department || null });
    const token = signToken(user._id);
    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ error: "Invalid email or password" });

    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/send-otp
// Body: { email }
// Looks up employee by email → finds/creates linked User → sends OTP
exports.sendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });

    // Must be a registered employee email
    const emp = await Employee.findOne({ email: email.toLowerCase() });
    if (!emp) return res.status(404).json({ error: "No employee found with this email" });

    // Find or auto-create the linked User account
    let user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await User.create({
        name:           emp.name,
        email:          emp.email,
        role:           "Employee",
        linkedEmployee: emp._id,
      });
    }

    // Generate 6-digit OTP
    const otp       = crypto.randomInt(100000, 999999).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.otp       = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    await sendOtpEmail(emp.email, emp.name, otp);

    res.json({ message: `OTP sent to ${emp.email}`, maskedEmail: maskEmail(emp.email) });
  } catch (err) {
    console.error("sendOtp error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/verify-otp
// Body: { email, otp }
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: "Email and OTP are required" });

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!user.otp || !user.otpExpiry)
      return res.status(400).json({ error: "No OTP requested. Please request a new one." });

    if (new Date() > user.otpExpiry)
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });

    if (user.otp !== otp.trim())
      return res.status(400).json({ error: "Invalid OTP. Please try again." });

    // Clear OTP after successful verification
    user.otp       = null;
    user.otpExpiry = null;
    await user.save();

    const token = signToken(user._id);
    res.json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/me
exports.getMe = (req, res) => res.json(userPayload(req.user));

// GET /api/auth/managers
exports.getManagers = async (req, res) => {
  try {
    const managers = await User.find({ role: "Manager" }, "name email department");
    res.json(managers);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/auth/create-employee-account
exports.createEmployeeAccount = async (req, res) => {
  try {
    const { employeeId, password } = req.body;
    if (!employeeId || !password)
      return res.status(400).json({ error: "employeeId and password are required" });

    const emp = await Employee.findById(employeeId);
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    const exists = await User.findOne({ linkedEmployee: emp._id });
    if (exists) return res.status(400).json({ error: "Login account already exists for this employee" });

    const emailTaken = await User.findOne({ email: emp.email });
    if (emailTaken) return res.status(400).json({ error: "Email already registered as a user" });

    const user  = await User.create({ name: emp.name, email: emp.email, password, role: "Employee", linkedEmployee: emp._id });
    const token = signToken(user._id);
    res.status(201).json({ token, user: userPayload(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Helper — mask email for display: p*****@gmail.com
function maskEmail(email) {
  const [local, domain] = email.split("@");
  return local[0] + "*".repeat(Math.max(local.length - 1, 3)) + "@" + domain;
}
