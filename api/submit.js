const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validWebsite(value) {
  if (typeof value !== "string" || value.length > 500) return false;
  try {
    return ["http:", "https:"].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const body = request.body || {};
  if (body.companySite) return response.status(200).json({ message: "Thanks. Your submission was received." });
  if (!EMAIL_PATTERN.test(String(body.email || ""))) return response.status(400).json({ error: "Enter a valid email address." });
  if (!["newsletter", "tool-submission", "service-inquiry"].includes(body.kind)) return response.status(400).json({ error: "Invalid submission." });
  if (body.kind === "tool-submission" && (!body.name || !body.toolName || !body.toolUrl || !body.message)) {
    return response.status(400).json({ error: "Complete all required fields." });
  }
  if (body.kind === "service-inquiry") {
    const allowed = ["repair", "setup", "care"];
    const valid = (value, max) => typeof value === "string" && value.trim().length > 0 && value.length <= max;
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
