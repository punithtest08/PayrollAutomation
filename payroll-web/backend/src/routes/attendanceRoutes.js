const router = require("express").Router();
const c = require("../controllers/attendanceController");
const { protect, hrOnly, managerScoped, employeeScoped } = require("../middleware/auth");

router.use(protect);
router.post("/",                   hrOnly,         c.mark);
router.get("/",                    managerScoped,  c.getByDate);
router.get("/summary/:employeeId", employeeScoped, c.getMonthlySummary);
router.get("/:employeeId",         employeeScoped, c.getByEmployee);

module.exports = router;
