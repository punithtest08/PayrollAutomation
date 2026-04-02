const path      = require("path");
const fs        = require("fs");
const multer    = require("multer");
const pdfParse  = require("pdf-parse");
const Job       = require("../models/Job");
const Candidate = require("../models/Candidate");
const { sendRecruitmentEmail }  = require("../services/emailService");
const { generateEmailDraft, generateJD } = require("../services/aiEmailService");

function getOpenAI() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "your_groq_api_key_here") return null;
  const Groq = require("groq-sdk");
  return new Groq({ apiKey: key });
}

/* ── Multer config ── */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(__dirname, "../../uploads/resumes");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const base = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/\.pdf$/i, "");
    cb(null, `${Date.now()}_${base}.pdf`);
  },
});

const fileFilter = (_req, file, cb) => {
  file.mimetype === "application/pdf"
    ? cb(null, true)
    : cb(new Error("Only PDF files are allowed"));
};

exports.upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

/* ════════ GENERATE JD ════════ */

// POST /api/recruitment/generate-jd
exports.generateJD = async (req, res) => {
  try {
    const { title, department, location, type, openings } = req.body;
    if (!title || !department) return res.status(400).json({ error: "title and department are required" });
    const result = await generateJD({ title, department, location, type, openings });
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ════════ RESUME PARSE ════════ */

// POST /api/recruitment/parse-resume
exports.parseResume = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });

  const filePath = req.file.path;

  try {
    const buffer = fs.readFileSync(filePath);
    fs.unlink(filePath, () => {});

    // Extract text — try pdf-parse, fall back to raw stream extraction
    let text = "";
    try {
      const result = await pdfParse(buffer);
      text = result.text || "";
    } catch {
      // Fallback: extract raw readable strings from PDF binary
      text = extractRawText(buffer);
    }

    let parsed = extractFallback(text);

    // Try AI enrichment if Groq is configured
    const client = getOpenAI();
    if (client && text.trim().length > 20) {
      try {
        const completion = await client.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          max_tokens: 400,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: "Extract candidate details from the resume text and return ONLY a valid JSON object with keys: name (string), email (string), phone (string), skills (array of strings), score (number 0-100 based on overall profile strength). No markdown, no explanation.",
            },
            { role: "user", content: text.slice(0, 4000) },
          ],
        });
        let raw = completion.choices[0].message.content.trim();
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
        const result = JSON.parse(raw);
        parsed = typeof result === "string" ? JSON.parse(result) : result;
      } catch {
        // keep regex fallback
      }
    }

    res.json(parsed);
  } catch (err) {
    fs.unlink(filePath, () => {});
    res.status(500).json({ error: err.message });
  }
};

function extractRawText(buffer) {
  const str = buffer.toString("latin1");
  const chunks = [];

  // Extract parenthesis-encoded strings (uncompressed PDFs)
  for (const m of str.matchAll(/\(([^\\()\n]{3,120})\)/g)) {
    const t = m[1].trim();
    if (t && /[a-zA-Z]{2,}/.test(t)) chunks.push(t);
  }

  // Extract hex-encoded strings e.g. <526168756c...> (pdfkit, Word exports)
  for (const m of str.matchAll(/<([0-9a-fA-F]{4,})>/g)) {
    try {
      const hex = m[1];
      let decoded = "";
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.slice(i, i + 2), 16);
        if (code > 31 && code < 127) decoded += String.fromCharCode(code);
      }
      if (decoded.trim().length > 2 && /[a-zA-Z]{2,}/.test(decoded)) chunks.push(decoded.trim());
    } catch {}
  }

  return chunks.join(" ");
}

function extractFallback(text) {
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const phoneMatch = text.match(/(\+?\d[\d\s\-().]{7,}\d)/);
  const lines      = text.split("\n").map((l) => l.trim()).filter(Boolean);
  return {
    name:   lines[0] || "",
    email:  emailMatch?.[0] || "",
    phone:  phoneMatch?.[0]?.trim() || "",
    skills: [],
    score:  0,
  };
}

/* ════════ RESUME UPLOAD ════════ */

// POST /api/recruitment/candidates/:id/resume
exports.uploadResume = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    if (req.file.mimetype !== "application/pdf") {
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: "Only PDF files are allowed" });
    }
    const resumeUrl = `/uploads/resumes/${req.file.filename}`;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { resumeUrl },
      { new: true }
    ).populate("job", "title department");
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });
    res.json({ resumeUrl, candidate });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ════════ JOBS ════════ */

