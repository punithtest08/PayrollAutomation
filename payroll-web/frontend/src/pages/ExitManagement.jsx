import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { exitAPI } from "../api/client";
import {
  DoorOpen, CheckCircle, Clock, XCircle, Users,
  ChevronRight, ArrowRight, User,
} from "lucide-react";

const STATUS_CONFIG = {
  Pending_HR: { label: "Pending HR",  badge: "badge badge-yellow", bar: "bg-amber-400",   step: 1 },
  Approved:   { label: "Approved",    badge: "badge badge-blue",   bar: "bg-blue-500",    step: 2 },
  Rejected:   { label: "Rejected",    badge: "badge badge-red",    bar: "bg-red-500",     step: 1 },
  Completed:  { label: "Completed",   badge: "badge badge-green",  bar: "bg-emerald-500", step: 3 },
};

const APPROVAL_STEPS = [
  { label: "Manager",  icon: User },
  { label: "HR",       icon: Users },
  { label: "Finance",  icon: CheckCircle },
];

function Stepper({ currentStep, status }) {
  const isRejected = status === "Rejected";
  return (
    <div className="flex items-center gap-0 mt-4">
      {APPROVAL_STEPS.map(({ label, icon: Icon }, i) => {
        const done    = i < currentStep && !isRejected;
        const active  = i === currentStep && !isRejected;
        const rejected = isRejected && i === 1;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all
                ${done    ? "bg-emerald-500 border-emerald-500 text-white"
                : active  ? "bg-blue-500 border-blue-500 text-white shadow-lg shadow-blue-200"
                : rejected ? "bg-red-500 border-red-500 text-white"
                : "bg-white border-gray-200 text-gray-400"}`}>
                {done ? <CheckCircle size={16} /> : rejected ? <XCircle size={16} /> : <Icon size={15} />}
              </div>
              <span className={`text-[10px] font-semibold whitespace-nowrap
                ${done ? "text-emerald-600" : active ? "text-blue-600" : rejected ? "text-red-500" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < APPROVAL_STEPS.length - 1 && (
              <div className={`w-16 h-0.5 mb-4 mx-1 transition-all ${done ? "bg-emerald-400" : "bg-gray-200"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function NoticePeriodBar({ lastWorkingDay, noticePeriodDays }) {
  const lwd   = new Date(lastWorkingDay);
  const start = new Date(lwd);
  start.setDate(start.getDate() - noticePeriodDays);
  const today = new Date();
  const total = noticePeriodDays;
  const served = Math.min(Math.max(Math.floor((today - start) / (1000 * 60 * 60 * 24)), 0), total);
  const pct = Math.round((served / total) * 100);

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1.5">
        <span>Notice Period Progress</span>
        <span className="font-semibold text-gray-700">{served} / {total} days ({pct}%)</span>
      </div>
      <div className="progress-bar h-2.5">
        <div className="progress-fill bg-gradient-to-r from-blue-400 to-blue-600" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">
        Last Working Day: <strong className="text-gray-600">{lwd.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
      </p>
    </div>
  );
}

function ExitCard({ exit, isHR, onViewDetail }) {
  const cfg = STATUS_CONFIG[exit.status] || STATUS_CONFIG.Pending_HR;
  const step = cfg.step;

  return (
    <div className="card hover:shadow-md transition-all duration-200 relative overflow-hidden">
      <div className={`absolute top-0 left-0 w-1 h-full rounded-l-2xl ${cfg.bar}`} />

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <DoorOpen size={18} className="text-slate-600" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{exit.employee?.name || "—"}</p>
              <span className="badge badge-blue text-[10px]">{exit.employee?.empId}</span>
              <span className={cfg.badge}>{cfg.label}</span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{exit.employee?.department} · {exit.exitType}</p>
            <p className="text-xs text-gray-400 mt-1 max-w-sm">{exit.exitReason}</p>
            {exit.lastWorkingDay && (
              <NoticePeriodBar lastWorkingDay={exit.lastWorkingDay} noticePeriodDays={exit.noticePeriodDays || 30} />
            )}
            <Stepper currentStep={step} status={exit.status} />
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          {exit.fnf?.netFNF && (
            <div className="text-right">
              <p className="text-xs text-gray-400">Net F&F</p>
              <p className="text-lg font-bold text-emerald-700">
                ₹{Number(exit.fnf.netFNF).toLocaleString("en-IN")}
              </p>
            </div>
          )}
          <button onClick={() => onViewDetail(exit.employee?._id)}
            className="btn-secondary text-xs gap-1.5">
            View Detail <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ExitManagement({ isHR }) {
  const [exits, setExits]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter]   = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    exitAPI.getAll()
      .then(setExits)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter ? exits.filter((e) => e.status === filter) : exits;

  const counts = {
    all:       exits.length,
    pending:   exits.filter((e) => e.status === "Pending_HR").length,
    approved:  exits.filter((e) => e.status === "Approved").length,
    completed: exits.filter((e) => e.status === "Completed").length,
    rejected:  exits.filter((e) => e.status === "Rejected").length,
  };

  if (loading) return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="animate-pulse h-40 bg-gray-200 rounded-2xl" />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Exit Management</h1>
          <p className="page-subtitle">Offboarding & Full & Final Settlement</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Exits",  value: counts.all,       icon: DoorOpen,      color: "text-slate-600",   bg: "bg-slate-100" },
          { label: "Pending HR",   value: counts.pending,   icon: Clock,         color: "text-amber-600",   bg: "bg-amber-50" },
          { label: "Approved",     value: counts.approved,  icon: CheckCircle,   color: "text-blue-600",    bg: "bg-blue-50" },
          { label: "Completed",    value: counts.completed, icon: CheckCircle,   color: "text-emerald-600", bg: "bg-emerald-50" },
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

      {/* Approval Flow Info */}
      <div className="card bg-gradient-to-r from-slate-50 to-blue-50 border-blue-100">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
            <ArrowRight size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">Approval Workflow</p>
            <p className="text-xs text-gray-500">Exit requests follow a 3-stage approval process</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {["Initiate Exit", "HR Approval", "F&F Calculation", "Finance Release"].map((step, i, arr) => (
            <div key={step} className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-blue-100 shadow-sm">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                <span className="text-xs font-semibold text-gray-700">{step}</span>
              </div>
              {i < arr.length - 1 && <ChevronRight size={14} className="text-gray-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "",           label: `All (${counts.all})` },
          { key: "Pending_HR", label: `Pending (${counts.pending})` },
          { key: "Approved",   label: `Approved (${counts.approved})` },
          { key: "Completed",  label: `Completed (${counts.completed})` },
          { key: "Rejected",   label: `Rejected (${counts.rejected})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150
              ${filter === key
                ? "bg-slate-800 text-white border-slate-800 shadow-sm"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Exit list */}
      {filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <DoorOpen size={48} className="text-gray-300 mb-3" />
            <p className="text-gray-600 font-semibold text-lg">No exit records</p>
            <p className="text-gray-400 text-sm mt-1">
              {filter ? `No ${filter.toLowerCase()} exits found` : "Initiate an exit from the Employee Detail page"}
            </p>
            <button className="btn-secondary mt-4" onClick={() => navigate("/employees")}>
              Go to Employees
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exit) => (
            <ExitCard
              key={exit._id}
              exit={exit}
              isHR={isHR}
              onViewDetail={(empId) => navigate(`/employees/${empId}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
