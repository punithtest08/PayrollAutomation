import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { empAPI, attAPI, payrollAPI, leaveAPI, exitAPI } from "../api/client";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
const fmtDec = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const TABS = ["Profile", "Attendance", "Payroll", "Leaves", "Exit"];

const STATUS_BADGE = {
  Draft: "badge badge-yellow",
  Processed: "badge badge-blue",
  Paid: "badge badge-green",
};

const ATT_BADGE = {
  Present: "badge badge-green",
  Absent: "badge badge-red",
  "Half Day": "badge badge-yellow",
  Leave: "badge badge-blue",
};

const LEAVE_STATUS = {
  Pending: "badge badge-yellow",
  Approved: "badge badge-green",
  Rejected: "badge badge-red",
};

const LEAVE_TYPE = {
  Sick: "badge badge-red",
  Casual: "badge badge-blue",
  Earned: "badge badge-green",
  Unpaid: "badge badge-gray",
};

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600", "from-rose-400 to-rose-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const sz = size === "xl" ? "w-20 h-20 text-2xl" : size === "lg" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  return (
    <div className={`${sz} rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-md`}>
      {initials}
    </div>
  );
}

/* ── CTC Breakdown Row ── */
function CtcRow({ label, annual, monthly, highlight }) {
  return (
    <div className={`flex items-center justify-between py-3 border-b border-gray-50 last:border-0 ${highlight ? "bg-blue-50/50 -mx-4 px-4 rounded-xl" : ""}`}>
      <span className={`text-sm ${highlight ? "font-bold text-gray-900" : "text-gray-600"}`}>{label}</span>
      <div className="flex gap-8 text-right">
        <div>
          <p className={`text-sm font-semibold ${highlight ? "text-[#1F4E79]" : "text-gray-800"}`}>{fmt(annual)}</p>
          <p className="text-[10px] text-gray-400">Annual</p>
        </div>
        <div className="w-28">
          <p className={`text-sm font-semibold ${highlight ? "text-[#1F4E79]" : "text-gray-800"}`}>{fmt(monthly)}</p>
          <p className="text-[10px] text-gray-400">Monthly</p>
        </div>
      </div>
    </div>
  );
}

