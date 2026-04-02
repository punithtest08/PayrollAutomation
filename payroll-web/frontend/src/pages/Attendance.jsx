import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { attAPI, empAPI } from "../api/client";

const STATUS_OPTS = ["Present", "Absent", "Half Day", "Leave"];

const STATUS_STYLE = {
  Present:  { badge: "badge badge-green",  btn: "bg-emerald-500 text-white border-emerald-500",  dot: "bg-emerald-500" },
  Absent:   { badge: "badge badge-red",    btn: "bg-red-500 text-white border-red-500",           dot: "bg-red-500" },
  "Half Day":{ badge: "badge badge-yellow", btn: "bg-amber-400 text-white border-amber-400",      dot: "bg-amber-400" },
  Leave:    { badge: "badge badge-blue",   btn: "bg-blue-500 text-white border-blue-500",         dot: "bg-blue-500" },
};

const IDLE_BTN = "bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-700";

function Avatar({ name }) {
  const initials = name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2) || "?";
  const colors = ["from-blue-400 to-blue-600", "from-purple-400 to-purple-600",
    "from-emerald-400 to-emerald-600", "from-amber-400 to-amber-600"];
  const color = colors[initials.charCodeAt(0) % colors.length];
  return (
    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm`}>
      {initials}
    </div>
  );
}

export default function Attendance({ isHR, isManager, department }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [records, setRecords] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [saving, setSaving] = useState({});
  const [search, setSearch] = useState("");

  useEffect(() => { empAPI.getAll().then(setEmployees).catch(() => {}); }, []);
  useEffect(() => { attAPI.getByDate(date).then(setRecords).catch(() => {}); }, [date]);

  const attMap = Object.fromEntries(records.map((r) => [r.employee?._id, r]));

  const handleMark = async (empId, status) => {
    setSaving((s) => ({ ...s, [empId]: true }));
    try {
      await attAPI.mark({ employee: empId, date, status });
      const updated = await attAPI.getByDate(date);
      setRecords(updated);
      toast.success(`Marked ${status}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed");
    } finally {
      setSaving((s) => ({ ...s, [empId]: false }));
    }
  };

  const filtered = employees.filter((e) =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.empId.toLowerCase().includes(search.toLowerCase())
  );

  const counts = {
    Present:   records.filter((r) => r.status === "Present").length,
    Absent:    records.filter((r) => r.status === "Absent").length,
    "Half Day":records.filter((r) => r.status === "Half Day").length,
    Leave:     records.filter((r) => r.status === "Leave").length,
  };
  const notMarked = employees.length - records.length;
  const pct = employees.length ? Math.round((counts.Present / employees.length) * 100) : 0;

  const fmtDate = new Date(date + "T00:00:00").toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="page-subtitle">{fmtDate}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">📅</span>
            <input type="date" className="input input-icon w-44 cursor-pointer"
              value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Department scope banner */}
      {isManager && department && (
        <div className="flex items-center gap-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3">
          <span className="text-blue-600 dark:text-blue-400 text-lg">🏢</span>
          <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
            Showing attendance for <span className="underline">{department}</span> department only
          </p>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Present",    value: counts.Present,    color: "from-emerald-500 to-teal-500",   icon: "✅" },
          { label: "Absent",     value: counts.Absent,     color: "from-red-400 to-rose-500",       icon: "❌" },
          { label: "Half Day",   value: counts["Half Day"],color: "from-amber-400 to-orange-400",   icon: "🌓" },
          { label: "On Leave",   value: counts.Leave,      color: "from-blue-400 to-indigo-500",    icon: "🌿" },
          { label: "Not Marked", value: notMarked,         color: "from-gray-400 to-slate-500",     icon: "⏳" },
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

      {/* Attendance rate bar */}
      <div className="card py-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-gray-700">Overall Attendance Rate</span>
            <span className="badge badge-green">{pct}%</span>
          </div>
          <span className="text-xs text-gray-400">{counts.Present} of {employees.length} present</span>
        </div>
        <div className="progress-bar h-3">
          <div className="progress-fill bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input className="input input-icon" placeholder="Search employee…"
          value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB]">
            <tr>
              {["Employee", "Department", "Status", ...(isHR ? ["Mark Attendance"] : [])].map((h) => (
                <th key={h} className="th">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <tr><td colSpan={isHR ? 4 : 3}>
                <div className="empty-state">
                  <span className="text-4xl mb-2">📅</span>
                  <p className="text-gray-500 font-medium">No employees found</p>
                </div>
              </td></tr>
            ) : filtered.map((emp) => {
              const rec = attMap[emp._id];
              const style = rec ? STATUS_STYLE[rec.status] : null;
              return (
                <tr key={emp._id} className="tr">
                  <td className="td">
                    <div className="flex items-center gap-3">
                      <Avatar name={emp.name} />
                      <div>
                        <p className="font-semibold text-gray-900">{emp.name}</p>
                        <span className="badge badge-blue text-[10px]">{emp.empId}</span>
                      </div>
                    </div>
                  </td>
                  <td className="td text-gray-500">{emp.department}</td>
                  <td className="td">
                    {rec ? (
                      <span className={style.badge}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {rec.status}
                      </span>
                    ) : (
                      <span className="badge badge-gray">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                        Not Marked
                      </span>
                    )}
                  </td>
                  {isHR && (
                    <td className="td">
                      <div className="flex gap-1.5 flex-wrap">
                        {STATUS_OPTS.map((s) => {
                          const isActive = rec?.status === s;
                          return (
                            <button key={s}
                              disabled={saving[emp._id]}
                              onClick={() => handleMark(emp._id, s)}
                              className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition-all duration-150 active:scale-95
                                ${isActive ? STATUS_STYLE[s].btn : IDLE_BTN}
                                ${saving[emp._id] ? "opacity-50 cursor-not-allowed" : ""}`}>
                              {s}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
