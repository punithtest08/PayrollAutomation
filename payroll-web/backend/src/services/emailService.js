const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

async function sendOfferConfirmationEmail(emp, confirmUrl, disputeUrl) {
  const doj    = new Date(emp.doj).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const salary = `₹${Number(emp.salary).toLocaleString("en-IN")}`;

  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .hdr{background:linear-gradient(135deg,#1F4E79,#2E86AB);padding:36px 40px;text-align:center;}
  .hdr h1{color:#fff;margin:0;font-size:22px;font-weight:700;}
  .hdr p{color:rgba(255,255,255,0.75);margin:6px 0 0;font-size:14px;}
  .body{padding:36px 40px;}
  .greeting{font-size:18px;font-weight:700;color:#1A202C;margin-bottom:8px;}
  .intro{color:#64748B;font-size:14px;line-height:1.6;margin-bottom:28px;}
  .ref{display:inline-block;background:#EFF6FF;color:#1D4ED8;font-size:12px;font-weight:700;padding:4px 12px;border-radius:999px;margin-bottom:20px;}
  .box{background:#F8FAFC;border:1.5px solid #E2E8F0;border-radius:12px;padding:24px;margin-bottom:28px;}
  .box h3{margin:0 0 16px;font-size:12px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:.06em;}
  .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #F1F5F9;font-size:14px;}
  .row:last-child{border-bottom:none;}
  .lbl{color:#64748B;} .val{font-weight:700;color:#1A202C;}
  .note{background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px 16px;font-size:13px;color:#92400E;line-height:1.5;margin-bottom:24px;}
  .actions{display:flex;gap:12px;margin-bottom:28px;}
  .btn-c{flex:1;background:linear-gradient(135deg,#10B981,#059669);color:#fff;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:15px;display:block;}
  .btn-d{flex:1;background:#FEF2F2;color:#DC2626;border:1.5px solid #FECACA;text-decoration:none;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:15px;display:block;}
  .footer{background:#F8FAFC;padding:20px 40px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #F1F5F9;}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>💼 Offer Letter Confirmation</h1>
    <p>Please review and confirm your employment details</p>
  </div>
  <div class="body">
    <p class="greeting">Dear ${emp.name},</p>
    <p class="intro">Welcome to the team! Please review your employment details carefully and confirm they match your offer letter.</p>
    ${emp.offerLetter ? `<span class="ref">📄 Offer Ref: ${emp.offerLetter}</span>` : ""}
    <div class="box">
      <h3>Your Employment Details</h3>
      <div class="row"><span class="lbl">Employee ID</span>    <span class="val">${emp.empId}</span></div>
      <div class="row"><span class="lbl">Full Name</span>      <span class="val">${emp.name}</span></div>
      <div class="row"><span class="lbl">Designation</span>    <span class="val">${emp.position}</span></div>
      <div class="row"><span class="lbl">Department</span>     <span class="val">${emp.department}</span></div>
      <div class="row"><span class="lbl">Date of Joining</span><span class="val">${doj}</span></div>
      <div class="row"><span class="lbl">Basic Salary</span>   <span class="val">${salary} / month</span></div>
      <div class="row"><span class="lbl">Work Email</span>     <span class="val">${emp.email}</span></div>
      ${emp.phone ? `<div class="row"><span class="lbl">Phone</span><span class="val">${emp.phone}</span></div>` : ""}
    </div>
    <div class="note">⚠️ This link is valid for <strong>72 hours</strong>. Confirm if details are correct, or raise a dispute if anything is wrong.</div>
    <div class="actions">
      <a href="${confirmUrl}" class="btn-c">✓ Confirm Details</a>
      <a href="${disputeUrl}" class="btn-d">✗ Raise a Dispute</a>
    </div>
    <p style="font-size:12px;color:#94A3B8;">If buttons don't work, copy: <a href="${confirmUrl}" style="color:#2E86AB;">${confirmUrl}</a></p>
  </div>
  <div class="footer">© ${new Date().getFullYear()} HRMS Portal · Automated email, do not reply.</div>
</div>
</body></html>`;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || "HRMS Portal"}" <${process.env.SMTP_USER}>`,
    to: emp.email,
    subject: `[Action Required] Confirm Your Offer Details — ${emp.empId}`,
    html,
  });
}

module.exports = { sendOfferConfirmationEmail, sendOtpEmail, sendRecruitmentEmail };

/* ── Recruitment stage emails ── */
async function sendRecruitmentEmail(to, subject, htmlBody) {
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || "HRMS Recruitment"}" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html: wrapEmail(htmlBody),
  });
}

function wrapEmail(body) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .wrap{max-width:600px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .hdr{background:linear-gradient(135deg,#6D28D9,#4F46E5);padding:32px 40px;text-align:center;}
  .hdr h1{color:#fff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.3px;}
  .hdr p{color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;}
  .body{padding:36px 40px;font-size:14px;color:#374151;line-height:1.7;}
  .footer{background:#F8FAFC;padding:16px 40px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #F1F5F9;}
</style></head><body>
<div class="wrap">
  <div class="hdr"><h1>🏢 HRMS Recruitment</h1><p>Hiring Team · Confidential</p></div>
  <div class="body">${body}</div>
  <div class="footer">© ${new Date().getFullYear()} HRMS Portal · This is an automated recruitment email.</div>
</div></body></html>`;
}

async function sendOtpEmail(email, name, otp) {
  const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{margin:0;padding:0;background:#F0F4F8;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;}
  .wrap{max-width:480px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);}
  .hdr{background:linear-gradient(135deg,#1e40af,#2563eb);padding:32px 40px;text-align:center;}
  .hdr h1{color:#fff;margin:0;font-size:20px;font-weight:700;}
  .hdr p{color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:13px;}
  .body{padding:36px 40px;text-align:center;}
  .greeting{font-size:16px;font-weight:600;color:#1A202C;margin-bottom:6px;}
  .sub{color:#64748B;font-size:13px;margin-bottom:28px;}
  .otp-box{display:inline-block;background:#EFF6FF;border:2px dashed #93C5FD;border-radius:16px;padding:20px 40px;margin-bottom:24px;}
  .otp{font-size:42px;font-weight:800;letter-spacing:12px;color:#1D4ED8;font-family:monospace;}
  .expiry{font-size:12px;color:#94A3B8;margin-bottom:24px;}
  .warn{background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:12px 16px;font-size:12px;color:#92400E;}
  .footer{background:#F8FAFC;padding:16px 40px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #F1F5F9;}
</style></head><body>
<div class="wrap">
  <div class="hdr">
    <h1>🔐 Login OTP</h1>
    <p>HRMS Portal · One-Time Password</p>
  </div>
  <div class="body">
    <p class="greeting">Hi ${name},</p>
    <p class="sub">Use the OTP below to sign in to your HRMS account.</p>
    <div class="otp-box"><div class="otp">${otp}</div></div>
    <p class="expiry">⏱ This OTP expires in <strong>10 minutes</strong></p>
    <div class="warn">🔒 Never share this OTP with anyone. HRMS will never ask for it.</div>
  </div>
  <div class="footer">© ${new Date().getFullYear()} HRMS Portal · If you didn't request this, ignore this email.</div>
</div>
</body></html>`;

  await transporter.sendMail({
    from: `"${process.env.FROM_NAME || "HRMS Portal"}" <${process.env.SMTP_USER}>`,
    to:   email,
    subject: `${otp} — Your HRMS Login OTP`,
    html,
  });
}
