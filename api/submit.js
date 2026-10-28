import { clientIp, createSubmissionLimiter, inspectRequest } from "../lib/submission-guard.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const reserve = createSubmissionLimiter();
const valid = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;

function validWebsite(value) {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  response.setHeader("Cache-Control", "no-store");
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed." });
  }
  const rejected = inspectRequest(request);
  if (rejected) return response.status(rejected.status).json({ error: rejected.error });
  const body = request.body || {};
  if (body.companySite) return response.status(200).json({ message: "Thanks. Your submission was received." });
  if (!valid(body.email, 254) || !EMAIL_PATTERN.test(body.email)) return response.status(400).json({ error: "Enter a valid email address." });
  if (!["newsletter", "tool-submission", "service-inquiry"].includes(body.kind)) return response.status(400).json({ error: "Invalid submission." });
  if (body.kind === "tool-submission" && (!valid(body.name, 120) || !valid(body.toolName, 120) || !validWebsite(body.toolUrl) || !valid(body.message, 4000) || (body.category && body.category.length > 80))) {
    return response.status(400).json({ error: "Complete all required fields." });
  }
  if (body.kind === "service-inquiry") {
    const allowed = ["repair", "setup", "care"];
    if (!valid(body.name, 120) || !allowed.includes(body.service) || !valid(body.message, 4000) || body.message.trim().length < 15 || body.consent !== "yes") {
      return response.status(400).json({ error: "Please complete the required inquiry fields." });
    }
    if ((body.phone && String(body.phone).length > 50) || (body.website && !validWebsite(body.website)) || (body.timeline && !["flexible","soon","month","planning"].includes(body.timeline))) {
      return response.status(400).json({ error: "Please check your contact details." });
    }
  }
  if (!process.env.RESEND_API_KEY || !process.env.SUBMISSION_EMAIL) {
    return response.status(503).json({ error: "Submissions are being configured. Please try again shortly." });
  }

  const limit = reserve({ ip: clientIp(request), email: body.email });
  if (!limit.allowed) {
    response.setHeader("Retry-After", String(limit.retryAfter));
    return response.status(429).json({ error: "Too many submissions. Please wait a few minutes before trying again." });
  }

  const subject = body.kind === "newsletter" ? "New KSL newsletter signup" : body.kind === "service-inquiry" ? `KSL service inquiry: ${body.service}` : `KSL tool submission: ${body.toolName}`;
  const clean = (v, max = 4000) => String(v || "").slice(0, max).replace(/[\r\n]+/g, " ");
  const lines = body.kind === "newsletter"
    ? [`Email: ${clean(body.email)}`]
    : body.kind === "service-inquiry"
      ? [`Name: ${clean(body.name)}`, `Email: ${clean(body.email)}`, `Phone: ${clean(body.phone)}`, `Service: ${clean(body.service)}`, `Website: ${clean(body.website)}`, `Timeline: ${clean(body.timeline)}`, "", String(body.message).slice(0, 4000)]
      : [`Name: ${body.name}`, `Email: ${body.email}`, `Tool: ${body.toolName}`, `URL: ${body.toolUrl}`, `Category: ${body.category}`, "", body.message];

  let resend;
  try {
    resend = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.SUBMISSION_FROM || "KSL Website <onboarding@resend.dev>",
        to: [process.env.SUBMISSION_EMAIL],
        reply_to: body.email,
        subject,
        text: lines.join("\n")
      })
    });
  } catch {
    console.error("Submission email request failed", { kind: body.kind });
    return response.status(502).json({ error: "The message could not be sent. Please try again." });
  }
  if (!resend.ok) {
    console.error("Submission email rejected", { kind: body.kind, status: resend.status });
    return response.status(502).json({ error: "The message could not be sent. Please try again." });
  }
  const delivery = await resend.json().catch(() => ({}));
  console.info("Submission email accepted", { kind: body.kind, emailId: delivery.id || null });
  return response.status(200).json({ message: body.kind === "newsletter" ? "You’re on the list. Welcome to KSL." : body.kind === "service-inquiry" ? "Thanks! Your inquiry has been sent. We’ll review it and get back to you." : "Thanks—your tool is in the review queue." });
}
