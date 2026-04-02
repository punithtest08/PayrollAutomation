const jwt      = require("jsonwebtoken");
const User     = require("../models/User");

const protect = async (req, res, next) => {
  const header = req.headers.authorization;
  const token  = header?.startsWith("Bearer ") ? header.split(" ")[1] : req.query.token;
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user) return res.status(401).json({ error: "User not found" });
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
};

// HR only
const hrOnly = (req, res, next) => {
  if (req.user?.role !== "HR")
    return res.status(403).json({ error: "HR access required" });
  next();
};

// HR, Recruiter, or Manager — for recruitment routes
const recruiterOrHR = (req, res, next) => {
  if (["HR", "Recruiter", "Manager"].includes(req.user?.role)) return next();
  res.status(403).json({ error: "Recruiter, HR or Manager access required" });
};

// HR + Manager — Manager sees ONLY their department's employees
// Sets req.teamFilter spread into DB queries
const managerScoped = (req, res, next) => {
  if (req.user?.role === "HR") {
    req.teamFilter = {};           // HR sees everyone
    return next();
  }
  if (req.user?.role === "Manager") {
    if (!req.user.department)
      return res.status(403).json({ error: "Your account has no department assigned. Contact HR." });
    req.teamFilter = { department: req.user.department };  // scoped to own dept
    return next();
  }
  res.status(403).json({ error: "Access denied" });
};

// Employee sees only their own record
const employeeScoped = (req, res, next) => {
  if (req.user?.role === "HR") {
    req.selfEmployeeId = null;
    return next();
  }
  if (req.user?.role === "Employee") {
    if (!req.user.linkedEmployee)
      return res.status(403).json({ error: "No employee profile linked to your account" });
    req.selfEmployeeId = req.user.linkedEmployee.toString();
    return next();
  }
  res.status(403).json({ error: "Access denied" });
};

module.exports = { protect, hrOnly, recruiterOrHR, managerScoped, employeeScoped };
