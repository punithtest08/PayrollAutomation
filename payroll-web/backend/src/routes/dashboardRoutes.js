const router = require("express").Router();
const { getSummary, getAuditLogs } = require("../controllers/dashboardController");
const { protect } = require("../middleware/auth");

router.get("/",          protect, getSummary);
router.get("/audit",     protect, getAuditLogs);

module.exports = router;
