const router = require("express").Router();
const c = require("../controllers/exitController");
const { protect, hrOnly } = require("../middleware/auth");

// All exit routes require authentication
router.use(protect);

router.get("/",                    hrOnly, c.getAll);          // HR/Finance: list all exits
router.post("/:id/initiate",       hrOnly, c.initiate);        // HR initiates exit
router.post("/:id/approve",                c.approve);         // Manager/HR/Finance approves
router.get("/:id/details",                 c.getDetails);      // Anyone: view exit details
router.post("/:id/calculate-fnf",  hrOnly, c.calculateFNF);    // HR/Finance: compute F&F
router.post("/:id/complete",       hrOnly, c.complete);        // HR: complete exit

module.exports = router;
