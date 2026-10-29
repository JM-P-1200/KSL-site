import { randomUUID } from "node:crypto";
import {
  clientIp,
  createSubmissionDeduper,
  createSubmissionLimiter,
  inspectRequest
} from "../lib/submission-guard.js";

const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{1,189}\.[^\s@]{2,63}$/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const HEADER_CONTROL_PATTERN = /[\r\n\u0000-\u001F\u007F]/;
const SERVICES = new Set(["repair", "setup", "care"]);
const TIMELINES = new Set(["flexible", "soon", "month", "planning"]);
const TOOL_CATEGORIES = new Set(["AI app builder", "Website builder", "No-code app", "AI design", "E-commerce", "Other"]);
const SUCCESS = {
  newsletter: "You’re on the list. Welcome to KSL.",
  "service-inquiry": "Thanks! Your inquiry has been sent. We’ll review it and get back to you.",
  "tool-submission": "Thanks—your tool is in the review queue."
};

const text = (value) => typeof value === "string" ? value.trim() : "";
const validText = (value, max, min = 1) => {
  const normalized = text(value);
  return normalized.length >= min && value.length <= max && !CONTROL_PATTERN.test(value);
};
const validEmail = (value) => {
  const normalized = text(value).toLowerCase();
  return normalized.length <= 254 && !HEADER_CONTROL_PATTERN.test(normalized) && EMAIL_PATTERN.test(normalized);
};

function validWebsite(value) {
  if (typeof value !== "string" || value.length > 500 || CONTROL_PATTERN.test(value)) return false;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password;
  } catch {
    return false;
  }
}

function safeMailbox(value) {
  if (typeof value !== "string" || value.length > 254 || HEADER_CONTROL_PATTERN.test(value)) return false;
  return validEmail(value);
}

function safeFrom(value) {
  if (typeof value !== "string" || value.length > 160 || HEADER_CONTROL_PATTERN.test(value)) return false;
  const match = value.match(/<([^<>]+)>\s*$/);
  return safeMailbox(match ? match[1] : value);
}

