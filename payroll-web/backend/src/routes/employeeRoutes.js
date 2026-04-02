const router = require("express").Router();
const c = require("../controllers/employeeController");
const { protect, hrOnly, managerScoped } = require("../middleware/auth");

// PUBLIC
router.get("/confirm", c.confirmOffer);

router.use(protect);
router.get("/departments",              managerScoped, c.getDepartments);
router.get("/me",                       protect,       c.getSelf);          // Employee: own profile
router.get("/",                         managerScoped, c.getAll);
router.get("/:id/full-profile",         managerScoped, c.getFullProfile);
router.get("/:id",                      managerScoped, c.getOne);
router.post("/",                        hrOnly,        c.create);
router.put("/:id",                      hrOnly,        c.update);
router.delete("/:id",                   hrOnly,        c.remove);
router.post("/resend-confirmation/:id", hrOnly,        c.resendConfirmation);

module.exports = router;