/* ── Salary Slip Modal ── */
function SlipModal({ slip, onClose }) {
  if (!slip) return null;
  const emp = slip.employee;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB] text-white px-6 py-5 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg">💼 Salary Slip</p>
              <p className="text-white/80 text-sm">{emp?.name} · {emp?.empId}</p>
              <p className="text-white/60 text-xs mt-0.5">{emp?.department} · {slip.month}</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-5 text-sm">
          {/* Attendance */}
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-gray-500 font-medium">Days Worked</span>
            <span className="font-bold text-gray-800">{slip.daysWorked} / {slip.workingDays} days</span>
          </div>

          {/* Earnings */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Earnings</p>
            {[
              ["Basic (Prorated)", slip.proratedBasic],
              ["HRA (40% of Basic)", slip.proratedHRA],
              ["Special Allowance", slip.proratedSpecial],
              ["Bonus", slip.bonus],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">{l}</span>
                <span className="font-medium text-gray-800">{fmtDec(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 font-bold text-gray-900 bg-gray-50 -mx-2 px-2 rounded-lg mt-1">
              <span>Gross Salary</span><span>{fmtDec(slip.grossSalary)}</span>
            </div>
          </div>

          {/* Deductions */}
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Deductions</p>
            {[
              ["PF (12% of Basic, ₹15k cap)", slip.pf],
              ["Professional Tax", slip.professionalTax],
              ["TDS (Monthly)", slip.tds],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">{l}</span>
                <span className="font-medium text-red-500">− {fmtDec(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 font-bold text-red-600 bg-red-50 -mx-2 px-2 rounded-lg mt-1">
              <span>Total Deductions</span><span>− {fmtDec(slip.totalDeductions)}</span>
            </div>
          </div>

          {/* Net */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-emerald-800 text-base">Net Salary</span>
            <span className="text-2xl font-bold text-emerald-700">{fmtDec(slip.netSalary)}</span>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Annual Tax (Annualised): {fmtDec(slip.annualTax)} · Gratuity: {fmtDec(slip.gratuity)}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Profile ── */
function ProfileTab({ emp }) {
  const ctc = emp.ctcBreakdown;
  const doj = emp.doj ? new Date(emp.doj).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <div className="space-y-5">
      {/* Info grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          ["📧 Email", emp.email],
          ["📱 Phone", emp.phone || "—"],
          ["🏢 Department", emp.department],
          ["💼 Designation", emp.position],
          ["📅 Date of Joining", doj],
          ["📄 Offer Letter", emp.offerLetter || "—"],
        ].map(([label, value]) => (
          <div key={label} className="bg-slate-50 rounded-xl p-3.5">
            <p className="text-gray-400 text-xs mb-1">{label}</p>
            <p className="font-semibold text-gray-800 text-sm break-all">{value}</p>
          </div>
        ))}
      </div>

      {/* CTC Breakdown */}
      {ctc && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">CTC Breakdown</h3>
              <p className="text-xs text-gray-400 mt-0.5">Annual Cost to Company</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#1F4E79]">{fmt(ctc.ctc)}</p>
              <p className="text-xs text-gray-400">Annual CTC</p>
            </div>
          </div>

          <div className="flex justify-end gap-8 text-right mb-1 pr-0">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest w-24">Annual</p>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest w-28">Monthly</p>
          </div>

          <CtcRow label="Basic Salary (50% of CTC)"    annual={ctc.basic}            monthly={ctc.monthlyBasic} />
          <CtcRow label="HRA (40% of Basic)"           annual={ctc.hra}              monthly={ctc.monthlyHRA} />
          <CtcRow label="Special Allowance"            annual={ctc.specialAllowance} monthly={ctc.monthlySpecial} />
          <CtcRow label="PF — Employer (12% of Basic, ₹15k cap)" annual={ctc.pf}   monthly={ctc.monthlyPF} />
          <CtcRow label="Gratuity (4.81% of Basic)"   annual={ctc.gratuity}         monthly={ctc.monthlyGratuity} />

          <div className="mt-3 pt-3 border-t border-gray-100">
            <CtcRow label="Total CTC" annual={ctc.ctc} monthly={ctc.monthlyGross} highlight />
          </div>

          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-700">
            <strong>Note:</strong> PF is calculated on Basic capped at ₹15,000/month. TDS is computed monthly based on annualised income under New Tax Regime FY 2024-25 with ₹75,000 standard deduction.
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tab: Attendance ── */
function AttendanceTab({ empId }) {
  const [records, setRecords] = useState([]);
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    attAPI.getByEmployee(empId)
      .then((data) => setRecords(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [empId]);

  const filtered = records.filter((r) => r.date.startsWith(month));
  const counts = {
    Present: filtered.filter((r) => r.status === "Present").length,
    Absent: filtered.filter((r) => r.status === "Absent").length,
    "Half Day": filtered.filter((r) => r.status === "Half Day").length,
    Leave: filtered.filter((r) => r.status === "Leave").length,
  };
  const daysWorked = counts.Present + counts["Half Day"] * 0.5;

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      {/* Month filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
        <div className="flex gap-2 flex-wrap">
          {Object.entries(counts).map(([k, v]) => (
            <span key={k} className={ATT_BADGE[k]}>{k}: {v}</span>
          ))}
          <span className="badge badge-purple">Days Worked: {daysWorked}</span>
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB]">
            <tr>
              {["Date", "Status", "Check In", "Check Out"].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={4}>
                <div className="empty-state py-10">
                  <span className="text-3xl mb-2">📅</span>
                  <p className="text-gray-500 text-sm">No attendance records for {month}</p>
                </div>
              </td></tr>
            ) : filtered.map((r) => (
              <tr key={r._id} className="tr">
                <td className="td font-medium">{new Date(r.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</td>
                <td className="td"><span className={ATT_BADGE[r.status]}>{r.status}</span></td>
                <td className="td text-gray-500">{r.checkIn || "—"}</td>
                <td className="td text-gray-500">{r.checkOut || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ── Tab: Payroll ── */
function PayrollTab({ empId, isHR }) {
  const [records, setRecords] = useState([]);
  const [slip, setSlip] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    payrollAPI.getByEmployee(empId)
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [empId]);

  const viewSlip = async (id) => {
    try { setSlip(await payrollAPI.getSlip(id)); }
    catch { toast.error("Failed to load slip"); }
  };

  const markPaid = async (id) => {
    try {
      await payrollAPI.updateStatus(id, "Paid");
      toast.success("Marked as Paid");
      setRecords((prev) => prev.map((r) => r._id === id ? { ...r, status: "Paid" } : r));
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-100 rounded-xl" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="table-wrap">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB]">
            <tr>
              {["Month", "Gross", "Deductions", "Net Salary", "Days", "Status", "Actions"].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {records.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state py-10">
                  <span className="text-3xl mb-2">💰</span>
                  <p className="text-gray-500 text-sm">No payroll records yet</p>
                </div>
              </td></tr>
            ) : records.map((r) => (
              <tr key={r._id} className="tr">
                <td className="td font-semibold">{r.month}</td>
                <td className="td">{fmtDec(r.grossSalary)}</td>
                <td className="td text-red-500">− {fmtDec(r.totalDeductions)}</td>
                <td className="td font-bold text-emerald-700">{fmtDec(r.netSalary)}</td>
                <td className="td text-center text-gray-500">{r.daysWorked}/{r.workingDays}</td>
                <td className="td"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button onClick={() => viewSlip(r._id)}
                      className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition">
                      Slip
                    </button>
                    {isHR && r.status !== "Paid" && (
                      <button onClick={() => markPaid(r._id)}
                        className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition">
                        Mark Paid
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {slip && <SlipModal slip={slip} onClose={() => setSlip(null)} />}
    </div>
  );
}

/* ── Tab: Leaves ── */
function LeavesTab({ empId, isHR }) {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    leaveAPI.getAll({ employee: empId })
      .then(setLeaves)
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [empId]);

  const handleReview = async (id, status) => {
    try {
      await leaveAPI.review(id, status);
      toast.success(`Leave ${status.toLowerCase()}`);
      load();
    } catch { toast.error("Failed"); }
  };

  if (loading) return <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}</div>;

  return (
    <div className="space-y-3">
      {leaves.length === 0 ? (
        <div className="empty-state py-12">
          <span className="text-4xl mb-3">🌿</span>
          <p className="text-gray-500 font-medium">No leave records</p>
        </div>
      ) : leaves.map((l) => (
        <div key={l._id} className="card py-4 px-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className={LEAVE_TYPE[l.type]}>{l.type} Leave</span>
                <span className={LEAVE_STATUS[l.status]}>{l.status}</span>
                <span className="badge badge-purple">{l.days} day{l.days > 1 ? "s" : ""}</span>
              </div>
              <p className="text-sm text-gray-600">{l.from} → {l.to}</p>
              <p className="text-xs text-gray-400 mt-1">{l.reason}</p>
            </div>
            {isHR && l.status === "Pending" && (
              <div className="flex gap-2">
                <button onClick={() => handleReview(l._id, "Approved")}
                  className="text-xs px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-semibold hover:bg-emerald-100 transition">
                  ✓ Approve
                </button>
                <button onClick={() => handleReview(l._id, "Rejected")}
                  className="text-xs px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg font-semibold hover:bg-red-100 transition">
                  ✕ Reject
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Tab: Exit ── */
const EXIT_STATUS_STYLE = {
  Pending_HR: { badge: "badge badge-yellow", label: "⏳ Pending HR Approval",  bar: "bg-amber-400" },
  Approved:   { badge: "badge badge-blue",   label: "✅ Approved — Awaiting F&F", bar: "bg-blue-400" },
  Rejected:   { badge: "badge badge-red",    label: "❌ Rejected",              bar: "bg-red-400" },
  Completed:  { badge: "badge badge-green",  label: "🏁 Exit Completed",        bar: "bg-emerald-500" },
};

const EXIT_TYPES = ["Resignation", "Termination", "Retirement", "Other"];

function ExitTab({ empId, empStatus, isHR }) {
  const [exit, setExit]       = useState(null);
  const [loaded, setLoaded]   = useState(false);
  const [loading, setLoading] = useState(false);

  // Initiate form
  const [form, setForm] = useState({ lastWorkingDay: "", exitType: "Resignation", exitReason: "", noticePeriodDays: 30 });
  // F&F inputs
  const [fnfForm, setFnfForm] = useState({ noticeDaysServed: "", leaveBalance: "", bonus: "", otherDeductions: "" });
  // Approve
  const [approveComment, setApproveComment] = useState("");

  const load = async () => {
    try { setExit(await exitAPI.getDetails(empId)); } catch { setExit(null); }
    setLoaded(true);
  };
  useEffect(() => { load(); }, [empId]);

  const setF  = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const setFF = (k) => (e) => setFnfForm((p) => ({ ...p, [k]: e.target.value }));

  const handleInitiate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await exitAPI.initiate(empId, { ...form, noticePeriodDays: Number(form.noticePeriodDays) });
      toast.success("Exit initiated");
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const handleApprove = async (action) => {
    setLoading(true);
    try {
      await exitAPI.approve(empId, { action, comment: approveComment });
      toast.success(`Exit ${action.toLowerCase()}`);
      setApproveComment("");
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const handleCalcFNF = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await exitAPI.calculateFNF(empId, {
        noticeDaysServed: Number(fnfForm.noticeDaysServed) || exit.noticePeriodDays,
        leaveBalance:     Number(fnfForm.leaveBalance)     || 0,
        bonus:            Number(fnfForm.bonus)            || 0,
        otherDeductions:  Number(fnfForm.otherDeductions)  || 0,
      });
      toast.success("F&F calculated");
      setExit(res.exit);
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  const handleComplete = async () => {
    if (!confirm("Mark exit as complete and generate F&F payroll?")) return;
    setLoading(true);
    try {
      await exitAPI.complete(empId);
      toast.success("Exit completed!");
      load();
    } catch (err) { toast.error(err.response?.data?.error || "Failed"); }
    finally { setLoading(false); }
  };

  if (!loaded) return <div className="animate-pulse space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-xl" />)}</div>;

  // ── No exit yet ──
  if (!exit) {
    if (!isHR) return (
      <div className="empty-state py-12">
        <span className="text-4xl mb-3">🚪</span>
        <p className="text-gray-500 font-medium">No exit request initiated</p>
      </div>
    );
    if (empStatus !== "Active") return (
      <div className="empty-state py-12">
        <span className="text-4xl mb-3">🚪</span>
        <p className="text-gray-500 font-medium">Employee is not active</p>
      </div>
    );
    return (
      <div className="card border-l-4 border-l-red-400 animate-[fadeIn_0.2s_ease]">
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xl">🚪</span>
          <div>
            <h3 className="font-bold text-gray-900">Initiate Exit</h3>
            <p className="text-xs text-gray-500">Start the offboarding process for this employee</p>
          </div>
        </div>
        <form onSubmit={handleInitiate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Exit Type</label>
            <select className="input" value={form.exitType} onChange={setF("exitType")}>
              {EXIT_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notice Period (days)</label>
            <input type="number" className="input" min={0} value={form.noticePeriodDays} onChange={setF("noticePeriodDays")} required />
          </div>
          <div>
            <label className="label">Last Working Day</label>
            <input type="date" className="input" value={form.lastWorkingDay} onChange={setF("lastWorkingDay")} required />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Exit Reason</label>
            <textarea className="input resize-none" rows={2} value={form.exitReason} onChange={setF("exitReason")}
              placeholder="Reason for exit…" required />
          </div>
          <div className="sm:col-span-2">
            <button type="submit" disabled={loading} className="btn-danger">
              {loading ? "Initiating…" : "🚪 Initiate Exit"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  // ── Exit exists ──
  const style = EXIT_STATUS_STYLE[exit.status];
  const lwd   = new Date(exit.lastWorkingDay).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="space-y-4">
      {/* Status card */}
      <div className={`card relative overflow-hidden`}>
        <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${style.bar}`} />
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={style.badge}>{style.label}</span>
              <span className="badge badge-gray">{exit.exitType}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Last Working Day: <strong>{lwd}</strong></p>
            <p className="text-sm text-gray-600">Notice Period: <strong>{exit.noticePeriodDays} days</strong></p>
            <p className="text-xs text-gray-400 mt-1.5">Reason: {exit.exitReason}</p>
          </div>
          <div className="text-right text-xs text-gray-400">
            <p>Initiated by {exit.initiatedBy?.name}</p>
            <p>{new Date(exit.createdAt).toLocaleDateString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* HR Approval panel */}
      {isHR && exit.status === "Pending_HR" && (
        <div className="card border-2 border-amber-200 bg-amber-50">
          <p className="font-bold text-amber-900 mb-3">⏳ HR Approval Required</p>
          <div className="mb-3">
            <label className="label">Comment (optional)</label>
            <textarea className="input resize-none" rows={2}
              placeholder="Add a note…"
              value={approveComment} onChange={(e) => setApproveComment(e.target.value)} />
          </div>
          <div className="flex gap-3">
            <button onClick={() => handleApprove("Approved")} disabled={loading}
              className="btn-success">
              ✅ Approve Exit
            </button>
            <button onClick={() => handleApprove("Rejected")} disabled={loading}
              className="btn-danger">
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {/* HR approval result */}
      {exit.hrApproval?.status && (
        <div className={`card py-3 px-4 flex items-center gap-3 ${
          exit.hrApproval.status === "Approved" ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-200"
        }`}>
          <span className="text-lg">{exit.hrApproval.status === "Approved" ? "✅" : "❌"}</span>
          <div>
            <p className={`text-sm font-semibold ${exit.hrApproval.status === "Approved" ? "text-emerald-800" : "text-red-800"}`}>
              HR {exit.hrApproval.status} by {exit.hrApproval.by?.name}
            </p>
            {exit.hrApproval.comment && <p className="text-xs text-gray-500 mt-0.5">{exit.hrApproval.comment}</p>}
          </div>
        </div>
      )}

      {/* F&F Calculator */}
      {isHR && exit.status === "Approved" && (
        <div className="card border-l-4 border-l-blue-400">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🧮</span>
            <div>
              <h3 className="font-bold text-gray-900">Full & Final Settlement</h3>
              <p className="text-xs text-gray-500">Calculate F&F before completing exit</p>
            </div>
          </div>
          <form onSubmit={handleCalcFNF} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { k: "noticeDaysServed", label: "Notice Days Served", placeholder: exit.noticePeriodDays },
              { k: "leaveBalance",     label: "Leave Balance (days)", placeholder: "0" },
              { k: "bonus",            label: "Bonus / Incentive (₹)", placeholder: "0" },
              { k: "otherDeductions",  label: "Other Deductions (₹)", placeholder: "0" },
            ].map(({ k, label, placeholder }) => (
              <div key={k}>
                <label className="label">{label}</label>
                <input type="number" min={0} className="input" placeholder={placeholder}
                  value={fnfForm[k]} onChange={setFF(k)} />
              </div>
            ))}
            <div className="col-span-2 sm:col-span-4">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? "Calculating…" : "🧮 Calculate F&F"}
              </button>
            </div>
          </form>

          {/* F&F result */}
          {exit.fnf && (
            <div className="mt-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Earnings</p>
                  {[
                    ["Salary till LWD",   exit.fnf.salaryTillLWD],
                    ["Leave Encashment",  exit.fnf.leaveEncashment],
                    ["Bonus",             exit.fnf.bonus],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-medium">{fmtDec(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-sm">
                    <span>Total Earnings</span><span className="text-emerald-700">{fmtDec(exit.fnf.totalEarnings)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Deductions</p>
                  {[
                    ["PF",               exit.fnf.pf],
                    ["Professional Tax", exit.fnf.professionalTax],
                    ["Notice Shortfall", exit.fnf.noticeDeduction],
                    ["Balance TDS",      exit.fnf.balanceTDS],
                    ["Other",            exit.fnf.otherDeductions],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between py-1.5 border-b border-gray-50 text-sm">
                      <span className="text-gray-500">{l}</span>
                      <span className="font-medium text-red-500">− {fmtDec(v)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-2 font-bold text-sm">
                    <span>Total Deductions</span><span className="text-red-600">− {fmtDec(exit.fnf.totalDeductions)}</span>
                  </div>
                </div>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
                <span className="font-bold text-emerald-800">Net F&F Amount</span>
                <span className="text-2xl font-bold text-emerald-700">{fmtDec(exit.fnf.netFNF)}</span>
              </div>
              <button onClick={handleComplete} disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Processing…" : "🏁 Complete Exit & Generate F&F Payroll"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Completed summary */}
      {exit.status === "Completed" && exit.fnf && (
        <div className="card bg-emerald-50 border border-emerald-200">
          <p className="font-bold text-emerald-800 mb-3">🏁 Exit Completed</p>
          <div className="flex justify-between items-center">
            <div className="text-sm text-emerald-700 space-y-1">
              <p>Completed on {new Date(exit.completedAt).toLocaleDateString("en-IN")}</p>
              <p>F&F Payroll generated for {new Date(exit.lastWorkingDay).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-600">Net F&F</p>
              <p className="text-2xl font-bold text-emerald-700">{fmtDec(exit.fnf.netFNF)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Page ── */
export default function EmployeeDetail({ isHR }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("Profile");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    empAPI.getFullProfile(id)
      .then(setData)
      .catch(() => toast.error("Failed to load employee"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="space-y-5">
      <div className="animate-pulse h-40 bg-gray-200 rounded-2xl" />
      <div className="animate-pulse h-64 bg-gray-200 rounded-2xl" />
    </div>
  );

  if (!data) return (
    <div className="empty-state py-20">
      <span className="text-5xl mb-4">❌</span>
      <p className="text-gray-600 font-semibold">Employee not found</p>
      <button className="btn-secondary mt-4" onClick={() => navigate("/employees")}>← Back</button>
    </div>
  );

  const { employee: emp, attSummary } = data;
  const CONFIRM_STYLE = {
    Pending:   { cls: "badge badge-yellow", label: "⏳ Pending" },
    Confirmed: { cls: "badge badge-green",  label: "✅ Confirmed" },
    Disputed:  { cls: "badge badge-red",    label: "⚠️ Disputed" },
  };
  const cs = CONFIRM_STYLE[emp.confirmStatus] || CONFIRM_STYLE.Pending;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate("/employees")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition font-medium">
        ← Back to Employees
      </button>

      {/* Hero card */}
      <div className="card bg-gradient-to-r from-[#0F2D4A] to-[#1F4E79] text-white">
        <div className="flex items-start gap-5 flex-wrap">
          <Avatar name={emp.name} size="xl" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h1 className="text-2xl font-bold">{emp.name}</h1>
                <p className="text-white/70 text-sm mt-0.5">{emp.position} · {emp.department}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="badge bg-white/15 text-white ring-0">{emp.empId}</span>
                  <span className={`badge ring-0 ${emp.status === "Active" ? "bg-emerald-500/30 text-emerald-200" : "bg-red-500/30 text-red-200"}`}>
                    {emp.status}
                  </span>
                  <span className={`${cs.cls} ring-0 bg-white/15 text-white`}>{cs.label}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-3xl font-bold">{fmt(emp.ctcBreakdown?.ctc)}</p>
                <p className="text-white/50 text-xs">Annual CTC</p>
                <p className="text-white/80 text-sm font-semibold mt-0.5">{fmt(emp.ctcBreakdown?.monthlyGross)} / month</p>
              </div>
            </div>
          </div>
        </div>

        {/* Attendance summary strip */}
        {attSummary && (
          <div className="grid grid-cols-4 gap-3 mt-5 pt-5 border-t border-white/10">
            {[
              { label: "Present", value: attSummary.present, color: "text-emerald-300" },
              { label: "Absent",  value: attSummary.absent,  color: "text-red-300" },
              { label: "Half Day",value: attSummary.halfDay, color: "text-amber-300" },
              { label: "On Leave",value: attSummary.onLeave, color: "text-blue-300" },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center">
                <p className={`text-xl font-bold ${color}`}>{value}</p>
                <p className="text-white/40 text-xs">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150
              ${tab === t ? "bg-gradient-to-r from-[#1F4E79] to-[#2E86AB] text-white shadow-sm" : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {tab === "Profile"    && <ProfileTab emp={emp} />}
        {tab === "Attendance" && <AttendanceTab empId={id} />}
        {tab === "Payroll"    && <PayrollTab empId={id} isHR={isHR} />}
        {tab === "Leaves"     && <LeavesTab empId={id} isHR={isHR} />}
        {tab === "Exit"       && <ExitTab empId={id} empStatus={emp.status} isHR={isHR} />}
      </div>
    </div>
  );
}
