function getClient() {
  const key = process.env.GROQ_API_KEY;
  if (!key || key === "your_groq_api_key_here") return null;
  const Groq = require("groq-sdk");
  return new Groq({ apiKey: key });
}

const STAGE_PROMPTS = {
  Shortlisted: (c, job) => `
You are an HR recruiter writing a professional, warm shortlisting email.
Candidate: ${c.name}
Role: ${job.title} (${job.department} department)
Company: HRMS Corp

Write a congratulatory email informing ${c.name} that their resume has been shortlisted for the ${job.title} role.
- Tone: warm, professional, encouraging
- Mention the role and department
- Say the team was impressed with their profile
- Mention next steps (interview scheduling)
- Keep it concise (3-4 short paragraphs)
- Do NOT include subject line, just the email body HTML (use <p> tags)
`,

  Interview: (c, job, interview) => `
You are an HR recruiter writing an interview invitation email.
Candidate: ${c.name}
Role: ${job.title} (${job.department} department)
Interview Date: ${interview?.date || "TBD"}
Interview Time: ${interview?.time || "TBD"}
Mode: ${interview?.mode || "Video Call"}
Interviewer: ${interview?.interviewer || "Our team"}
Notes: ${interview?.notes || ""}

Write a professional interview invitation email to ${c.name}.
- Confirm the interview details clearly
- Mention what to prepare
- Provide a warm, encouraging tone
- Keep it concise (3-4 paragraphs)
- Do NOT include subject line, just the email body HTML (use <p> tags)
`,

  Selected: (c, job) => `
You are an HR recruiter writing a job offer / selection congratulations email.
Candidate: ${c.name}
Role: ${job.title} (${job.department} department)

Write a warm congratulations email informing ${c.name} they have been selected for the ${job.title} role.
- Express genuine excitement about them joining
- Mention HR will follow up with formal offer letter
- Keep it uplifting and professional
- 3-4 paragraphs
- Do NOT include subject line, just the email body HTML (use <p> tags)
`,

  Rejected: (c, job) => `
You are an HR recruiter writing a respectful rejection email.
Candidate: ${c.name}
Role: ${job.title} (${job.department} department)

Write a kind, respectful rejection email to ${c.name}.
- Thank them for their time and interest
- Mention the role was competitive
- Encourage them to apply for future openings
- Keep it brief, empathetic, and professional
- 2-3 paragraphs
- Do NOT include subject line, just the email body HTML (use <p> tags)
`,
};

const STAGE_SUBJECTS = {
  Shortlisted: (name, role) => `🎉 Congratulations ${name} — Your Resume Has Been Shortlisted for ${role}`,
  Interview:   (name, role) => `📅 Interview Invitation — ${role} at HRMS Corp`,
  Selected:    (name, role) => `🎊 Offer — You've Been Selected for ${role}!`,
  Rejected:    (name, role) => `Your Application for ${role} — Update`,
};

/**
 * Generate AI email draft for a recruitment stage
 * @param {string} stage - Shortlisted | Interview | Selected | Rejected
 * @param {object} candidate - { name, email }
 * @param {object} job - { title, department }
 * @param {object} interview - interview details (for Interview stage)
 * @returns {{ subject, body }}
 */
async function generateEmailDraft(stage, candidate, job, interview = null) {
  const promptFn = STAGE_PROMPTS[stage];
  if (!promptFn) throw new Error(`No email template for stage: ${stage}`);

  const prompt = promptFn(candidate, job, interview);
  const client = getClient();

  if (!client) {
    return {
      subject: STAGE_SUBJECTS[stage]?.(candidate.name, job.title) || `Update on your application`,
      body:    getFallbackBody(stage, candidate, job, interview),
    };
  }

  const completion = await client.chat.completions.create({
    model:       "llama-3.3-70b-versatile",
    max_tokens:  600,
    temperature: 0.7,
    messages: [
      { role: "system", content: "You are a professional HR recruiter. Write concise, warm, professional recruitment emails in HTML format using <p> tags only." },
      { role: "user",   content: prompt },
    ],
  });

  const body = completion.choices[0].message.content.trim();
  const subject = STAGE_SUBJECTS[stage]?.(candidate.name, job.title) || `Update on your application for ${job.title}`;

  return { subject, body };
}