exports.getJobs = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status)     filter.status     = req.query.status;
    if (req.query.department) filter.department = req.query.department;
    const jobs = await Job.find(filter).populate("createdBy", "name").sort({ createdAt: -1 });
    const counts = await Candidate.aggregate([{ $group: { _id: "$job", total: { $sum: 1 } } }]);
    const countMap = Object.fromEntries(counts.map((c) => [c._id.toString(), c.total]));
    res.json(jobs.map((j) => ({ ...j.toObject(), applicants: countMap[j._id.toString()] || 0 })));
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.createJob = async (req, res) => {
  try {
    const job = await Job.create({ ...req.body, createdBy: req.user._id });
    res.status(201).json({ ...job.toObject(), applicants: 0 });
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.deleteJob = async (req, res) => {
  try {
    await Job.findByIdAndDelete(req.params.id);
    await Candidate.deleteMany({ job: req.params.id });
    res.json({ message: "Job deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ════════ CANDIDATES ════════ */

exports.getCandidates = async (req, res) => {
  try {
    const filter = {};
    if (req.query.job)    filter.job   = req.query.job;
    if (req.query.stage)  filter.stage = req.query.stage;
    if (req.query.search) {
      filter.$or = [
        { name:  { $regex: req.query.search, $options: "i" } },
        { email: { $regex: req.query.search, $options: "i" } },
      ];
    }
    const candidates = await Candidate.find(filter)
      .populate("job", "title department")
      .populate("addedBy", "name")
      .sort({ createdAt: -1 });
    res.json(candidates);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.addCandidate = async (req, res) => {
  try {
    // skills may come as comma-separated string from FormData
    let skills = req.body.skills || [];
    if (typeof skills === "string") skills = skills.split(",").map((s) => s.trim()).filter(Boolean);

    let resumeUrl = "";
    if (req.file) {
      if (req.file.mimetype !== "application/pdf") {
        fs.unlink(req.file.path, () => {});
        return res.status(400).json({ error: "Only PDF files are allowed" });
      }
      resumeUrl = `/uploads/resumes/${req.file.filename}`;
    }

    const candidate = await Candidate.create({
      ...req.body,
      skills,
      resumeUrl,
      addedBy: req.user._id,
      stageHistory: [{ stage: "Applied", movedBy: req.user._id }],
    });
    await candidate.populate("job", "title department");
    res.status(201).json(candidate);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.updateStage = async (req, res) => {
  try {
    const { stage, note, sendEmail = true } = req.body;
    const valid = ["Applied", "Shortlisted", "Interview", "Selected", "Rejected"];
    if (!valid.includes(stage)) return res.status(400).json({ error: "Invalid stage" });

    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      { stage, $push: { stageHistory: { stage, movedBy: req.user._id, note: note || "" } } },
      { new: true }
    ).populate("job", "title department");
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Auto-send email for key stages
    if (sendEmail && ["Shortlisted", "Selected", "Rejected"].includes(stage)) {
      try {
        const { subject, body } = await generateEmailDraft(stage, candidate, candidate.job);
        await sendRecruitmentEmail(candidate.email, subject, body);
      } catch (e) { console.error("Stage email failed:", e.message); }
    }

    res.json(candidate);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

exports.scheduleInterview = async (req, res) => {
  try {
    const { date, time, interviewer, mode, notes, sendEmail = true } = req.body;
    const candidate = await Candidate.findByIdAndUpdate(
      req.params.id,
      {
        interview: { date, time, interviewer, mode, notes, scheduledBy: req.user._id },
        stage: "Interview",
        $push: { stageHistory: { stage: "Interview", movedBy: req.user._id, note: `Scheduled with ${interviewer}` } },
      },
      { new: true }
    ).populate("job", "title department");
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    // Auto-send interview invitation email
    if (sendEmail) {
      try {
        const { subject, body } = await generateEmailDraft("Interview", candidate, candidate.job, { date, time, interviewer, mode, notes });
        await sendRecruitmentEmail(candidate.email, subject, body);
      } catch (e) { console.error("Interview email failed:", e.message); }
    }

    res.json(candidate);
  } catch (err) { res.status(400).json({ error: err.message }); }
};

/* ════════ AI DRAFT + MANUAL SEND ════════ */

// POST /api/recruitment/candidates/:id/draft-email
// Body: { stage } — returns AI-generated subject + body for preview/edit
exports.draftEmail = async (req, res) => {
  try {
    const { stage } = req.body;
    const candidate = await Candidate.findById(req.params.id).populate("job", "title department");
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    const draft = await generateEmailDraft(stage || candidate.stage, candidate, candidate.job, candidate.interview);
    res.json(draft);
  } catch (err) { res.status(500).json({ error: err.message }); }
};

// POST /api/recruitment/candidates/:id/send-email
// Body: { subject, body } — sends the (possibly edited) email
exports.sendEmail = async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject || !body) return res.status(400).json({ error: "subject and body are required" });

    const candidate = await Candidate.findById(req.params.id).populate("job", "title department");
    if (!candidate) return res.status(404).json({ error: "Candidate not found" });

    await sendRecruitmentEmail(candidate.email, subject, body);
    res.json({ message: `Email sent to ${candidate.email}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const c = await Candidate.findByIdAndDelete(req.params.id);
    // Delete resume file if exists
    if (c?.resumeUrl) {
      const filePath = path.join(__dirname, "../../", c.resumeUrl);
      fs.unlink(filePath, () => {});
    }
    res.json({ message: "Candidate deleted" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

/* ════════ STATS ════════ */

exports.getStats = async (req, res) => {
  try {
    const [jobStats, stageStats, openPositions] = await Promise.all([
      Job.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Candidate.aggregate([{ $group: { _id: "$stage", count: { $sum: 1 } } }]),
      Job.aggregate([{ $match: { status: "Active" } }, { $group: { _id: null, total: { $sum: "$openings" } } }]),
    ]);
    res.json({
      jobs:          Object.fromEntries(jobStats.map((s) => [s._id, s.count])),
      stages:        Object.fromEntries(stageStats.map((s) => [s._id, s.count])),
      openPositions: openPositions[0]?.total || 0,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
