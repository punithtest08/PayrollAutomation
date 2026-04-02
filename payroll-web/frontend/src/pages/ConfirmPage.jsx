import { useEffect, useState } from "react";
import { empAPI } from "../api/client";

// Reads ?token=&empId=&action= from URL
function useQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    token:  params.get("token"),
    empId:  params.get("empId"),
    action: params.get("action"),
  };
}

export default function ConfirmPage() {
  const { token, empId, action } = useQueryParams();
  const [state, setState]   = useState("loading"); // loading | confirm-form | success | error
  const [result, setResult] = useState(null);
  const [error, setError]   = useState("");
  const [note, setNote]     = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token || !empId || !action) {
      setError("Invalid confirmation link. Please check your email.");
      setState("error");
      return;
    }
    // If action is dispute, show a note form first
    if (action === "dispute") { setState("confirm-form"); return; }
    // If action is confirm, submit immediately
    handleConfirm();
  }, []);

  const handleConfirm = async (disputeNote = "") => {
    setSubmitting(true);
    try {
      const data = await empAPI.confirmOffer({ token, empId, action, note: disputeNote });
      setResult(data);
      setState("success");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong. The link may have expired.");
      setState("error");
    } finally { setSubmitting(false); }
  };

  /* ── Loading ── */
  if (state === "loading") return (
    <Screen>
      <div className="text-center">
        <div className="w-16 h-16 rounded-full border-4 border-[#2E86AB] border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-gray-600 font-medium">Processing your confirmation…</p>
      </div>
    </Screen>
  );

  /* ── Dispute note form ── */
  if (state === "confirm-form") return (
    <Screen>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900">Raise a Dispute</h2>
          <p className="text-gray-500 text-sm mt-2">Please describe what is incorrect in your offer details</p>
        </div>
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 space-y-4">
          <div>
            <label className="label">What is incorrect?</label>
            <textarea
              className="input resize-none"
              rows={4}
              placeholder="e.g. My designation should be Senior Engineer, not Engineer. My salary should be ₹60,000 not ₹50,000."
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button
            disabled={!note.trim() || submitting}
            onClick={() => handleConfirm(note)}
            className="w-full py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
            {submitting ? "Submitting…" : "Submit Dispute"}
          </button>
          <button onClick={() => window.history.back()}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-600 font-semibold text-sm hover:bg-gray-200 transition">
            ← Go Back
          </button>
        </div>
      </div>
    </Screen>
  );

  /* ── Error ── */
  if (state === "error") return (
    <Screen>
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl mx-auto mb-4">❌</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Link Expired or Invalid</h2>
        <p className="text-gray-500 text-sm mb-6">{error}</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Please contact your HR team to resend the confirmation email.
        </div>
      </div>
    </Screen>
  );

  /* ── Success ── */
  const emp = result?.employee;
  const isConfirmed = result?.action === "confirm";

  return (
    <Screen>
      <div className="w-full max-w-md">
        {/* Status icon */}
        <div className="text-center mb-6">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center text-4xl mx-auto mb-4 shadow-lg
            ${isConfirmed ? "bg-emerald-100" : "bg-amber-100"}`}>
            {isConfirmed ? "✅" : "⚠️"}
          </div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isConfirmed ? "Details Confirmed!" : "Dispute Submitted!"}
          </h2>
          <p className="text-gray-500 text-sm mt-2">
            {isConfirmed
              ? "Thank you for confirming your employment details."
              : "Your dispute has been recorded. HR will contact you shortly."}
          </p>
        </div>

        {/* Details card */}
        {emp && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-[#1F4E79] to-[#2E86AB] px-6 py-4">
              <p className="text-white font-bold text-lg">{emp.name}</p>
              <p className="text-white/70 text-sm">{emp.position} · {emp.department}</p>
            </div>
            <div className="p-5 space-y-3">
              {[
                ["Employee ID",    emp.empId],
                ["Designation",    emp.position],
                ["Department",     emp.department],
                ["Date of Joining",emp.doj ? new Date(emp.doj).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-gray-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-semibold text-gray-800">{value}</span>
                </div>
              ))}
              <div className="pt-2">
                <span className={`badge ${isConfirmed ? "badge-green" : "badge-yellow"} text-sm`}>
                  {isConfirmed ? "✅ Confirmed" : "⏳ Dispute Under Review"}
                </span>
              </div>
            </div>
          </div>
        )}

        <p className="text-center text-gray-400 text-xs mt-6">
          © {new Date().getFullYear()} HRMS Portal · You may close this window.
        </p>
      </div>
    </Screen>
  );
}

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-blue-50 flex items-center justify-center p-6">
      {children}
    </div>
  );
}
