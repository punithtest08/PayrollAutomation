import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { leaveAPI, empAPI } from "../api/client";

const STATUS_STYLE = {
  Pending:  { badge: "badge badge-yellow", bar: "bg-amber-400",   dot: "bg-amber-400" },
  Approved: { badge: "badge badge-green",  bar: "bg-emerald-500", dot: "bg-emerald-500" },
  Rejected: { badge: "badge badge-red",    bar: "bg-red-400",     dot: "bg-red-400" },
};

const TYPE_STYLE = {
  Sick:   "badge badge-red",
  Casual: "badge badge-blue",
  Earned: "badge badge-green",
  Unpaid: "badge badge-gray",
};

const EMPTY_FORM = { employee: "", type: "Sick", from: "", to: "", reason: "" };

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const sz = size === "lg" ? "w-12 h-12 text-base" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

function Timeline({ status }) {
  const steps = [
    { key: "applied",  label: "Applied",       icon: "📝" },
    { key: "review",   label: "Under Review",  icon: "🔍" },
    { key: "decision", label: "Decision",       icon: status === "Approved" ? "✅" : status === "Rejected" ? "❌" : "⏳" },
  ];
  const activeIdx = status === "Pending" ? 1 : 2;
  return (
    <div className="flex items-center gap-0 mt-3">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center">
          <div className={`flex flex-col items-center gap-0.5`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs border-2 transition-all
              ${i <= activeIdx ? "border-[#2E86AB] bg-[#2E86AB]/10" : "border-gray-200 bg-gray-50"}`}>
              {i <= activeIdx ? s.icon : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
            </div>
            <span className={`text-[9px] font-semibold whitespace-nowrap ${i <= activeIdx ? "text-[#2E86AB]" : "text-gray-300"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div className={`w-10 h-0.5 mb-3.5 mx-0.5 ${i < activeIdx ? "bg-[#2E86AB]" : "bg-gray-200"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function ReviewModal({ leave, onClose, onSubmit }) {
  const [action, setAction]   = useState(null); // "Approved" | "Rejected"
  const [notes, setNotes]     = useState("");
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    setLoading(true);
    await onSubmit(leave._id, action, notes);
    setLoading(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#1F4E79]/10 flex items-center justify-center text-lg">🔍</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Review Leave Request</p>
              <p className="text-xs text-gray-400">Make a decision on this request</p>
            </div>
          </div>
          <button onClick={onClose} className="btn-icon text-lg">✕</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Employee summary */}
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-gray-100">
            <Avatar name={leave.employee?.name} size="lg" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{leave.employee?.name}</p>
              <p className="text-xs text-gray-500">{leave.employee?.department} · {leave.employee?.empId}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className={TYPE_STYLE[leave.type]}>{leave.type} Leave</span>
                <span className="badge badge-purple">{leave.days} day{leave.days > 1 ? "s" : ""}</span>
                <span className="text-xs text-gray-500">{leave.from} → {leave.to}</span>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div>
            <p className="label">Reason from Employee</p>
            <p className="text-sm text-gray-700 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 leading-relaxed">
              "{leave.reason}"
            </p>
          </div>

          {/* Decision buttons */}
          <div>
            <p className="label">Your Decision</p>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setAction("Approved")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${action === "Approved"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-emerald-300 hover:bg-emerald-50/50"}`}>
                <span className="text-lg">✅</span> Approve
              </button>
              <button onClick={() => setAction("Rejected")}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-semibold text-sm transition-all
                  ${action === "Rejected"
                    ? "border-red-500 bg-red-50 text-red-700 shadow-sm"
                    : "border-gray-200 text-gray-500 hover:border-red-300 hover:bg-red-50/50"}`}>
                <span className="text-lg">❌</span> Reject
              </button>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="label">Reviewer Notes <span className="text-gray-300 normal-case font-normal">(optional)</span></label>
            <textarea className="input resize-none" rows={2}
              placeholder="Add a note for the employee…"
              value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {/* Confirm */}
          {action && (
            <div className={`rounded-xl p-4 border ${action === "Approved" ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
              <p className={`text-sm font-semibold ${action === "Approved" ? "text-emerald-800" : "text-red-800"}`}>
                {action === "Approved" ? "✅ Confirm Approval" : "❌ Confirm Rejection"}
              </p>
              <p className={`text-xs mt-0.5 ${action === "Approved" ? "text-emerald-600" : "text-red-600"}`}>
                {action === "Approved"
                  ? `${leave.employee?.name}'s ${leave.days}-day leave will be approved.`
                  : `${leave.employee?.name}'s leave request will be rejected.`}
              </p>
              <button onClick={confirm} disabled={loading}
                className={`mt-3 w-full py-2.5 rounded-xl font-semibold text-sm text-white transition-all active:scale-95 disabled:opacity-50
                  ${action === "Approved" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"}`}>
                {loading ? "Processing…" : `Confirm ${action}`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Leaves({ isHR, isManager, department }) {
  const [leaves, setLeaves]       = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [showForm, setShowForm]   = useState(false);
  const [filterStatus, setFilter] = useState("");
  const [loading, setLoading]     = useState(false);
  const [reviewing, setReviewing] = useState(null); // leave object

  const load = () => leaveAPI.getAll({ status: filterStatus || undefined }).then(setLeaves).catch(() => {});
  useEffect(() => { load(); }, [filterStatus]);
  useEffect(() => { empAPI.getAll().then(setEmployees).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleApply = async (e) => {
    e.preventDefault();
    if (form.from > form.to) return toast.error("'From' date must be before 'To' date");
    setLoading(true);
    try {
      await leaveAPI.apply(form);
      toast.success("Leave applied successfully!");
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally { setLoading(false); }
  };

  const handleReview = async (id, status) => {
    try {
      await leaveAPI.review(id, status);
      toast.success(`Leave ${status.toLowerCase()}!`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this leave request?")) return;
    try { await leaveAPI.remove(id); toast.success("Deleted"); load(); }
    catch { toast.error("Failed"); }
  };

  const calcDays = () => {
    if (!form.from || !form.to) return 0;
    const diff = (new Date(form.to) - new Date(form.from)) / (1000 * 60 * 60 * 24) + 1;
    return diff > 0 ? diff : 0;
  };

  const pending  = leaves.filter((l) => l.status === "Pending");
  const rest     = leaves.filter((l) => l.status !== "Pending");
  const counts   = { all: leaves.length, pending: pending.length,
    approved: leaves.filter((l) => l.status === "Approved").length,
    rejected: leaves.filter((l) => l.status === "Rejected").length };

  const displayList = filterStatus === "" ? [...pending, ...rest] : leaves;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Leave Management</h1>
          <p className="page-subtitle">Track and manage employee leave requests</p>
        </div>
        <button className={showForm ? "btn-secondary" : "btn-primary"}
          onClick={() => setShowForm((s) => !s)}>
          {showForm ? "✕ Cancel" : "＋ Apply Leave"}
        </button>
      </div>

      {/* Department scope banner */}
      {isManager && department && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-blue-600 dark:text-blue-400 text-lg">🏢</span>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Showing leaves for <span className="underline">{department}</span> department only
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total",    value: counts.all,      color: "from-[#1F4E79] to-[#2E86AB]", icon: "📋" },
          { label: "Pending",  value: counts.pending,  color: "from-amber-400 to-orange-400", icon: "⏳" },
          { label: "Approved", value: counts.approved, color: "from-emerald-500 to-teal-500", icon: "✅" },
          { label: "Rejected", value: counts.rejected, color: "from-red-400 to-rose-500",     icon: "❌" },
        ].map(({ label, value, color, icon }) => (
          <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-sm`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg">{icon}</span>
              <span className="text-2xl font-bold">{value}</span>
            </div>
            <p className="text-white/80 text-xs font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Apply form */}
      {showForm && (
        <div className="card border-l-4 border-l-[#2E86AB] animate-[fadeIn_0.2s_ease]">
          <div className="flex items-center gap-2 mb-5">
            <span className="text-xl">🌿</span>
            <div>
              <h3 className="font-bold text-gray-900">Apply for Leave</h3>
              <p className="text-xs text-gray-500">Fill in the details below</p>
            </div>
          </div>
          <form onSubmit={handleApply} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="label">Employee</label>
              <select className="input" value={form.employee} onChange={set("employee")} required>
                <option value="">Select employee…</option>
                {employees.map((e) => (
                  <option key={e._id} value={e._id}>{e.name} ({e.empId})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Leave Type</label>
              <select className="input" value={form.type} onChange={set("type")}>
                {["Sick", "Casual", "Earned", "Unpaid"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <div className="input flex items-center justify-between bg-gray-50 cursor-default">
                <span className="text-gray-500 text-sm">
                  {calcDays() > 0 ? `${calcDays()} day${calcDays() > 1 ? "s" : ""}` : "Select dates"}
                </span>
                <span className="badge badge-blue">{form.type}</span>
              </div>
            </div>
            <div>
              <label className="label">From Date</label>
              <input type="date" className="input" value={form.from} onChange={set("from")} required />
            </div>
            <div>
              <label className="label">To Date</label>
              <input type="date" className="input" value={form.to} min={form.from} onChange={set("to")} required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="label">Reason</label>
              <textarea className="input resize-none" rows={2}
                placeholder="Brief reason for leave…"
                value={form.reason} onChange={set("reason")} required />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Submitting…" : "Submit Request"}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* HR Approval Queue banner */}
      {isHR && pending.length > 0 && filterStatus === "" && (
        <div className="rounded-2xl border-2 border-amber-200 bg-amber-50 px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-xl shrink-0">⏳</div>
            <div>
              <p className="font-bold text-amber-900 text-sm">
                {pending.length} request{pending.length > 1 ? "s" : ""} awaiting your review
              </p>
              <p className="text-xs text-amber-600 mt-0.5">Review and approve or reject pending leave requests below</p>
            </div>
          </div>
          <span className="badge badge-yellow text-sm px-3 py-1">{pending.length} Pending</span>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "",         label: `All (${counts.all})` },
          { key: "Pending",  label: `Pending (${counts.pending})` },
          { key: "Approved", label: `Approved (${counts.approved})` },
          { key: "Rejected", label: `Rejected (${counts.rejected})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150
              ${filterStatus === key
                ? "bg-[#1F4E79] text-white border-[#1F4E79] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Leave cards */}
      {displayList.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <span className="text-5xl mb-3">🌿</span>
            <p className="text-gray-600 font-semibold text-lg">No leave requests</p>
            <p className="text-gray-400 text-sm mt-1">
              {filterStatus ? `No ${filterStatus.toLowerCase()} leaves found` : "Apply for a leave to get started"}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {displayList.map((l) => {
            const style = STATUS_STYLE[l.status];
            const isPending = l.status === "Pending";
            return (
              <div key={l._id}
                className={`card hover:shadow-md transition-all duration-200 relative overflow-hidden
                  ${isPending && isHR ? "ring-2 ring-amber-200 ring-offset-1" : ""}`}>
                {/* Status bar */}
                <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${style.bar}`} />

                {/* Pending badge for HR */}
                {isPending && isHR && (
                  <div className="absolute top-3 right-3">
                    <span className="badge badge-yellow animate-pulse">Needs Review</span>
                  </div>
                )}

                <div className="flex items-start justify-between gap-4 flex-wrap">
                  {/* Left */}
                  <div className="flex items-start gap-3">
                    <Avatar name={l.employee?.name} />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{l.employee?.name}</p>
                        <span className="badge badge-blue text-[10px]">{l.employee?.empId}</span>
                        <span className={TYPE_STYLE[l.type]}>{l.type} Leave</span>
                      </div>
                      <p className="text-gray-500 text-sm mt-0.5">{l.employee?.department}</p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-gray-600 flex-wrap">
                        <span className="flex items-center gap-1">
                          <span className="text-gray-400">📅</span>
                          {l.from} → {l.to}
                        </span>
                        <span className="badge badge-purple">{l.days} day{l.days > 1 ? "s" : ""}</span>
                      </div>
                      <p className="text-gray-500 text-xs mt-1.5 max-w-md">
                        <span className="text-gray-400">Reason: </span>{l.reason}
                      </p>
                      <Timeline status={l.status} />
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex flex-col items-end gap-2 mt-6">
                    <span className={style.badge}>
                      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                      {l.status}
                    </span>
                    <p className="text-xs text-gray-400">
                      {new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                    {isHR && (
                      <div className="flex gap-1.5 mt-1">
                        {isPending && (
                          <button onClick={() => setReviewing(l)}
                            className="text-xs px-3 py-1.5 bg-[#1F4E79] text-white rounded-lg font-semibold hover:bg-[#2E86AB] transition flex items-center gap-1.5 shadow-sm">
                            🔍 Review
                          </button>
                        )}
                        <button onClick={() => handleDelete(l._id)}
                          className="text-xs px-2.5 py-1.5 bg-gray-50 text-gray-500 border border-gray-200 rounded-lg font-semibold hover:bg-gray-100 transition">
                          🗑
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewing && (
        <ReviewModal
          leave={reviewing}
          onClose={() => setReviewing(null)}
          onSubmit={handleReview}
        />
      )}
    </div>
  );
}
