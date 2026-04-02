import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { empAPI, authAPI } from "../api/client";

const EMPTY = {
  empId: "", name: "", email: "", department: "", position: "",
  salary: "", phone: "", doj: "", offerLetter: "", status: "Active", manager: "",
};

const DEPT_COLORS = [
  "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
  "bg-emerald-100 text-emerald-700", "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700", "bg-cyan-100 text-cyan-700",
];

const CONFIRM_STYLE = {
  Pending:   { cls: "badge badge-yellow", icon: "⏳", label: "Pending" },
  Confirmed: { cls: "badge badge-green",  icon: "✅", label: "Confirmed" },
  Disputed:  { cls: "badge badge-red",    icon: "⚠️", label: "Disputed" },
};

function deptColor(dept) {
  let h = 0;
  for (const c of (dept || "")) h = c.charCodeAt(0) + ((h << 5) - h);
  return DEPT_COLORS[Math.abs(h) % DEPT_COLORS.length];
}

function Avatar({ name, size = "md" }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600",
    "from-rose-400 to-rose-600", "from-cyan-400 to-cyan-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const sz = size === "lg" ? "w-14 h-14 text-lg" : "w-9 h-9 text-sm";
  return (
    <div className={`${sz} rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">{title}</h3>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="btn-icon text-lg">✕</button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

export default function Employees({ isHR, isManager, department }) {
  const [employees, setEmployees] = useState([]);
  const [managers, setManagers]   = useState([]);
  const [search, setSearch]       = useState("");
  const [modal, setModal]         = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [editId, setEditId]       = useState(null);
  const [loading, setLoading]     = useState(false);
  const [viewEmp, setViewEmp]     = useState(null);
  const [resending, setResending] = useState({});
  const navigate = useNavigate();

  const load = () => empAPI.getAll({ search }).then(setEmployees).catch(() => {});
  useEffect(() => { load(); }, [search]);
  useEffect(() => { authAPI.getManagers().then(setManagers).catch(() => {}); }, []);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setModal("form"); };
  const openEdit = (emp) => {
    setForm({
      empId: emp.empId, name: emp.name, email: emp.email,
      department: emp.department, position: emp.position,
      salary: emp.salary, phone: emp.phone || "",
      doj: emp.doj ? emp.doj.slice(0, 10) : "",
      offerLetter: emp.offerLetter || "",
      status: emp.status,
      manager: emp.manager?._id || emp.manager || "",
    });
    setEditId(emp._id);
    setModal("form");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await empAPI.update(editId, { ...form, salary: Number(form.salary) });
        toast.success("Employee updated!");
      } else {
        const result = await empAPI.create({ ...form, salary: Number(form.salary) });
        toast.success(
          result.emailSent
            ? `✅ Employee added! Offer confirmation email sent to ${form.email}`
            : `Employee added! (Email could not be sent — check SMTP config)`,
          { duration: 5000 }
        );
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally { setLoading(false); }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try { await empAPI.remove(id); toast.success("Employee deleted"); load(); }
    catch (err) { toast.error(err.response?.data?.error || "Failed"); }
  };

  const handleResend = async (id) => {
    setResending((r) => ({ ...r, [id]: true }));
    try {
      await empAPI.resendConfirm(id);
      toast.success("Confirmation email resent!");
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to resend");
    } finally { setResending((r) => ({ ...r, [id]: false })); }
  };

  const active   = employees.filter((e) => e.status === "Active").length;
  const depts    = [...new Set(employees.map((e) => e.department))].length;
  const pending  = employees.filter((e) => e.confirmStatus === "Pending").length;
  const disputed = employees.filter((e) => e.confirmStatus === "Disputed").length;

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p className="page-subtitle">Manage your workforce and offer confirmations</p>
        </div>
        {isHR && (
          <button className="btn-primary" onClick={openAdd}>
            <span>＋</span> Add Employee
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Staff",       value: employees.length, icon: "👥", color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Active",            value: active,           icon: "✅", color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Offer Pending",     value: pending,          icon: "⏳", color: "text-amber-600",   bg: "bg-amber-50" },
          { label: "Disputed",          value: disputed,         icon: "⚠️", color: "text-red-600",     bg: "bg-red-50" },
        ].map(({ label, value, icon, color, bg }) => (
          <div key={label} className="card flex items-center gap-3 py-4">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-lg`}>{icon}</div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Department scope banner for Manager */}
      {isManager && department && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
            <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">🏢</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Scoped to: {department} Department</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">You can only view and manage employees in your department</p>
          </div>
        </div>
      )}

      {/* Disputed alert */}
      {disputed > 0 && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <span className="text-xl">⚠️</span>
          <p className="text-sm text-red-700 font-medium">
            {disputed} employee{disputed > 1 ? "s have" : " has"} disputed their offer details. Please review and update.
          </p>
        </div>
      )}

      {/* Search */}
      <div className="card py-3.5">
        <div className="relative max-w-sm">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input className="input input-icon" placeholder="Search by name or employee ID…"
            value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB]">
            <tr>
              {["Employee", "Department", "Position", "Manager", "DOJ", "Salary", "Status", "Offer Confirm", ...(isHR ? ["Actions"] : [])].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {employees.length === 0 ? (
              <tr><td colSpan={isHR ? 8 : 7}>
                <div className="empty-state">
                  <span className="text-5xl mb-3">👥</span>
                  <p className="text-gray-600 font-semibold text-lg">No employees found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    {search ? "Try a different search term" : "Add your first employee to get started"}
                  </p>
                  {isHR && !search && (
                    <button className="btn-primary mt-4" onClick={openAdd}>＋ Add Employee</button>
                  )}
                </div>
              </td></tr>
            ) : employees.map((emp) => {
              const cs = CONFIRM_STYLE[emp.confirmStatus] || CONFIRM_STYLE.Pending;
              return (
                <tr key={emp._id} className="tr cursor-pointer" onClick={() => navigate(`/employees/${emp._id}`)}>
                  {/* Employee */}
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} />
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <p className="text-xs text-gray-400">{emp.email}</p>
                        <span className="badge badge-blue text-[10px] mt-0.5">{emp.empId}</span>
                      </div>
                    </div>
                  </td>
                  {/* Department */}
                  <td className="td">
                    <span className={`badge text-xs ${deptColor(emp.department)}`}>{emp.department}</span>
                  </td>
                  {/* Position */}
                  <td className="td text-gray-600">{emp.position}</td>
                  {/* Manager */}
                  <td className="td text-gray-600">
                    {emp.manager?.name
                      ? <span className="badge badge-purple">{emp.manager.name}</span>
                      : <span className="text-gray-300 text-xs">—</span>}
                  </td>
                  {/* DOJ */}
                  <td className="td text-gray-600">
                    {emp.doj ? new Date(emp.doj).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  {/* Salary */}
                  <td className="td">
                    <span className="font-semibold text-gray-900">₹{Number(emp.salary).toLocaleString("en-IN")}</span>
                    <p className="text-xs text-gray-400">Annual CTC</p>
                  </td>
                  {/* Status */}
                  <td className="td">
                    <span className={emp.status === "Active" ? "badge badge-green" : "badge badge-red"}>
                      <span className={`w-1.5 h-1.5 rounded-full ${emp.status === "Active" ? "bg-emerald-500" : "bg-red-500"}`} />
                      {emp.status}
                    </span>
                  </td>
                  {/* Offer Confirm */}
                  <td className="td">
                    <div className="flex flex-col gap-1">
                      <span className={cs.cls}>{cs.icon} {cs.label}</span>
                      {emp.confirmStatus === "Confirmed" && emp.confirmedAt && (
                        <p className="text-[10px] text-gray-400">
                          {new Date(emp.confirmedAt).toLocaleDateString("en-IN")}
                        </p>
                      )}
                      {emp.confirmStatus === "Disputed" && (
                        <p className="text-[10px] text-red-500 max-w-[120px] truncate" title={emp.disputeNote}>
                          {emp.disputeNote || "No note"}
                        </p>
                      )}
                    </div>
                  </td>
                  {/* Actions */}
                  {isHR && (
                    <td className="td" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/employees/${emp._id}`)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition" title="View Detail">
                          👁
                        </button>
                        <button onClick={() => openEdit(emp)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition" title="Edit">
                          ✏️
                        </button>
                        <button onClick={() => handleResend(emp._id)} disabled={resending[emp._id]}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 transition disabled:opacity-40" title="Resend confirmation email">
                          {resending[emp._id] ? "⏳" : "📧"}
                        </button>
                        <button onClick={() => handleDelete(emp._id, emp.name)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Delete">
                          🗑
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {modal === "form" && (
        <Modal
          title={editId ? "Edit Employee" : "Add New Employee"}
          subtitle={editId ? "Update employee information" : "An offer confirmation email will be sent automatically"}
          onClose={() => setModal(null)}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Employee ID">
                <input className="input" placeholder="EMP001" value={form.empId} onChange={set("empId")} required disabled={!!editId} />
              </Field>
              <Field label="Full Name">
                <input className="input" placeholder="John Doe" value={form.name} onChange={set("name")} required />
              </Field>
              <Field label="Email">
                <input className="input" type="email" placeholder="john@company.com" value={form.email} onChange={set("email")} required />
              </Field>
              <Field label="Phone">
                <input className="input" placeholder="+91 9876543210" value={form.phone} onChange={set("phone")} />
              </Field>
              <Field label="Department">
                <input className="input" placeholder="Engineering" value={form.department} onChange={set("department")} required />
              </Field>
              <Field label="Designation / Position">
                <input className="input" placeholder="Software Engineer" value={form.position} onChange={set("position")} required />
              </Field>
              <Field label="Date of Joining">
                <input className="input" type="date" value={form.doj} onChange={set("doj")} required />
              </Field>
              <Field label="Offer Letter Ref #">
                <input className="input" placeholder="OL-2024-001" value={form.offerLetter} onChange={set("offerLetter")} />
              </Field>
              <Field label="Basic Salary (₹)">
                <input className="input" type="number" placeholder="50000" value={form.salary} onChange={set("salary")} required min="0" />
              </Field>
              <Field label="Status">
                <select className="input" value={form.status} onChange={set("status")}>
                  <option>Active</option>
                  <option>Inactive</option>
                </select>
              </Field>
              <Field label="Assign Manager">
                <select className="input" value={form.manager} onChange={set("manager")}>
                  <option value="">No manager assigned</option>
                  {managers.map((m) => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </Field>
            </div>

            {/* Email notice */}
            {!editId && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
                <span className="text-lg mt-0.5">📧</span>
                <p className="text-sm text-blue-700">
                  An offer confirmation email will be sent to <strong>{form.email || "the employee"}</strong> with their details and a confirmation link.
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-2 border-t border-gray-100">
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center py-2.5">
                {loading ? "Saving…" : editId ? "Update Employee" : "Add & Send Email"}
              </button>
              <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1 justify-center py-2.5">
                Cancel
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Profile Modal */}
      {viewEmp && (
        <Modal title="Employee Profile" onClose={() => setViewEmp(null)}>
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-[#1F4E79]/5 to-[#2E86AB]/5 rounded-xl">
              <Avatar name={viewEmp.name} size="lg" />
              <div>
                <p className="font-bold text-gray-900 text-lg">{viewEmp.name}</p>
                <p className="text-gray-500 text-sm">{viewEmp.position} · {viewEmp.department}</p>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="badge badge-blue">{viewEmp.empId}</span>
                  <span className={viewEmp.status === "Active" ? "badge badge-green" : "badge badge-red"}>
                    {viewEmp.status}
                  </span>
                  {(() => {
                    const cs = CONFIRM_STYLE[viewEmp.confirmStatus] || CONFIRM_STYLE.Pending;
                    return <span className={cs.cls}>{cs.icon} {cs.label}</span>;
                  })()}
                </div>
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["📧 Email",           viewEmp.email],
                ["📱 Phone",           viewEmp.phone || "—"],
                ["🏢 Department",      viewEmp.department],
                ["💼 Designation",     viewEmp.position],
                ["💰 Basic Salary",    `₹${Number(viewEmp.salary).toLocaleString("en-IN")}/mo`],
                ["📅 Date of Joining", viewEmp.doj ? new Date(viewEmp.doj).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"],
                ["📄 Offer Letter",    viewEmp.offerLetter || "—"],
                ["✅ Confirmed On",    viewEmp.confirmedAt ? new Date(viewEmp.confirmedAt).toLocaleDateString("en-IN") : "—"],
              ].map(([label, value]) => (
                <div key={label} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-gray-400 text-xs mb-0.5">{label}</p>
                  <p className="font-semibold text-gray-800 text-sm">{value}</p>
                </div>
              ))}
            </div>

            {/* Dispute note */}
            {viewEmp.confirmStatus === "Disputed" && viewEmp.disputeNote && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-xs font-bold text-red-500 mb-1">⚠️ Dispute Note</p>
                <p className="text-sm text-red-700">{viewEmp.disputeNote}</p>
              </div>
            )}

            {isHR && (
              <div className="flex gap-3">
                <button className="btn-primary flex-1 justify-center"
                  onClick={() => { setViewEmp(null); openEdit(viewEmp); }}>
                  ✏️ Edit
                </button>
                <button className="btn-secondary flex-1 justify-center"
                  onClick={() => { handleResend(viewEmp._id); setViewEmp(null); }}>
                  📧 Resend Email
                </button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
