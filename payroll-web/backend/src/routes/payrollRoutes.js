const router = require("express").Router();
const c = require("../controllers/payrollController");
const { protect, hrOnly, managerScoped, employeeScoped } = require("../middleware/auth");

router.use(protect);
router.post("/generate",            hrOnly,         c.generate);
router.post("/run-month",           hrOnly,         c.runForMonth);
router.get("/",                     managerScoped,  c.getAll);
router.get("/slip/:id",             employeeScoped, c.getSlip);
router.get("/employee/:employeeId", employeeScoped, c.getByEmployee);
router.put("/:id/status",           hrOnly,         c.updateStatus);

module.exports = router;
