import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { empAPI, attAPI, payrollAPI, leaveAPI } from "../api/client";
import { useAuth } from "../hooks/useAuth";

const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const STATUS_STYLE = {
  Pending:  { badge: "badge badge-yellow", dot: "bg-amber-400" },
  Approved: { badge: "badge badge-green",  dot: "bg-emerald-500" },
  Rejected: { badge: "badge badge-red",    dot: "bg-red-400" },
};

const TYPE_BADGE = { Sick: "badge badge-red", Casual: "badge badge-blue", Earned: "badge badge-green", Unpaid: "badge badge-gray" };

const TABS = [
  { key: "profile",    label: "Profile",       icon: "👤" },
  { key: "attendance", label: "Attendance",    icon: "📅" },
  { key: "payslips",   label: "Payslips",      icon: "💰" },
  { key: "leave",      label: "Leave Request", icon: "🌿" },
];

function SalarySlipModal({ slip, onClose }) {
  const emp = slip.employee;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={(e) => e.stopPropagation()}>
        <div className="bg-[#1F4E79] text-white px-6 py-4 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-bold text-lg">💼 Salary Slip</p>
              <p className="text-white/80 text-sm">{emp?.name} · {emp?.empId}</p>
              <p className="text-white/60 text-xs">{emp?.department} · {slip.month}</p>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white text-xl">✕</button>
          </div>
        </div>
        <div className="p-6 space-y-4 text-sm">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Earnings</p>
            {[["Basic (Prorated)", slip.proratedBasic], ["HRA (40%)", slip.proratedHRA], ["Special Allowance", slip.proratedSpecial], ["Bonus", slip.bonus]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">{l}</span><span className="font-medium">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold text-gray-800">
              <span>Gross Salary</span><span>{fmt(slip.grossSalary)}</span>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Deductions</p>
            {[["PF (12%)", slip.pf], ["Professional Tax", slip.professionalTax], ["TDS (Monthly)", slip.tds]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-1 border-b border-gray-100">
                <span className="text-gray-600">{l}</span><span className="font-medium text-red-500">- {fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2 font-bold text-red-600">
              <span>Total Deductions</span><span>- {fmt(slip.totalDeductions)}</span>
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 flex justify-between items-center">
            <span className="font-bold text-green-800">Net Salary</span>
            <span className="text-xl font-bold text-green-700">{fmt(slip.netSalary)}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Days Worked: {slip.daysWorked}/{slip.workingDays}</p>
        </div>
      </div>
    </div>
  );
}

function ProfileTab({ profile }) {
  if (!profile) return <div className="card"><p className="text-gray-400 text-sm text-center py-8">Loading profile…</p></div>;
  const fields = [
    ["Employee ID", profile.empId],
    ["Department",  profile.department],
    ["Designation", profile.designation],
    ["Date of Join", profile.dateOfJoining ? new Date(profile.dateOfJoining).toLocaleDateString("en-IN") : "—"],
    ["Phone",       profile.phone || "—"],
    ["PAN",         profile.pan || "—"],
    ["Bank Account",profile.bankAccount || "—"],
    ["IFSC",        profile.ifsc || "—"],
  ];
  return (
    <div className="space-y-4">
      <div className="card flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2E86AB] to-[#1F4E79] flex items-center justify-center text-white text-2xl font-bold shadow">
          {profile.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2)}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{profile.name}</p>
          <p className="text-gray-500 text-sm">{profile.email}</p>
          <span className="badge badge-blue mt-1">{profile.status || "Active"}</span>
        </div>
      </div>
      <div className="card grid grid-cols-1 sm:grid-cols-2 gap-4">
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="label">{label}</p>
            <p className="text-sm font-medium text-gray-800">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendanceTab({ empId }) {
  const [records, setRecords] = useState([]);
  const [month, setMonth]     = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!empId) return;
    attAPI.getByEmployee(empId).then(setRecords).catch(() => {});
    attAPI.getSummary(empId, month).then(setSummary).catch(() => {});
  }, [empId, month]);

  const filtered = records.filter((r) => r.date?.startsWith(month));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm font-semibold text-gray-700">Monthly Summary</p>
        <input type="month" className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {summary && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Present", value: summary.present, color: "from-emerald-500 to-teal-500", icon: "✅" },
            { label: "Absent",  value: summary.absent,  color: "from-red-400 to-rose-500",     icon: "❌" },
            { label: "Working Days", value: summary.workingDays, color: "from-[#1F4E79] to-[#2E86AB]", icon: "📅" },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className={`rounded-2xl bg-gradient-to-br ${color} p-4 text-white shadow-sm`}>
              <div className="flex items-center justify-between mb-1">
                <span>{icon}</span>
                <span className="text-2xl font-bold">{value ?? "—"}</span>
              </div>
              <p className="text-white/80 text-xs font-medium">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1F4E79]">
              <tr>{["Date", "Status", "Check In", "Check Out"].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={4} className="td text-center text-gray-400 py-8">No records for this month</td></tr>
              ) : filtered.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="td">{r.date}</td>
                  <td className="td">
                    <span className={r.status === "Present" ? "badge badge-green" : "badge badge-red"}>{r.status}</span>
                  </td>
                  <td className="td">{r.checkIn || "—"}</td>
                  <td className="td">{r.checkOut || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PayslipsTab({ empId }) {
  const [records, setRecords] = useState([]);
  const [slip, setSlip]       = useState(null);

  useEffect(() => {
    if (!empId) return;
    payrollAPI.getByEmployee(empId).then(setRecords).catch(() => {});
  }, [empId]);

  const viewSlip = async (id) => {
    try { setSlip(await payrollAPI.getSlip(id)); }
    catch { toast.error("Failed to load slip"); }
  };

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-[#1F4E79]">
              <tr>{["Month", "Gross", "Deductions", "Net Salary", "Days", "Status", ""].map((h) => <th key={h} className="th">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {records.length === 0 ? (
                <tr><td colSpan={7} className="td text-center text-gray-400 py-8">No payslips found</td></tr>
              ) : records.map((r) => (
                <tr key={r._id} className="hover:bg-gray-50">
                  <td className="td font-medium">{r.month}</td>
                  <td className="td">{fmt(r.grossSalary)}</td>
                  <td className="td text-red-500">- {fmt(r.totalDeductions)}</td>
                  <td className="td font-bold text-green-700">{fmt(r.netSalary)}</td>
                  <td className="td text-center">{r.daysWorked}/{r.workingDays}</td>
                  <td className="td"><span className={r.status === "Paid" ? "badge badge-green" : "badge badge-yellow"}>{r.status}</span></td>
                  <td className="td">
                    <button onClick={() => viewSlip(r._id)} className="text-xs px-2 py-1 bg-blue-50 text-blue-700 rounded font-semibold hover:bg-blue-100">View Slip</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {slip && <SalarySlipModal slip={slip} onClose={() => setSlip(null)} />}
    </div>
  );
}

const EMPTY_FORM = { type: "Sick", from: "", to: "", reason: "" };

function LeaveTab({ empId }) {
  const [leaves, setLeaves]   = useState([]);
  const [form, setForm]       = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = () => leaveAPI.getAll({ employee: empId }).then(setLeaves).catch(() => {});
  useEffect(() => { if (empId) load(); }, [empId]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const calcDays = () => {
    if (!form.from || !form.to) return 0;
    const d = (new Date(form.to) - new Date(form.from)) / 86400000 + 1;
    return d > 0 ? d : 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.from > form.to) return toast.error("'From' must be before 'To'");
    setLoading(true);
    try {
      await leaveAPI.apply({ ...form, employee: empId });
      toast.success("Leave applied!");
      setForm(EMPTY_FORM);
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button className={showForm ? "btn-secondary" : "btn-primary"} onClick={() => setShowForm((s) => !s)}>
          {showForm ? "✕ Cancel" : "＋ Apply Leave"}
        </button>
      </div>

      {showForm && (
        <div className="card border-l-4 border-l-[#2E86AB]">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Leave Type</label>
              <select className="input" value={form.type} onChange={set("type")}>
                {["Sick", "Casual", "Earned", "Unpaid"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Duration</label>
              <div className="input flex items-center justify-between bg-gray-50 cursor-default">
                <span className="text-gray-500 text-sm">{calcDays() > 0 ? `${calcDays()} day${calcDays() > 1 ? "s" : ""}` : "Select dates"}</span>
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
            <div className="sm:col-span-2">
              <label className="label">Reason</label>
              <textarea className="input resize-none" rows={2} placeholder="Brief reason…" value={form.reason} onChange={set("reason")} required />
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Submitting…" : "Submit"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {leaves.length === 0 ? (
          <div className="card"><div className="empty-state"><span className="text-4xl mb-2">🌿</span><p className="text-gray-500 font-medium">No leave requests yet</p></div></div>
        ) : leaves.map((l) => {
          const style = STATUS_STYLE[l.status];
          return (
            <div key={l._id} className="card flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={TYPE_BADGE[l.type]}>{l.type} Leave</span>
                  <span className="badge badge-purple">{l.days} day{l.days > 1 ? "s" : ""}</span>
                  <span className="text-xs text-gray-500">{l.from} → {l.to}</span>
                </div>
                <p className="text-xs text-gray-500 mt-1.5">{l.reason}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className={style.badge}><span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />{l.status}</span>
                <p className="text-xs text-gray-400">{new Date(l.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function EmployeePortal() {
  const { linkedEmployeeId } = useAuth();
  const [tab, setTab]         = useState("profile");
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    empAPI.getSelf().then(setProfile).catch(() => {});
  }, []);

  const empId = linkedEmployeeId || profile?._id;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Portal</h1>
          <p className="page-subtitle">Your personal self-service dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 flex-wrap">
        {TABS.map(({ key, label, icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150
              ${tab === key
                ? "bg-[#1F4E79] text-white border-[#1F4E79] shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
            <span>{icon}</span>{label}
          </button>
        ))}
      </div>

      {tab === "profile"    && <ProfileTab profile={profile} />}
      {tab === "attendance" && <AttendanceTab empId={empId} />}
      {tab === "payslips"   && <PayslipsTab empId={empId} />}
      {tab === "leave"      && <LeaveTab empId={empId} />}
    </div>
  );
}
