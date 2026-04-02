const router = require("express").Router();
const c = require("../controllers/leaveController");
const { protect, hrOnly, managerScoped, employeeScoped } = require("../middleware/auth");

router.use(protect);
router.post("/",          employeeScoped, c.apply);    // Employee: apply for self; HR: for anyone
router.get("/",           employeeScoped, c.getAll);   // Employee: own; HR: all
router.put("/:id/review", hrOnly,         c.review);
router.delete("/:id",     hrOnly,         c.remove);

module.exports = router;
