require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const path     = require("path");
const mongoose = require("mongoose");
const { startCronJobs } = require("./services/cronService");

const app = express();
app.use(cors());
app.use(express.json());

// Serve uploaded resumes as static files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth",        require("./routes/authRoutes"));
app.use("/api/employees",   require("./routes/employeeRoutes"));
app.use("/api/attendance",  require("./routes/attendanceRoutes"));
app.use("/api/leaves",      require("./routes/leaveRoutes"));
app.use("/api/payroll",     require("./routes/payrollRoutes"));
app.use("/api/dashboard",   require("./routes/dashboardRoutes"));
app.use("/api/exit",        require("./routes/exitRoutes"));
app.use("/api/recruitment", require("./routes/recruitmentRoutes"));

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    startCronJobs();
    app.listen(PORT, () => console.log(`🚀 HRMS API → http://localhost:${PORT}`));
  })
  .catch((err) => { console.error("MongoDB failed:", err.message); process.exit(1); });
