import { useState, useRef, useEffect } from "react";
import toast from "react-hot-toast";
import { authAPI } from "../api/client";
import {
  Building2, Mail, Lock, Eye, EyeOff, User,
  ArrowRight, Shield, Users, Briefcase, Loader2,
  KeyRound, RefreshCw, CheckCircle,
} from "lucide-react";

const FEATURES = [
  { icon: Users,     text: "Employee Management" },
  { icon: Shield,    text: "Attendance & Payroll" },
  { icon: Briefcase, text: "Recruitment (ATS)" },
  { icon: Building2, text: "Exit & F&F Settlement" },
];

/* ── 6-box OTP input ── */
function OtpInput({ value, onChange, disabled }) {
  const inputs = useRef([]);

  const handleKey = (i, e) => {
    if (e.key === "Backspace" && !e.target.value && i > 0) {
      inputs.current[i - 1]?.focus();
    }
  };

  const handleChange = (i, e) => {
    const val = e.target.value.replace(/\D/g, "").slice(-1);
    const arr = value.split("");
    arr[i] = val;
    const next = arr.join("").padEnd(6, "").slice(0, 6);
    onChange(next);
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      onChange(pasted);
      inputs.current[5]?.focus();
      e.preventDefault();
    }
  };

  return (
    <div className="flex gap-2 justify-center" onPaste={handlePaste}>
      {[...Array(6)].map((_, i) => (
        <input
          key={i}
          ref={(el) => (inputs.current[i] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKey(i, e)}
          className="w-11 h-12 text-center text-xl font-bold rounded-xl border-2 transition-all duration-150
                     border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800
                     text-gray-900 dark:text-white
                     focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                     disabled:opacity-50 disabled:cursor-not-allowed
                     shadow-sm"
        />
      ))}
    </div>
  );
}