function cleanLine(value, max = 4000) {
  return String(value || "")
    .slice(0, max)
    .replace(/[\r\n\t]+/g, " ")
    .replace(CONTROL_PATTERN, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function cleanBlock(value, max = 4000) {
  return String(value || "")
    .slice(0, max)
    .replace(/\r\n?/g, "\n")
    .replace(CONTROL_PATTERN, "")
    .trim();
}

function validateAndNormalize(body) {
  if (!["newsletter", "tool-submission", "service-inquiry"].includes(body.kind)) {
    return { error: "Invalid submission." };
  }
  if (!validEmail(body.email)) return { error: "Enter a valid email address." };

  const normalized = {
    kind: body.kind,
    email: text(body.email).toLowerCase()
  };

  if (body.kind === "newsletter") return { value: normalized };

  if (body.kind === "tool-submission") {
    if (!validText(body.name, 120) || !validText(body.toolName, 120) || !validWebsite(body.toolUrl) || !validText(body.message, 4000)) {
      return { error: "Complete all required tool-submission fields." };
    }
    if (body.category && !TOOL_CATEGORIES.has(body.category)) {
      return { error: "Choose a valid tool category." };
    }
    return {
      value: {
        ...normalized,
        name: text(body.name),
        toolName: text(body.toolName),
        toolUrl: text(body.toolUrl),
        category: text(body.category),
        message: text(body.message)
      }
    };
  }

  if (!validText(body.name, 120)) return { error: "Enter your name." };
  if (!SERVICES.has(body.service)) return { error: "Choose a valid service." };
  if (!validText(body.message, 4000, 15)) return { error: "Describe what you need in at least 15 characters." };
  if (body.consent !== "yes") return { error: "Please agree to the privacy notice so KSL can respond." };
  if (body.phone && !validText(body.phone, 50)) return { error: "Check the phone number." };
  if (body.website && !validWebsite(body.website)) return { error: "Enter a valid website URL beginning with http:// or https://." };
  if (body.timeline && !TIMELINES.has(body.timeline)) return { error: "Choose a valid timeline." };

  return {
    value: {
      ...normalized,
      name: text(body.name),
      phone: text(body.phone),
      service: body.service,
      website: text(body.website),
      timeline: body.timeline || "flexible",
      message: text(body.message),
      consent: "yes"
    }
  };
}

function emailPayload(body, from, recipient) {
  const subject = body.kind === "newsletter"
    ? "New KSL newsletter signup"
    : body.kind === "service-inquiry"
      ? `KSL service inquiry: ${cleanLine(body.service, 20)}`
      : `KSL tool submission: ${cleanLine(body.toolName, 120)}`;

  const lines = body.kind === "newsletter"
    ? [`Email: ${cleanLine(body.email, 254)}`]
    : body.kind === "service-inquiry"
      ? [
          `Name: ${cleanLine(body.name, 120)}`,
          `Email: ${cleanLine(body.email, 254)}`,
          `Phone: ${cleanLine(body.phone, 50) || "Not provided"}`,
          `Service: ${cleanLine(body.service, 20)}`,
          `Website: ${cleanLine(body.website, 500) || "Not provided"}`,
          `Timeline: ${cleanLine(body.timeline, 20)}`,
          "",
          cleanBlock(body.message, 4000)
        ]
      : [
          `Name: ${cleanLine(body.name, 120)}`,
          `Email: ${cleanLine(body.email, 254)}`,
          `Tool: ${cleanLine(body.toolName, 120)}`,
          `URL: ${cleanLine(body.toolUrl, 500)}`,
          `Category: ${cleanLine(body.category, 80) || "Not provided"}`,
          "",
          cleanBlock(body.message, 4000)
        ];

  return {
    from,
    to: [recipient],
    reply_to: body.email,
    subject: cleanLine(subject, 160),
    text: lines.join("\n")
  };
}

export function createSubmissionHandler({
  fetchImpl = globalThis.fetch,
  limiter = createSubmissionLimiter(),
  deduper = createSubmissionDeduper(),
  providerTimeoutMs = 8000
} = {}) {
  return async function handler(request, response) {
    const requestId = randomUUID();
    response.setHeader("Cache-Control", "no-store");

    if (request.method !== "POST") {
      response.setHeader("Allow", "POST");
      return response.status(405).json({ error: "Method not allowed." });
    }

    const rejected = inspectRequest(request);
    if (rejected) return response.status(rejected.status).json({ error: rejected.error });

    const body = request.body || {};
    if (body.companySite) {
      return response.status(200).json({ message: "Thanks. Your submission was received." });
    }

    const validation = validateAndNormalize(body);
    if (validation.error) return response.status(400).json({ error: validation.error });
    const submission = validation.value;

    const from = process.env.SUBMISSION_FROM || "KSL Website <onboarding@resend.dev>";
    const recipient = process.env.SUBMISSION_EMAIL;
    if (!process.env.RESEND_API_KEY || !recipient) {
      return response.status(503).json({ error: "Submissions are being configured. Please try again shortly." });
    }
    if (!safeFrom(from) || !safeMailbox(recipient)) {
      console.error("Submission email configuration invalid", { requestId, kind: submission.kind });
      return response.status(503).json({ error: "Submissions are temporarily unavailable. Please try again shortly." });
    }

    const duplicate = deduper.begin(JSON.stringify(submission));
    if (!duplicate.allowed) {
      response.setHeader("Retry-After", String(duplicate.retryAfter));
      const message = duplicate.state === "accepted"
        ? "We already received this submission. There’s no need to send it again."
        : "This submission is already being processed. Please wait a moment.";
      return response.status(duplicate.state === "accepted" ? 200 : 409).json({ message, error: message });
    }

    const limit = limiter({ ip: clientIp(request), email: submission.email });
    if (!limit.allowed) {
      deduper.release(duplicate.token);
      response.setHeader("Retry-After", String(limit.retryAfter));
      return response.status(429).json({ error: "Too many submissions. Please wait a few minutes before trying again." });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), providerTimeoutMs);
    let resend;
    try {
      resend = await fetchImpl("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(emailPayload(submission, from, recipient)),
        signal: controller.signal
      });
    } catch (error) {
      deduper.release(duplicate.token);
      console.error("Submission email request failed", {
        requestId,
        kind: submission.kind,
        reason: error?.name === "AbortError" ? "timeout" : "network"
      });
      return response.status(502).json({ error: "The message could not be sent. Please try again." });
    } finally {
      clearTimeout(timeout);
    }

    if (!resend.ok) {
      deduper.release(duplicate.token);
      console.error("Submission email rejected", { requestId, kind: submission.kind, status: resend.status });
      return response.status(502).json({ error: "The message could not be sent. Please try again." });
    }

    deduper.complete(duplicate.token);
    console.info("Submission email accepted", { requestId, kind: submission.kind });
    return response.status(200).json({ message: SUCCESS[submission.kind] });
  };
}

export default createSubmissionHandler();
