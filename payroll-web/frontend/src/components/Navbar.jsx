import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, ChevronDown, User, Settings, LogOut, X, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const NOTIFICATIONS = [
  { id: 1, text: "Rahul Sharma applied for Sick Leave",    time: "5m ago",  dot: "bg-amber-400",   unread: true  },
  { id: 2, text: "Payroll for June 2025 processed",        time: "1h ago",  dot: "bg-blue-400",    unread: true  },
  { id: 3, text: "Priya Nair's exit request approved",     time: "3h ago",  dot: "bg-emerald-400", unread: false },
  { id: 4, text: "New candidate shortlisted for SDE-II",   time: "1d ago",  dot: "bg-purple-400",  unread: false },
];

export default function Navbar({ user, onLogout }) {
  const [search, setSearch]       = useState("");
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser]   = useState(false);
  const notifRef = useRef(null);
  const userRef  = useRef(null);
  const navigate = useNavigate();
  const { dark, toggle } = useTheme();

  const unread = NOTIFICATIONS.filter((n) => n.unread).length;

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target))  setShowUser(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initials = user?.name?.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center px-5 gap-4 sticky top-0 z-30 shadow-sm transition-colors duration-200">

      {/* Search */}
      <div className="relative flex-1 max-w-sm">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
        <input
          className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl pl-9 pr-9 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition"
          placeholder="Search employees, payroll…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <X size={13} />
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 ml-auto">

        {/* Theme toggle */}
        <button
          onClick={toggle}
          title={dark ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200
                     text-gray-500 hover:bg-gray-100 hover:text-gray-700
                     dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-yellow-300">
          {dark
            ? <Sun size={17} className="transition-transform duration-300 rotate-0 hover:rotate-12" />
            : <Moon size={17} className="transition-transform duration-300" />
          }
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setShowNotif((s) => !s); setShowUser(false); }}
            className="relative w-9 h-9 rounded-xl flex items-center justify-center transition
                       text-gray-500 hover:bg-gray-100 hover:text-gray-700
                       dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200">
            <Bell size={18} />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-900" />
            )}
          </button>

          {showNotif && (
            <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-[fadeIn_0.15s_ease]">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">Notifications</p>
                {unread > 0 && (
                  <span className="text-xs bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 font-bold px-2 py-0.5 rounded-full">
                    {unread} new
                  </span>
                )}
              </div>
              <div className="max-h-72 overflow-y-auto">
                {NOTIFICATIONS.map((n) => (
                  <div key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 cursor-pointer transition
                      hover:bg-gray-50 dark:hover:bg-gray-800
                      ${n.unread ? "bg-blue-50/40 dark:bg-blue-900/10" : ""}`}>
                    <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{n.text}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{n.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5 border-t border-gray-100 dark:border-gray-800 text-center">
                <button className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  View all notifications
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User dropdown */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => { setShowUser((s) => !s); setShowNotif(false); }}
            className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition
                       hover:bg-gray-100 dark:hover:bg-gray-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight">
                {user?.role === "HR" ? "HR Manager" : "Manager"}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400 dark:text-gray-500 hidden sm:block" />
          </button>

          {showUser && (
            <div className="absolute right-0 top-11 w-52 bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden z-50 animate-[fadeIn_0.15s_ease]">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
                <p className="font-bold text-gray-900 dark:text-gray-100 text-sm">{user?.name}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500">{user?.email}</p>
              </div>
              {[
                { icon: User,     label: "My Profile", action: () => navigate("/portal") },
                { icon: Settings, label: "Settings",   action: () => {} },
              ].map(({ icon: Icon, label, action }) => (
                <button key={label} onClick={() => { action(); setShowUser(false); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition
                             text-gray-600 hover:bg-gray-50 hover:text-gray-900
                             dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100">
                  <Icon size={15} className="text-gray-400 dark:text-gray-500" /> {label}
                </button>
              ))}
              <div className="border-t border-gray-100 dark:border-gray-800">
                <button onClick={() => { onLogout(); navigate("/login"); }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm transition
                             text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
