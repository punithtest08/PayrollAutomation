import { useState, useEffect, useCallback, useRef } from "react";
import {
  Briefcase, Users, ChevronRight, Calendar, X,
  CheckCircle, XCircle, Clock, Search, Plus, FileText, Loader2, UserPlus, Upload, Sparkles, Bell,
} from "lucide-react";
import { recruitAPI } from "../api/client";
import toast from "react-hot-toast";

const STAGES = ["Applied", "Shortlisted", "Interview", "Selected"];

const STAGE_STYLE = {
  Applied:     { badge: "badge badge-gray",   dot: "bg-gray-400" },
  Shortlisted: { badge: "badge badge-blue",   dot: "bg-blue-500" },
  Interview:   { badge: "badge badge-yellow", dot: "bg-amber-400" },
  Selected:    { badge: "badge badge-green",  dot: "bg-emerald-500" },
  Rejected:    { badge: "badge badge-red",    dot: "bg-red-500" },
};

const JOB_STATUS_STYLE = {
  Active: "badge badge-green",
  Paused: "badge badge-yellow",
  Closed: "badge badge-gray",
};

function Avatar({ name }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600", "from-rose-400 to-rose-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

/* ── Add Candidate Modal ── */
function AddCandidateModal({ jobs, onClose, onAdded }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", job: "", skills: "", score: 0, notes: "" });
  const [resumeFile, setResumeFile]   = useState(null);
  const [parsing, setParsing]         = useState(false);
  const [saving, setSaving]           = useState(false);
  const fileRef                       = useRef();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleResume = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== "application/pdf") { toast.error("Only PDF files are allowed"); return; }
    setResumeFile(file);
    setParsing(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      const data = await recruitAPI.parseResume(fd);
      setForm((f) => ({
        ...f,
        name:   data.name  || f.name,
        email:  data.email || f.email,
        phone:  data.phone || f.phone,
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : (data.skills || f.skills),
        score:  data.score || f.score,
      }));
      toast.success("Resume parsed — fields auto-filled!");
    } catch {
      toast.error("Could not parse resume, fill manually");
    } finally {
      setParsing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.job) { toast.error("Please select a job position"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (resumeFile) fd.append("resume", resumeFile);
      const candidate = await recruitAPI.addCandidate(fd);
      toast.success("Candidate added!");
      onAdded(candidate);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to add candidate");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center">
              <UserPlus size={17} className="text-purple-600" />
            </div>
            <p className="font-bold text-gray-900">Add Candidate</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Resume Upload — triggers auto-fill */}
          <div
            className="border-2 border-dashed border-blue-200 rounded-xl p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition"
            onClick={() => fileRef.current.click()}
          >
            <input ref={fileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleResume} />
            {parsing ? (
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm font-medium">Parsing resume…</span>
              </div>
            ) : resumeFile ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600">
                <FileText size={16} />
                <span className="text-sm font-medium">{resumeFile.name}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <Upload size={16} />
                <span className="text-sm">Upload PDF resume to auto-fill fields</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Position Applied For</label>
              <select className="input" value={form.job} onChange={set("job")} required>
                <option value="">Select a job…</option>
                {jobs.filter((j) => j.status === "Active").map((j) => (
                  <option key={j._id} value={j._id}>{j.title} — {j.department}</option>
                ))}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Full Name</label>
              <input className="input" placeholder="Candidate name" value={form.name} onChange={set("name")} required />
            </div>
            <div>
              <label className="label">Email</label>
              <input type="email" className="input" placeholder="email@example.com" value={form.email} onChange={set("email")} required />
            </div>
            <div>
              <label className="label">Phone</label>
              <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={set("phone")} />
            </div>
            <div className="col-span-2">
              <label className="label">Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              <input className="input" placeholder="React, Node.js, AWS" value={form.skills} onChange={set("skills")} />
            </div>
            <div>
              <label className="label">Score <span className="text-gray-400 font-normal">(0–100)</span></label>
              <input type="number" min={0} max={100} className="input" value={form.score} onChange={set("score")} />
            </div>
            <div>
              <label className="label">Notes</label>
              <input className="input" placeholder="Optional notes" value={form.notes} onChange={set("notes")} />
            </div>
          </div>

          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving || parsing} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Add Candidate
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Post Job Modal ── */
function PostJobModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    title: "", department: "", location: "Remote",
    type: "Full-time", openings: 1, description: "", skills: "",
  });
  const [saving, setSaving]       = useState(false);
  const [genJD, setGenJD]         = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleGenerateJD = async () => {
    if (!form.title || !form.department) {
      toast.error("Enter Job Title and Department first");
      return;
    }
    setGenJD(true);
    try {
      const { description, skills } = await recruitAPI.generateJD({
        title: form.title, department: form.department,
        location: form.location, type: form.type, openings: form.openings,
      });
      setForm((f) => ({
        ...f,
        description,
        skills: Array.isArray(skills) ? skills.join(", ") : skills,
      }));
      toast.success("JD generated!");
    } catch {
      toast.error("Failed to generate JD — check your OpenAI API key in backend .env");
    } finally {
      setGenJD(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        openings: Number(form.openings),
        skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const job = await recruitAPI.createJob(payload);
      toast.success("Job posted successfully!");
      onCreated(job);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to post job");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-lg">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Briefcase size={17} className="text-blue-600" />
            </div>
            <p className="font-bold text-gray-900">Post New Job</p>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="label">Job Title</label>
              <input className="input" placeholder="e.g. Senior Software Engineer" value={form.title} onChange={set("title")} required />
            </div>
            <div>
              <label className="label">Department</label>
              <input className="input" placeholder="e.g. Engineering" value={form.department} onChange={set("department")} required />
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" placeholder="e.g. Remote" value={form.location} onChange={set("location")} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={set("type")}>
                {["Full-time", "Part-time", "Contract", "Internship"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Openings</label>
              <input type="number" min={1} className="input" value={form.openings} onChange={set("openings")} required />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Required Skills <span className="text-gray-400 font-normal">(comma-separated)</span></label>
              </div>
              <input className="input" placeholder="e.g. React, Node.js, AWS" value={form.skills} onChange={set("skills")} />
            </div>
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-1">
                <label className="label mb-0">Description</label>
                <button
                  type="button"
                  onClick={handleGenerateJD}
                  disabled={genJD}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-60"
                >
                  {genJD ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  {genJD ? "Generating…" : "Generate with AI"}
                </button>
              </div>
              <textarea
                className="input resize-none"
                rows={4}
                placeholder="Click 'Generate with AI' or write your own description..."
                value={form.description}
                onChange={set("description")}
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button type="submit" disabled={saving || genJD} className="btn-primary flex-1 justify-center">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              Post Job
            </button>
            <button type="button" onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Interview Scheduler Modal ── */
function InterviewModal({ candidate, onClose, onSchedule }) {
  const [form, setForm] = useState({ date: "", time: "", interviewer: "", mode: "Video Call", notes: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box max-w-md">
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
              <Calendar size={17} className="text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Schedule Interview</p>
              <p className="text-xs text-gray-400">{candidate.name} · {candidate.job?.title || candidate.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={set("date")} required />
            </div>
            <div>
              <label className="label">Time</label>
              <input type="time" className="input" value={form.time} onChange={set("time")} required />
            </div>
            <div>
              <label className="label">Interviewer</label>
              <input className="input" placeholder="e.g. Ravi Kumar" value={form.interviewer} onChange={set("interviewer")} />
            </div>
            <div>
              <label className="label">Mode</label>
              <select className="input" value={form.mode} onChange={set("mode")}>
                {["Video Call", "In-Person", "Phone"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} placeholder="Interview focus areas…"
              value={form.notes} onChange={set("notes")} />
          </div>
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button onClick={() => { onSchedule(candidate._id || candidate.id, form); onClose(); }}
              className="btn-primary flex-1 justify-center">
              <Calendar size={15} /> Schedule
            </button>
            <button onClick={onClose} className="btn-secondary flex-1 justify-center">Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Pipeline Column ── */
function PipelineColumn({ stage, candidates }) {
  const style = STAGE_STYLE[stage];
  return (
    <div className="flex-1 min-w-[180px]">
      <div className="flex items-center gap-2 mb-3">
        <span className={`${style.badge} text-xs`}>{stage}</span>
        <span className="text-xs text-gray-400 font-semibold">{candidates.length}</span>
      </div>
      <div className="space-y-2">
        {candidates.length === 0 ? (
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400">No candidates</p>
          </div>
        ) : candidates.map((c) => (
          <div key={c._id || c.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <Avatar name={c.name} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
                <p className="text-xs text-gray-400 truncate">{c.job?.title || c.role}</p>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex gap-1 flex-wrap">
                {(c.skills || []).slice(0, 2).map((s) => (
                  <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-md font-medium">{s}</span>
                ))}
              </div>
              <span className="text-xs font-bold text-gray-600">{c.score}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Recruitment({ isHR }) {
  const [jobs, setJobs]             = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState("");
  const [activeTab, setActiveTab]   = useState("candidates");
  const [scheduling, setScheduling] = useState(null);
  const [postingJob, setPostingJob] = useState(false);
  const [addingCandidate, setAddingCandidate] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [j, c, s] = await Promise.all([
        recruitAPI.getJobs(),
        recruitAPI.getCandidates(),
        recruitAPI.getStats(),
      ]);
      setJobs(j);
      setCandidates(c);
      setStats(s);
    } catch (err) {
      const msg = err.response?.data?.error || err.message || "";
      // If it's an auth/network error show toast, otherwise silently use empty state
      if (err.response?.status === 401) {
        toast.error("Session expired. Please log in again.");
      } else if (err.response?.status === 403) {
        toast.error("Access denied. Recruitment is available to HR, Recruiters, and Managers only.");
      } else if (!err.response) {
        toast.error("Cannot reach server. Make sure the backend is running.");
      }
      setJobs([]);
      setCandidates([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const filtered = candidates.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.job?.title || "").toLowerCase().includes(q);
  });

  const handleAction = async (id, action) => {
    const stage = action === "shortlist" ? "Shortlisted" : "Rejected";
    try {
      const updated = await recruitAPI.updateStage(id, { stage });
      setCandidates((prev) => prev.map((c) => (c._id === id ? updated : c)));
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to update stage");
    }
  };

  const handleSchedule = async (id, form) => {
    try {
      const updated = await recruitAPI.scheduleInterview(id, form);
      setCandidates((prev) => prev.map((c) => (c._id === id ? updated : c)));
      toast.success("Interview scheduled!");
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to schedule interview");
    }
  };

  const pipelineCandidates = STAGES.reduce((acc, stage) => {
    acc[stage] = candidates.filter((c) => c.stage === stage);
    return acc;
  }, {});

  const totalOpen = stats.openPositions || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Recruitment</h1>
          <p className="page-subtitle">Applicant Tracking System</p>
        </div>
        {isHR && (
          <div className="flex gap-2">
            <button className="btn-secondary" onClick={() => setAddingCandidate(true)}>
              <UserPlus size={15} /> Add Candidate
            </button>
            <button className="btn-primary" onClick={() => setPostingJob(true)}>
              <Plus size={15} /> Post Job
            </button>
          </div>
        )}
      </div>

      {/* Welcome banner — shown only when everything is empty */}
      {jobs.length === 0 && candidates.length === 0 && (
        <div className="card border border-blue-100 bg-gradient-to-r from-blue-50 to-violet-50">
          <div className="flex flex-col sm:flex-row items-center gap-5 py-2">
            <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center shrink-0 relative">
              <Briefcase size={26} className="text-blue-600" />
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                <Bell size={11} className="text-white" />
              </span>
            </div>
            <div className="flex-1 text-center sm:text-left">
              <p className="font-bold text-gray-900 text-lg">Welcome to Recruitment!</p>
              <p className="text-sm text-gray-500 mt-0.5">
                {isHR
                  ? "No jobs or candidates yet. Post a job opening or add a candidate to get started."
                  : "No recruitment activity yet. Contact your HR team to post jobs or add candidates."}
              </p>
            </div>
            {isHR && (
              <div className="flex gap-2 shrink-0">
                <button className="btn-secondary" onClick={() => setAddingCandidate(true)}>
                  <UserPlus size={15} /> Add Candidate
                </button>
                <button className="btn-primary" onClick={() => setPostingJob(true)}>
                  <Plus size={15} /> Post a Job
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Open Positions",  value: totalOpen,                                                   icon: Briefcase,   color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Total Applicants",value: candidates.filter((c) => c.stage !== "Rejected").length,     icon: Users,       color: "text-purple-600",  bg: "bg-purple-50" },
          { label: "In Interview",    value: candidates.filter((c) => c.stage === "Interview").length,    icon: Clock,       color: "text-amber-600",   bg: "bg-amber-50" },
          { label: "Selected",        value: candidates.filter((c) => c.stage === "Selected").length,     icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
        {[
          { key: "candidates", label: "Candidates" },
          { key: "jobs",       label: "Job Openings" },
          { key: "pipeline",   label: "Pipeline" },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-150
              ${activeTab === key ? "bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Candidates Tab ── */}
      {activeTab === "candidates" && (
        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input input-icon" placeholder="Search candidates…"
              value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <div className="table-wrap">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
                <tr>
                  {["Candidate", "Applied For", "Skills", "Resume", "Score", "Stage", "Actions"].map((h) => (
                    <th key={h} className="th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7}>
                      <div className="flex flex-col items-center justify-center py-16 gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center">
                          <Users size={28} className="text-purple-400" />
                        </div>
                        <div className="text-center">
                          <p className="font-bold text-gray-700 text-base">No candidates yet</p>
                          <p className="text-sm text-gray-400 mt-1">Add your first candidate to start tracking applicants</p>
                        </div>
                        {isHR && (
                          <button className="btn-primary" onClick={() => setAddingCandidate(true)}>
                            <UserPlus size={15} /> Add First Candidate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((c) => {
                  const style = STAGE_STYLE[c.stage];
                  return (
                    <tr key={c._id} className="tr">
                      <td className="td">
                        <div className="flex items-center gap-3">
                          <Avatar name={c.name} />
                          <div>
                            <p className="font-semibold text-gray-900">{c.name}</p>
                            <p className="text-xs text-gray-400">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="td text-gray-600 text-sm">{c.job?.title || "—"}</td>
                      <td className="td">
                        <div className="flex gap-1 flex-wrap">
                          {(c.skills || []).map((s) => (
                            <span key={s} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-lg font-medium">{s}</span>
                          ))}
                        </div>
                      </td>
                      <td className="td">
                        {c.resumeUrl ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL}${c.resumeUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                          >
                            <FileText size={13} /> View Resume
                          </a>
                        ) : (
                          <span className="text-xs text-gray-400">No resume</span>
                        )}
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div className="h-full rounded-full bg-blue-500" style={{ width: `${c.score}%` }} />
                          </div>
                          <span className="text-sm font-bold text-gray-700">{c.score}%</span>
                        </div>
                      </td>
                      <td className="td">
                        <span className={style.badge}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {c.stage}
                        </span>
                      </td>
                      <td className="td">
                        <div className="flex items-center gap-1.5">
                          {c.stage === "Applied" && isHR && (
                            <button onClick={() => handleAction(c._id, "shortlist")}
                              className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition flex items-center gap-1">
                              <CheckCircle size={12} /> Shortlist
                            </button>
                          )}
                          {(c.stage === "Shortlisted" || c.stage === "Interview") && isHR && (
                            <button onClick={() => setScheduling(c)}
                              className="text-xs px-2.5 py-1.5 bg-amber-50 text-amber-700 rounded-lg font-semibold hover:bg-amber-100 transition flex items-center gap-1">
                              <Calendar size={12} /> Schedule
                            </button>
                          )}
                          {c.stage !== "Rejected" && c.stage !== "Selected" && isHR && (
                            <button onClick={() => handleAction(c._id, "reject")}
                              className="text-xs px-2.5 py-1.5 bg-red-50 text-red-600 rounded-lg font-semibold hover:bg-red-100 transition flex items-center gap-1">
                              <XCircle size={12} /> Reject
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Jobs Tab ── */}
      {activeTab === "jobs" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {jobs.length === 0 ? (
            <div className="col-span-3">
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Briefcase size={28} className="text-blue-400" />
                </div>
                <div className="text-center">
                  <p className="font-bold text-gray-700 text-base">No job openings yet</p>
                  <p className="text-sm text-gray-400 mt-1">Post your first job to start receiving applications</p>
                </div>
                {isHR && (
                  <button className="btn-primary" onClick={() => setPostingJob(true)}>
                    <Plus size={15} /> Post First Job
                  </button>
                )}
              </div>
            </div>
          ) : jobs.map((job) => (
            <div key={job._id} className="card hover:shadow-md transition-all duration-200 cursor-pointer group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Briefcase size={18} className="text-blue-600" />
                </div>
                <span className={JOB_STATUS_STYLE[job.status]}>{job.status}</span>
              </div>
              <h3 className="font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition">{job.title}</h3>
              <p className="text-sm text-gray-500 mb-3">{job.department}</p>
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Users size={14} className="text-gray-400" />
                  <span>{job.applicants || 0} applicants</span>
                </div>
                <div className="flex items-center gap-1.5 text-sm font-semibold text-blue-600">
                  <span>{job.openings} open</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pipeline Tab ── */}
      {activeTab === "pipeline" && (
        <div className="card overflow-x-auto">
          <div className="mb-4">
            <h3 className="font-bold text-gray-800">Hiring Pipeline</h3>
            <p className="text-xs text-gray-400 mt-0.5">Candidate progression across stages</p>
          </div>
          <div className="flex gap-4 min-w-max pb-2">
            {STAGES.map((stage) => (
              <PipelineColumn key={stage} stage={stage} candidates={pipelineCandidates[stage]} />
            ))}
          </div>
        </div>
      )}

      {/* Add Candidate Modal */}
      {addingCandidate && (
        <AddCandidateModal
          jobs={jobs}
          onClose={() => setAddingCandidate(false)}
          onAdded={(candidate) => setCandidates((prev) => [candidate, ...prev])}
        />
      )}

      {/* Post Job Modal */}
      {postingJob && (
        <PostJobModal
          onClose={() => setPostingJob(false)}
          onCreated={(job) => setJobs((prev) => [job, ...prev])}
        />
      )}

      {/* Interview Modal */}
      {scheduling && (
        <InterviewModal
          candidate={scheduling}
          onClose={() => setScheduling(null)}
          onSchedule={handleSchedule}
        />
      )}
    </div>
  );
}