export default function LoginPage({ onLogin }) {
  const [mode, setMode]         = useState("login");   // "login" | "signup"
  const [otpStep, setOtpStep]   = useState(false);     // false = email entry, true = otp entry
  const [form, setForm]         = useState({ name: "", email: "", password: "", role: "HR", department: "" });
  const [otpEmail, setOtpEmail] = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const [otp, setOtp]           = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Email/Password login or signup ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = mode === "login"
        ? await authAPI.login({ email: form.email, password: form.password })
        : await authAPI.signup(form);
      toast.success(`Welcome, ${data.user.name}!`);
      onLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Authentication failed");
    } finally { setLoading(false); }
  };

  /* ── Step 1: Send OTP ── */
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (!otpEmail.trim()) return toast.error("Enter your registered email");
    setLoading(true);
    try {
      const res = await authAPI.sendOtp({ email: otpEmail.trim() });
      setMaskedEmail(res.maskedEmail);
      setOtpStep(true);
      setCountdown(60);
      toast.success(`OTP sent to ${res.maskedEmail}`);
    } catch (err) {
      toast.error(err.response?.data?.error || "Failed to send OTP");
    } finally { setLoading(false); }
  };

  /* ── Step 2: Verify OTP ── */
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) return toast.error("Enter the complete 6-digit OTP");
    setLoading(true);
    try {
      const data = await authAPI.verifyOtp({ email: otpEmail.trim(), otp });
      toast.success(`Welcome, ${data.user.name}!`);
      onLogin(data.token, data.user);
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid OTP");
      setOtp("");
    } finally { setLoading(false); }
  };

  const resetOtp = () => { setOtpStep(false); setOtp(""); setOtpEmail(""); setMaskedEmail(""); };

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-col justify-between w-[44%] bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-blue-600/10 -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-blue-500/10 translate-y-1/2 -translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg">
            <Building2 size={20} className="text-white" />
          </div>
          <span className="text-white font-bold text-lg">HRMS Portal</span>
        </div>
        <div className="relative">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">
            Manage your<br />workforce smarter
          </h2>
          <p className="text-white/50 text-base mb-10">
            Complete HR solution for Indian businesses — payroll, attendance, leaves and more.
          </p>
          <div className="space-y-3">
            {FEATURES.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3 bg-white/8 rounded-xl px-4 py-3 border border-white/10">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 flex items-center justify-center">
                  <Icon size={15} className="text-blue-300" />
                </div>
                <span className="text-white/80 text-sm font-medium">{text}</span>
                <span className="ml-auto text-emerald-400 text-xs font-bold">✓</span>
              </div>
            ))}
          </div>
        </div>
        <p className="relative text-white/25 text-xs">© 2024 HRMS · India · FY 2024-25 · New Tax Regime</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-gray-950 p-6 transition-colors duration-200">
        <div className="w-full max-w-md">

          {/* Mobile brand */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-3 shadow-lg">
              <Building2 size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">HRMS Portal</h1>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 p-8">

            {/* ════════════════════════════════
                OTP FLOW (Employee login)
                ════════════════════════════════ */}
            {!otpStep ? (
              /* Step 1 — Enter email */
              <>
                <div className="mb-6">
                  <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mb-4">
                    <KeyRound size={20} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Login</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Enter your registered work email to receive an OTP
                  </p>
                </div>

                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="label">Work Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        className="input input-icon"
                        type="email"
                        placeholder="you@company.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1.5">
                      Must match the email registered by HR in the system
                    </p>
                  </div>

                  <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
                    {loading
                      ? <><Loader2 size={16} className="animate-spin" /> Sending OTP…</>
                      : <>Send OTP <ArrowRight size={16} /></>
                    }
                  </button>
                </form>

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">HR / Manager login</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                </div>

                {/* HR/Manager toggle */}
                <div className="flex rounded-xl bg-gray-100 dark:bg-gray-800 p-1 mb-4">
                  {[["login", "Sign In"], ["signup", "Sign Up"]].map(([m, label]) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all duration-200
                        ${mode === m
                          ? "bg-white dark:bg-gray-700 shadow-sm text-blue-700 dark:text-blue-400"
                          : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"}`}>
                      {label}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  {mode === "signup" && (
                    <>
                      <div>
                        <label className="label">Full Name</label>
                        <div className="relative">
                          <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input className="input input-icon" placeholder="John Doe"
                            value={form.name} onChange={set("name")} required />
                        </div>
                      </div>
                      <div>
                        <label className="label">Role</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[
                            { value: "HR",      label: "HR Manager", icon: Shield, desc: "Full access" },
                            { value: "Manager", label: "Manager",    icon: Users,  desc: "Dept. only" },
                          ].map(({ value, label, icon: Icon, desc }) => (
                            <button key={value} type="button"
                              onClick={() => setForm((f) => ({ ...f, role: value, department: "" }))}
                              className={`flex items-center gap-2 p-3 rounded-xl border-2 text-left transition-all
                                ${form.role === value
                                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30"
                                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300"}`}>
                              <Icon size={15} className={form.role === value ? "text-blue-600" : "text-gray-400"} />
                              <div>
                                <p className={`text-xs font-bold ${form.role === value ? "text-blue-700 dark:text-blue-400" : "text-gray-700 dark:text-gray-300"}`}>{label}</p>
                                <p className="text-[10px] text-gray-400">{desc}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                      {form.role === "Manager" && (
                        <div>
                          <label className="label">Department <span className="text-red-400">*</span></label>
                          <div className="relative">
                            <Briefcase size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input className="input input-icon"
                              placeholder="e.g. Engineering, Product, Design"
                              value={form.department}
                              onChange={set("department")}
                              required />
                          </div>
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            ⚠ You will only see employees in this department
                          </p>
                        </div>
                      )}
                    </>
                  )}
                  <div>
                    <label className="label">Email</label>
                    <div className="relative">
                      <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input className="input input-icon" type="email" placeholder="you@company.com"
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
                    className="btn-primary w-full justify-center py-2.5 text-sm">
                    {loading
                      ? <><Loader2 size={15} className="animate-spin" /> Please wait…</>
                      : <>{mode === "login" ? "Sign In" : "Create Account"} <ArrowRight size={15} /></>
                    }
                  </button>
                </form>
              </>
            ) : (
              /* ════════════════════════════════
                 Step 2 — Enter OTP
                 ════════════════════════════════ */
              <>
                <div className="mb-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center mx-auto mb-4">
                    <KeyRound size={24} className="text-blue-600 dark:text-blue-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Enter OTP</h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-2">
                    We sent a 6-digit code to
                  </p>
                  <p className="font-bold text-gray-800 dark:text-gray-200 text-sm mt-0.5">{maskedEmail}</p>
                </div>

                {/* OTP boxes */}
                <div className="mb-6">
                  <OtpInput value={otp} onChange={setOtp} disabled={loading} />
                </div>

                {/* Verify button */}
                <button
                  onClick={handleVerifyOtp}
                  disabled={loading || otp.length !== 6}
                  className="btn-primary w-full justify-center py-3 text-base mb-4">
                  {loading
                    ? <><Loader2 size={16} className="animate-spin" /> Verifying…</>
                    : <><CheckCircle size={16} /> Verify & Sign In</>
                  }
                </button>

                {/* Resend */}
                <div className="text-center">
                  {countdown > 0 ? (
                    <p className="text-sm text-gray-400 dark:text-gray-500">
                      Resend OTP in <span className="font-bold text-blue-600 dark:text-blue-400">{countdown}s</span>
                    </p>
                  ) : (
                    <button onClick={handleSendOtp} disabled={loading}
                      className="text-sm text-blue-600 dark:text-blue-400 font-semibold hover:underline flex items-center gap-1.5 mx-auto">
                      <RefreshCw size={13} /> Resend OTP
                    </button>
                  )}
                </div>

                {/* Back */}
                <button onClick={resetOtp}
                  className="w-full mt-4 text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition text-center">
                  ← Use a different email
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
