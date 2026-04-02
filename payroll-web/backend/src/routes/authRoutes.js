const router = require("express").Router();
const c = require("../controllers/authController");
const { protect, hrOnly } = require("../middleware/auth");

router.post("/signup",                   c.signup);
router.post("/login",                    c.login);
router.post("/send-otp",                 c.sendOtp);
router.post("/verify-otp",               c.verifyOtp);
router.get("/me",                        protect, c.getMe);
router.get("/managers",                  protect, hrOnly, c.getManagers);
router.post("/create-employee-account",  protect, hrOnly, c.createEmployeeAccount);

module.exports = router;
