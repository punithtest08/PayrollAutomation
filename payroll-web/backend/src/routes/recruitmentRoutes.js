const router = require("express").Router();
const c = require("../controllers/recruitmentController");
const { protect, recruiterOrHR } = require("../middleware/auth");

router.use(protect, recruiterOrHR);

router.get("/stats",                                          c.getStats);

router.post("/parse-resume",  c.upload.single("resume"),      c.parseResume);
router.post("/generate-jd",                                   c.generateJD);

router.get("/jobs",                                           c.getJobs);
router.post("/jobs",                                          c.createJob);
router.put("/jobs/:id",                                       c.updateJob);
router.delete("/jobs/:id",                                    c.deleteJob);

router.get("/candidates",                                     c.getCandidates);
router.post("/candidates",    c.upload.single("resume"),      c.addCandidate);
router.put("/candidates/:id/stage",                           c.updateStage);
router.put("/candidates/:id/interview",                       c.scheduleInterview);
router.post("/candidates/:id/resume", c.upload.single("resume"), c.uploadResume);
router.post("/candidates/:id/draft-email",                    c.draftEmail);
router.post("/candidates/:id/send-email",                     c.sendEmail);
router.delete("/candidates/:id",                              c.deleteCandidate);

module.exports = router;
