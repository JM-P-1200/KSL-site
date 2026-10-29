import { createHmac, randomBytes } from "node:crypto";
import { isIP } from "node:net";

const secret = randomBytes(32);
export const MAX_BODY_BYTES = 16_384;

function keyedDigest(value) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

// Best-effort, per warm function instance. This is not a distributed quota.
export function createSubmissionLimiter({ now = Date.now, maxEntries = 5000 } = {}) {
  const entries = new Map();
  return function reserve({ ip, email }) {
    const time = now();
    for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
    const rules = [
      ...(ip ? [{ key: keyedDigest(`ip:${ip}`), max: 5, window: 60_000 }] : []),
      { key: keyedDigest(`email:${email.toLowerCase()}`), max: 3, window: 600_000 }
    ];
    const waits = rules.filter((rule) => entries.get(rule.key)?.count >= rule.max)
      .map((rule) => entries.get(rule.key).until - time);
    if (waits.length) return { allowed: false, retryAfter: Math.ceil(Math.max(...waits) / 1000) };
    const needed = rules.filter((rule) => !entries.has(rule.key)).length;
    if (entries.size + needed > maxEntries) return { allowed: false, retryAfter: 60 };
    for (const rule of rules) {
      const entry = entries.get(rule.key) || { count: 0, until: time + rule.window };
      entry.count += 1;
      entries.set(rule.key, entry);
    }
    return { allowed: true };
  };
}

// Prevents rapid duplicate sends on the same warm instance. A shared store would be
// required for globally consistent deduplication across all serverless instances.
export function createSubmissionDeduper({ now = Date.now, ttl = 600_000, maxEntries = 5000 } = {}) {
  const entries = new Map();

  function prune(time) {
    for (const [key, entry] of entries) if (entry.until <= time) entries.delete(key);
  }

  return {
    begin(value) {
      const time = now();
      prune(time);
      const token = keyedDigest(value);
      const existing = entries.get(token);
      if (existing) {
        return {
          allowed: false,
          state: existing.state,
          retryAfter: Math.max(1, Math.ceil((existing.until - time) / 1000))
        };
      }
      if (entries.size >= maxEntries) return { allowed: false, retryAfter: 60 };
      entries.set(token, { state: "pending", until: time + ttl });
      return { allowed: true, token };
    },
    complete(token) {
      const entry = entries.get(token);
      if (entry) entry.state = "accepted";
    },
    release(token) {
      entries.delete(token);
    }
  };
}

export function clientIp(request) {
  // On Vercel, prefer the platform-overwritten header; never trust a body field.
  const candidate = process.env.VERCEL
    ? request.headers?.["x-vercel-forwarded-for"] || request.headers?.["x-forwarded-for"]
    : request.socket?.remoteAddress;
  if (typeof candidate !== "string") return null;
  const ip = candidate.split(",")[0].trim();
  return isIP(ip) ? ip : null;
}

export function inspectRequest(request) {
  const headers = request.headers || {};
  if (!/^application\/json(?:\s*;|$)/i.test(headers["content-type"] || "")) {
    return { status: 415, error: "Please submit this form as JSON." };
  }
  const declaredLength = Number(headers["content-length"]);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return { status: 413, error: "This submission is too large. Please shorten your message." };
  }
  if (headers["sec-fetch-site"] === "cross-site") {
    return { status: 403, error: "Please submit the form from the KSL website." };
  }
  if (headers.origin) {
    try {
      const origin = new URL(headers.origin);
      if (!["https:", "http:"].includes(origin.protocol) || origin.host !== headers.host) throw new Error();
    } catch {
      return { status: 403, error: "Please submit the form from the KSL website." };
    }
  }
  const body = request.body;
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { status: 400, error: "Invalid submission." };
  }
  if (Buffer.byteLength(JSON.stringify(body), "utf8") > MAX_BODY_BYTES) {
    return { status: 413, error: "This submission is too large. Please shorten your message." };
  }
  if (Object.values(body).some((value) => typeof value !== "string")) {
    return { status: 400, error: "Invalid submission fields." };
  }
  return null;
}
