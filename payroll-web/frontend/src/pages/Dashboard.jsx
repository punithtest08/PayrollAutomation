import { useEffect, useState } from "react";
import { dashAPI } from "../api/client";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, AreaChart, Area,
} from "recharts";
import {
  Users, CheckCircle, TreePalm, Wallet, RefreshCw,
  TrendingUp, UserPlus, DoorOpen, CreditCard,
} from "lucide-react";

const COLORS = ["#3B82F6", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#EC4899"];

const SALARY_DIST = [
  { range: "< 5L",   count: 8 },
  { range: "5–10L",  count: 22 },
  { range: "10–15L", count: 18 },
  { range: "15–20L", count: 11 },
  { range: "20–30L", count: 6 },
  { range: "> 30L",  count: 3 },
];

const ACTIVITY = [
  { icon: UserPlus,   color: "text-blue-500 bg-blue-50",    text: "Ananya Krishnan joined Engineering",    time: "2h ago" },
  { icon: DoorOpen,   color: "text-red-500 bg-red-50",      text: "Vikram Nair exit completed (F&F done)", time: "5h ago" },
  { icon: CreditCard, color: "text-emerald-500 bg-emerald-50", text: "June 2025 payroll run — 68 slips",   time: "1d ago" },
  { icon: UserPlus,   color: "text-blue-500 bg-blue-50",    text: "Deepa Menon joined Product",            time: "2d ago" },
  { icon: CreditCard, color: "text-emerald-500 bg-emerald-50", text: "May 2025 payroll run — 65 slips",   time: "1mo ago" },
];

const Skeleton = ({ className }) => (
  <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />
);

function StatCard({ icon: Icon, label, value, sub, gradient, trend, iconBg }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl p-5 text-white shadow-lg ${gradient}`}>
      <div className="absolute -right-5 -top-5 w-28 h-28 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
      <div className="relative">
        <div className="flex items-start justify-between mb-3">
          <div className={`w-10 h-10 rounded-xl ${iconBg || "bg-white/20"} flex items-center justify-center shadow-inner`}>
            <Icon size={20} className="text-white" />
          </div>
          {trend !== undefined && (
            <span className={`text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 ${trend >= 0 ? "bg-white/20" : "bg-red-400/30"}`}>
              <TrendingUp size={11} /> {Math.abs(trend)}%
            </span>
          )}
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-white/80 text-sm font-medium mt-0.5">{label}</p>
        {sub && <p className="text-white/50 text-xs mt-1">{sub}</p>}
      </div>
    </div>
  );
}

function AttendanceDonut({ present, absent, notMarked, total }) {
  const data = [
    { name: "Present",    value: present,   fill: "#10B981" },
    { name: "Absent",     value: absent,    fill: "#EF4444" },
    { name: "Not Marked", value: notMarked, fill: "#E2E8F0" },
  ].filter((d) => d.value > 0);
  const rate = total ? Math.round((present / total) * 100) : 0;
  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={180} height={180}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
            dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
            {data.map((d, i) => <Cell key={i} fill={d.fill} stroke="none" />)}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold text-gray-800">{rate}%</p>
        <p className="text-xs text-gray-500 font-medium">Present</p>
      </div>
    </div>
  );
}

const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{label}</p>
      <p className="text-blue-600 font-bold">{payload[0].value} employees</p>
    </div>
  );
};

export default function Dashboard() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashAPI.getSummary()
      .then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const fmt   = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  if (loading) return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-36" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Skeleton className="h-72" />
        <Skeleton className="h-72 lg:col-span-2" />
      </div>
    </div>
  );

  const notMarked = (stats?.totalEmployees || 0) - (stats?.presentToday || 0) - (stats?.absentToday || 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">{today}</p>
        </div>
        <button onClick={() => window.location.reload()} className="btn-secondary text-xs gap-1.5">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users}       label="Total Employees"  value={stats?.totalEmployees ?? 0}
          sub={`${stats?.activeEmployees ?? 0} active`}
          gradient="bg-gradient-to-br from-blue-600 to-blue-800" trend={5} />
        <StatCard icon={CheckCircle} label="Present Today"    value={stats?.presentToday ?? 0}
          sub={`${stats?.attendanceRate ?? 0}% rate`}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600" trend={2} />
        <StatCard icon={TreePalm}    label="Pending Leaves"   value={stats?.pendingLeaves ?? 0}
          sub="awaiting HR review"
          gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
        <StatCard icon={Wallet}      label="Monthly Payroll"  value={fmt(stats?.monthlyPayroll)}
          sub={`${stats?.processedPayrolls ?? 0} slips processed`}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600" trend={8} />
      </div>

      {/* Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Attendance donut */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-800">Today's Attendance</h3>
              <p className="text-xs text-gray-400 mt-0.5">Live status</p>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
          <div className="flex flex-col items-center">
            <AttendanceDonut
              present={stats?.presentToday ?? 0}
              absent={stats?.absentToday ?? 0}
              notMarked={notMarked}
              total={stats?.totalEmployees ?? 0}
            />
            <div className="w-full mt-4 space-y-2.5">
              {[
                { label: "Present",    value: stats?.presentToday ?? 0, color: "bg-emerald-500", pct: stats?.totalEmployees ? (stats.presentToday / stats.totalEmployees) * 100 : 0 },
                { label: "Absent",     value: stats?.absentToday ?? 0,  color: "bg-red-400",     pct: stats?.totalEmployees ? (stats.absentToday  / stats.totalEmployees) * 100 : 0 },
                { label: "Not Marked", value: notMarked,                color: "bg-gray-300",    pct: stats?.totalEmployees ? (notMarked          / stats.totalEmployees) * 100 : 0 },
              ].map(({ label, value, color, pct }) => (
                <div key={label} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <span className="font-bold text-gray-800">{value}</span>
                  </div>
                  <div className="progress-bar">
                    <div className={`progress-fill ${color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dept bar chart */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-800">Employees by Department</h3>
              <p className="text-xs text-gray-400 mt-0.5">Headcount distribution</p>
            </div>
            <span className="badge badge-blue">{stats?.deptBreakdown?.length ?? 0} depts</span>
          </div>
          {stats?.deptBreakdown?.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.deptBreakdown} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={32}>
                <XAxis dataKey="_id" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<BarTooltip />} cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                  {stats.deptBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state h-48">
              <Users size={40} className="text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No department data yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3 — Salary distribution + Activity feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Salary distribution */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-800">Salary Distribution</h3>
              <p className="text-xs text-gray-400 mt-0.5">Annual CTC bands</p>
            </div>
            <span className="badge badge-purple">CTC Bands</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={SALARY_DIST} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barSize={28}>
              <XAxis dataKey="range" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: "#F1F5F9" }} contentStyle={{ borderRadius: 12, border: "1px solid #F1F5F9", fontSize: 12 }} />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="mb-4">
            <h3 className="font-bold text-gray-800">Recent Activity</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest HR events</p>
          </div>
          <div className="space-y-3">
            {ACTIVITY.map(({ icon: Icon, color, text, time }, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                  <Icon size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 leading-snug">{text}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4 — Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          {
            title: "Payroll Summary", icon: Wallet,
            items: [
              { label: "Total Gross",  value: fmt(stats?.totalGross),    color: "text-gray-800" },
              { label: "Total Net",    value: fmt(stats?.monthlyPayroll), color: "text-emerald-600 font-bold" },
              { label: "Slips Issued", value: stats?.processedPayrolls ?? 0, color: "text-blue-600" },
            ],
          },
          {
            title: "Workforce", icon: Users,
            items: [
              { label: "Total Staff", value: stats?.totalEmployees ?? 0,  color: "text-gray-800" },
              { label: "Active",      value: stats?.activeEmployees ?? 0,  color: "text-emerald-600 font-bold" },
              { label: "Inactive",    value: (stats?.totalEmployees ?? 0) - (stats?.activeEmployees ?? 0), color: "text-red-500" },
            ],
          },
          {
            title: "Leave Status", icon: TreePalm,
            items: [
              { label: "Pending",      value: stats?.pendingLeaves ?? 0, color: "text-amber-600 font-bold" },
              { label: "Departments",  value: stats?.deptBreakdown?.length ?? 0, color: "text-blue-600" },
              { label: "Attendance %", value: `${stats?.attendanceRate ?? 0}%`, color: "text-emerald-600 font-bold" },
            ],
          },
        ].map(({ title, icon: Icon, items }) => (
          <div key={title} className="card">
            <div className="flex items-center gap-2 mb-4">
              <Icon size={16} className="text-gray-500" />
              <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
            </div>
            <div className="space-y-3">
              {items.map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className={`text-sm ${color}`}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
