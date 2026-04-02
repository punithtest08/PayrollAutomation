import { NavLink, useNavigate } from "react-router-dom";
import { Briefcase, LayoutDashboard, Users, Calendar, BarChart2, LogOut, ChevronRight } from "lucide-react";

const NAV = [
  { to: "/recruitment",            label: "Dashboard",   icon: LayoutDashboard, desc: "Overview & stats",   exact: true },
  { to: "/recruitment/jobs",       label: "Job Openings", icon: Briefcase,       desc: "Manage positions" },
  { to: "/recruitment/candidates", label: "Candidates",   icon: Users,           desc: "All applicants" },
  { to: "/recruitment/pipeline",   label: "Pipeline",     icon: BarChart2,       desc: "Stage tracker" },
  { to: "/recruitment/interviews", label: "Interviews",   icon: Calendar,        desc: "Scheduled sessions" },
];

export default function RecruiterSidebar({ user, onLogout }) {
  const navigate  = useNavigate();
  const initials  = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);
  const handleLogout = () => { onLogout(); navigate("/recruit/login"); };

  return (
    <aside className="w-64 min-h-screen flex flex-col shrink-0 shadow-xl transition-colors duration-200
                      bg-white border-r border-gray-100 dark:bg-gray-900 dark:border-gray-800">
      {/* Brand */}
      <div className="px-5 py-5 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-600 flex items-center justify-center shadow-lg">
            <Briefcase size={17} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight text-gray-900 dark:text-white">Recruitment Portal</p>
            <p className="text-[11px] text-gray-400 dark:text-gray-500">ATS · Hiring Tracker</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-widest px-3 pb-2 text-gray-400 dark:text-gray-600">
          Recruitment
        </p>
        {NAV.map(({ to, label, icon: Icon, desc, exact }) => (
          <NavLink key={to} to={to} end={exact}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? "bg-purple-600 text-white shadow-md shadow-purple-200 dark:shadow-purple-900/50"
                : "text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              }`
            }>
            {({ isActive }) => (
              <>
                <Icon size={17} className={`shrink-0 ${isActive ? "text-white" : "text-gray-400 group-hover:text-gray-600 dark:text-gray-500 dark:group-hover:text-gray-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="leading-tight truncate">{label}</p>
                  <p className={`text-[10px] leading-tight truncate ${isActive ? "text-white/70" : "text-gray-400 dark:text-gray-600"}`}>{desc}</p>
                </div>
                {isActive && <ChevronRight size={14} className="text-white/60 shrink-0" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2 bg-gray-50 dark:bg-gray-800">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold truncate text-gray-900 dark:text-gray-100">{user?.name}</p>
            <p className="text-[10px] truncate text-purple-500 dark:text-purple-400 font-medium">Recruiter</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
        </div>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all
                     text-gray-400 hover:text-red-500 hover:bg-red-50 dark:text-gray-500 dark:hover:text-red-400 dark:hover:bg-red-900/20">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </aside>
  );
}
