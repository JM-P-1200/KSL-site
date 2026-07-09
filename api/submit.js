const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(request, response) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const body = request.body || {};
  if (body.companySite) return response.status(200).json({ message: "Thanks. Your submission was received." });
  if (!EMAIL_PATTERN.test(String(body.email || ""))) return response.status(400).json({ error: "Enter a valid email address." });
  if (!["newsletter", "tool-submission"].includes(body.kind)) return response.status(400).json({ error: "Invalid submission." });
  if (body.kind === "tool-submission" && (!body.name || !body.toolName || !body.toolUrl || !body.message)) {
    return response.status(400).json({ error: "Complete all required fields." });
  }
  if (!process.env.RESEND_API_KEY || !process.env.SUBMISSION_EMAIL) {
    return response.status(503).json({ error: "Submissions are being configured. Please try again shortly." });
  }

  const subject = body.kind === "newsletter" ? "New KSL newsletter signup" : `KSL tool submission: ${body.toolName}`;
  const lines = body.kind === "newsletter"
    ? [`Email: ${body.email}`]
    : [`Name: ${body.name}`, `Email: ${body.email}`, `Tool: ${body.toolName}`, `URL: ${body.toolUrl}`, `Category: ${body.category}`, "", body.message];

  const resend = await fetch("https://api.resend.com/emails", {
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
  if (!resend.ok) return response.status(502).json({ error: "The message could not be delivered. Please try again." });
  return response.status(200).json({ message: body.kind === "newsletter" ? "You’re on the list. Welcome to KSL." : "Thanks—your tool is in the review queue." });
}
