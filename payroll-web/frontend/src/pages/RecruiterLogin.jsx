import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { authAPI } from "../api/client";
import { Briefcase, Mail, Lock, Eye, EyeOff, User, ArrowRight, Loader2, UserPlus } from "lucide-react";

export default function RecruiterLogin({ onLogin }) {
  const [mode, setMode]         = useState("login");
  const [form, setForm]         = useState({ name: "", email: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = mode === "login"
        ? await authAPI.login({ email: form.email, password: form.password })
        : await authAPI.signup({ ...form, role: "Recruiter" });

      if (!["Recruiter", "HR"].includes(data.user.role)) {
        toast.error("This portal is for Recruiters only. Use the main login.");
        return;
      }
      toast.success(`Welcome, ${data.user.name}!`);
      onLogin(data.token, data.user);
      navigate("/recruitment");
    } catch (err) {
      toast.error(err.response?.data?.error || "Authentication failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-gradient-to-br from-violet-900 via-purple-900 to-indigo-900 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-purple-500/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-500/10 translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500 flex items-center justify-center shadow-lg">
            <Briefcase size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Recruitment Portal</p>
            <p className="text-purple-300 text-xs">HRMS · ATS</p>
          </div>
        </div>

        <div className="relative space-y-8">
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight mb-4">
              Hire smarter,<br />faster, better
            </h2>
            <p className="text-purple-200/60 text-base">
              Your dedicated ATS workspace — manage jobs, track candidates, and schedule interviews all in one place.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: "📋", label: "Post & manage job openings" },
              { icon: "👥", label: "Track candidates across pipeline stages" },
              { icon: "📅", label: "Schedule and manage interviews" },
              { icon: "📊", label: "Recruitment analytics & tracker" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-3 bg-white/8 rounded-xl px-4 py-3 border border-white/10">
                <span className="text-lg">{icon}</span>
                <span className="text-white/80 text-sm font-medium">{label}</span>
                <span className="ml-auto text-purple-300 text-xs font-bold">✓</span>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-purple-300/30 text-xs">© 2024 HRMS · Recruitment Portal · Separate access</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6">
        <div className="w-full max-w-md">
          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-purple-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Briefcase size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recruitment Portal</h1>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="w-11 h-11 rounded-xl bg-purple-50 dark:bg-purple-900/30 flex items-center justify-center mb-4">
                <Briefcase size={20} className="text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {mode === "login" ? "Recruiter Sign In" : "Create Recruiter Account"}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                {mode === "login" ? "Access your recruitment workspace" : "Set up your recruiter account"}
              </p>
            </div>

            {/* Mode toggle */}
            <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-6">
              {[["login", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                    ${mode === m
                      ? "bg-white dark:bg-gray-700 shadow-sm text-purple-700 dark:text-purple-400"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                  {label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="label">Full Name</label>
                  <div className="relative">
                    <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input className="input input-icon" placeholder="Jane Recruiter"
                      value={form.name} onChange={set("name")} required />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Email Address</label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input input-icon" type="email" placeholder="recruiter@company.com"
                    value={form.email} onChange={set("email")} required />
                </div>
              </div>

              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input className="input input-icon pr-12"
                    type={showPass ? "text" : "password"} placeholder="••••••••"
                    value={form.password} onChange={set("password")} required />
                  <button type="button" onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-4 py-3 rounded-xl font-semibold text-base shadow-sm hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {loading
                  ? <><Loader2 size={16} className="animate-spin" /> Please wait…</>
                  : <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight size={16} /></>
                }
              </button>
            </form>

            {/* Back to main login */}
            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-800 text-center">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Not a recruiter?{" "}
                <a href="/login" className="text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                  Go to HR / Manager login →
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