function getFallbackBody(stage, candidate, job, interview) {
  const name = candidate.name;
  const role = job.title;
  const dept = job.department;

  if (stage === "Shortlisted") return `
<p>Dear ${name},</p>
<p>Congratulations! We are thrilled to inform you that your resume has been <strong>shortlisted</strong> for the <strong>${role}</strong> position in our <strong>${dept}</strong> department.</p>
<p>Our team was genuinely impressed with your profile and experience. You stood out among a competitive pool of applicants, and we believe you could be a great fit for our team.</p>
<p>Our recruitment team will be in touch shortly to schedule an interview. In the meantime, feel free to reach out if you have any questions.</p>
<p>We look forward to speaking with you!</p>
<p>Warm regards,<br/><strong>HRMS Recruitment Team</strong></p>`;

  if (stage === "Interview") return `
<p>Dear ${name},</p>
<p>We are pleased to invite you for an interview for the <strong>${role}</strong> position.</p>
<p><strong>Interview Details:</strong><br/>
📅 Date: ${interview?.date || "TBD"}<br/>
⏰ Time: ${interview?.time || "TBD"}<br/>
📍 Mode: ${interview?.mode || "Video Call"}<br/>
👤 Interviewer: ${interview?.interviewer || "Our Hiring Team"}</p>
<p>${interview?.notes ? `<em>Note: ${interview.notes}</em>` : "Please come prepared to discuss your experience and how it aligns with the role."}</p>
<p>We look forward to meeting you. Please confirm your availability by replying to this email.</p>
<p>Best regards,<br/><strong>HRMS Recruitment Team</strong></p>`;

  if (stage === "Selected") return `
<p>Dear ${name},</p>
<p>🎊 Congratulations! We are absolutely delighted to inform you that you have been <strong>selected</strong> for the <strong>${role}</strong> role at HRMS Corp!</p>
<p>Your performance throughout the interview process was outstanding, and the entire team is excited about the prospect of you joining us.</p>
<p>Our HR team will reach out to you shortly with the formal offer letter and onboarding details. Please do not hesitate to reach out if you have any questions in the meantime.</p>
<p>Welcome to the team!</p>
<p>Warm regards,<br/><strong>HRMS Recruitment Team</strong></p>`;

  if (stage === "Rejected") return `
<p>Dear ${name},</p>
<p>Thank you for taking the time to apply for the <strong>${role}</strong> position and for your interest in joining our team.</p>
<p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current requirements. This was a very competitive process, and we appreciate the effort you put into your application.</p>
<p>We encourage you to keep an eye on our future openings, as we would love to consider you for roles that may be a better fit. We wish you all the best in your career journey.</p>
<p>Kind regards,<br/><strong>HRMS Recruitment Team</strong></p>`;

  return `<p>Dear ${name},</p><p>Thank you for your interest in the ${role} position.</p><p>Best regards,<br/>HRMS Recruitment Team</p>`;
}

/**
 * Generate AI job description
 * @param {{ title, department, location, type, openings }} jobDetails
 * @returns {{ description, skills }}
 */
async function generateJD({ title, department, location, type, openings }) {
  const client = getClient();

  if (!client) return getFallbackJD({ title, department, type });

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    max_tokens: 600,
    temperature: 0.7,
    messages: [
      {
        role: "system",
        content: "You are an expert HR professional. Return ONLY a valid JSON object with two keys: \"description\" (a concise 3-4 sentence job description as plain text) and \"skills\" (an array of 5-8 relevant skill strings). No markdown, no explanation.",
      },
      {
        role: "user",
        content: `Generate a job description for: Title: ${title}, Department: ${department}, Location: ${location || "Remote"}, Type: ${type || "Full-time"}, Openings: ${openings || 1}`,
      },
    ],
  });

  try {
    return JSON.parse(completion.choices[0].message.content.trim());
  } catch {
    return getFallbackJD({ title, department, type });
  }
}

function getFallbackJD({ title, department, type }) {
  return {
    description: `We are looking for a talented ${title} to join our ${department} team. The ideal candidate will bring strong technical expertise, a collaborative mindset, and a passion for delivering high-quality work. This is a ${type || "Full-time"} role offering an exciting opportunity to make a meaningful impact.`,
    skills: ["Communication", "Problem Solving", "Teamwork", "Attention to Detail"],
  };
}

module.exports = { generateEmailDraft, generateJD };
