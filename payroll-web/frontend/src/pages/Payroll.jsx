import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { payrollAPI, empAPI } from "../api/client";
import { Wallet, Download, Plus, X, TrendingUp, CreditCard, CheckCircle } from "lucide-react";

const STATUS_BADGE = { Draft: "badge badge-yellow", Processed: "badge badge-blue", Paid: "badge badge-green" };
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

function SalarySlipModal({ slip, onClose }) {
  if (!slip) return null;
  const emp = slip.employee;
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="bg-gradient-to-r from-blue-700 to-blue-900 text-white px-6 py-5 rounded-t-2xl">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Wallet size={18} className="text-white/80" />
                <p className="font-bold text-lg">Salary Slip</p>
              </div>
              <p className="text-white/80 text-sm">{emp?.name} · {emp?.empId}</p>
              <p className="text-white/60 text-xs mt-0.5">{emp?.department} · {slip.month}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 px-3 py-1.5 rounded-lg font-semibold transition">
                <Download size={13} /> Download
              </button>
              <button onClick={onClose} className="text-white/60 hover:text-white transition"><X size={18} /></button>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-5 text-sm">
          <div className="flex items-center justify-between bg-slate-50 rounded-xl px-4 py-3">
            <span className="text-gray-500 font-medium">Days Worked</span>
            <span className="font-bold text-gray-800">{slip.daysWorked} / {slip.workingDays} days</span>
          </div>
          <div>
            <p className="section-title">Earnings</p>
            {[["Basic (Prorated)", slip.proratedBasic], ["HRA (40%)", slip.proratedHRA], ["Special Allowance", slip.proratedSpecial], ["Bonus", slip.bonus]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">{l}</span><span className="font-medium text-gray-800">{fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 font-bold text-gray-900 bg-gray-50 -mx-2 px-2 rounded-lg mt-1">
              <span>Gross Salary</span><span>{fmt(slip.grossSalary)}</span>
            </div>
          </div>
          <div>
            <p className="section-title">Deductions</p>
            {[["PF (12%)", slip.pf], ["Professional Tax", slip.professionalTax], ["TDS (Monthly)", slip.tds]].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-gray-50">
                <span className="text-gray-600">{l}</span><span className="font-medium text-red-500">− {fmt(v)}</span>
              </div>
            ))}
            <div className="flex justify-between py-2.5 font-bold text-red-600 bg-red-50 -mx-2 px-2 rounded-lg mt-1">
              <span>Total Deductions</span><span>− {fmt(slip.totalDeductions)}</span>
            </div>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex justify-between items-center">
            <span className="font-bold text-emerald-800 text-base">Net Salary</span>
            <span className="text-2xl font-bold text-emerald-700">{fmt(slip.netSalary)}</span>
          </div>
          <p className="text-xs text-gray-400 text-center">Annual Tax (Annualised): {fmt(slip.annualTax)}</p>
        </div>
      </div>
    </div>
  );
}

export default function Payroll({ isHR }) {
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ employee: "", month: new Date().toISOString().slice(0, 7), bonus: "0" });
  const [showForm, setShowForm] = useState(false);
  const [slip, setSlip] = useState(null);
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().slice(0, 7));
  const [loading, setLoading] = useState(false);

  const load = () => payrollAPI.getAll({ month: filterMonth }).then(setRecords).catch(() => {});

  useEffect(() => { load(); }, [filterMonth]);
  useEffect(() => { empAPI.getAll().then(setEmployees).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleGenerate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await payrollAPI.generate({ ...form, bonus: Number(form.bonus) });
      toast.success("Payroll generated");
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const viewSlip = async (id) => {
    try {
      const data = await payrollAPI.getSlip(id);
      setSlip(data);
    } catch { toast.error("Failed to load slip"); }
  };

  const markPaid = async (id) => {
    try {
      await payrollAPI.updateStatus(id, "Paid");
      toast.success("Marked as Paid");
      load();
    } catch { toast.error("Failed"); }
  };

  const totalNet = records.reduce((s, r) => s + (r.netSalary || 0), 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Payroll</h1>
          <p className="page-subtitle">Salary processing & payslips</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" className="input w-auto" value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} />
          {isHR && (
            <button className="btn-primary" onClick={() => setShowForm((s) => !s)}>
              <Plus size={15} /> Generate
            </button>
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Records",     value: records.length,                                    icon: CreditCard,  color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Total Net",   value: `₹${Math.round(totalNet).toLocaleString("en-IN")}`, icon: TrendingUp,  color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Paid",        value: records.filter((r) => r.status === "Paid").length,  icon: CheckCircle, color: "text-purple-600",  bg: "bg-purple-50" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Generate form */}
      {showForm && isHR && (
        <div className="card">
          <h3 className="font-semibold text-gray-700 mb-4">Generate Payroll</h3>
          <form onSubmit={handleGenerate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Employee</label>
              <select className="input" value={form.employee} onChange={set("employee")} required>
                <option value="">Select employee</option>
                {employees.map((e) => <option key={e._id} value={e._id}>{e.name} ({e.empId})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Month</label>
              <input type="month" className="input" value={form.month} onChange={set("month")} required />
            </div>
            <div>
              <label className="label">Bonus (₹)</label>
              <input type="number" className="input" value={form.bonus} onChange={set("bonus")} min="0" />
            </div>
            <div className="sm:col-span-3 flex gap-3">
              <button type="submit" disabled={loading} className="btn-primary">{loading ? "Generating…" : "Generate"}</button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Table */}
      <div className="table-wrap">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-slate-800 to-slate-700">
            <tr>{["Employee", "Month", "Gross", "Deductions", "Net Salary", "Days", "Status", "Actions"].map((h) => (
              <th key={h} className="th">{h}</th>
            ))}</tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {records.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <Wallet size={40} className="text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No payroll records for this month</p>
                </div>
              </td></tr>
            ) : records.map((r) => (
              <tr key={r._id} className="tr">
                <td className="td">
                  <p className="font-semibold text-gray-900">{r.employee?.name}</p>
                  <p className="text-xs text-gray-400">{r.employee?.empId}</p>
                </td>
                <td className="td font-medium">{r.month}</td>
                <td className="td font-semibold">{fmt(r.grossSalary)}</td>
                <td className="td text-red-500">− {fmt(r.totalDeductions)}</td>
                <td className="td font-bold text-emerald-700">{fmt(r.netSalary)}</td>
                <td className="td text-center text-gray-500">{r.daysWorked}/{r.workingDays}</td>
                <td className="td"><span className={STATUS_BADGE[r.status]}>{r.status}</span></td>
                <td className="td">
                  <div className="flex gap-1.5">
                    <button onClick={() => viewSlip(r._id)}
                      className="text-xs px-2.5 py-1.5 bg-blue-50 text-blue-700 rounded-lg font-semibold hover:bg-blue-100 transition flex items-center gap-1">
                      <Download size={12} /> Slip
                    </button>
                    {isHR && r.status !== "Paid" && (
                      <button onClick={() => markPaid(r._id)}
                        className="text-xs px-2.5 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg font-semibold hover:bg-emerald-100 transition">
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

      {slip && <SalarySlipModal slip={slip} onClose={() => setSlip(null)} />}
    </div>
  );
}
