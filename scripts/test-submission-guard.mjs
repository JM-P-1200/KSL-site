import { test } from "node:test";
import assert from "node:assert/strict";
import { clientIp, createSubmissionDeduper, createSubmissionLimiter, inspectRequest } from "../lib/submission-guard.js";
import { createSubmissionHandler } from "../api/submit.js";

const request = (body = { email: "test@example.com" }, headers = {}) => ({
  body, headers: { "content-type": "application/json", host: "ksl-site.vercel.app", ...headers }
});

test("request guard rejects invalid encodings, shapes, oversized and cross-site posts", () => {
  assert.equal(inspectRequest(request({}, { "content-type": "text/plain" })).status, 415);
  assert.equal(inspectRequest(request({}, { origin: "https://other.example" })).status, 403);
  assert.equal(inspectRequest(request({}, { "sec-fetch-site": "cross-site" })).status, 403);
  assert.equal(inspectRequest(request({}, { origin: "null" })).status, 403);
  for (const body of [null, [], "text", { email: ["test@example.com"] }, { message: {} }]) {
    assert.equal(inspectRequest(request(body)).status, 400);
  }
  assert.equal(inspectRequest(request({ message: "x".repeat(16_385) })).status, 413);
  assert.equal(inspectRequest(request({}, { "content-length": "16385" })).status, 413);
  assert.equal(inspectRequest(request({ message: "🙂".repeat(5000) })).status, 413);
  assert.equal(inspectRequest(request({}, { origin: "https://ksl-site.vercel.app" })), null);
  assert.equal(inspectRequest(request({}, { "content-type": "application/json; charset=utf-8" })), null);
});

test("rate limits count synchronously and expire without a background timer", () => {
  let time = 1000;
  const reserve = createSubmissionLimiter({ now: () => time });
  for (let i = 0; i < 3; i++) assert.equal(reserve({ ip: "192.0.2.1", email: "test@example.com" }).allowed, true);
  assert.deepEqual(reserve({ ip: "192.0.2.2", email: "TEST@example.com" }), { allowed: false, retryAfter: 600 });
  time += 600_000;
  assert.equal(reserve({ ip: "192.0.2.1", email: "test@example.com" }).allowed, true);
});

test("IP limit spans different emails; missing IP still has an email limit", () => {
  const reserve = createSubmissionLimiter();
  for (let i = 0; i < 5; i++) assert.equal(reserve({ ip: "192.0.2.1", email: `test-${i}@example.com` }).allowed, true);
  assert.equal(reserve({ ip: "192.0.2.1", email: "another@example.com" }).allowed, false);
  const noIp = createSubmissionLimiter();
  for (let i = 0; i < 3; i++) assert.equal(noIp({ ip: null, email: "test@example.com" }).allowed, true);
  assert.equal(noIp({ ip: null, email: "test@example.com" }).allowed, false);
});

test("rate-limit store is bounded and releases expired capacity", () => {
  let time = 0;
  const reserve = createSubmissionLimiter({ now: () => time, maxEntries: 2 });
  assert.equal(reserve({ ip: "192.0.2.1", email: "test@example.com" }).allowed, true);
  assert.equal(reserve({ ip: "192.0.2.2", email: "new@example.com" }).allowed, false);
  time = 600_001;
  assert.equal(reserve({ ip: "192.0.2.2", email: "new@example.com" }).allowed, true);
});

test("duplicate submissions distinguish pending, accepted, and released states", () => {
  let time = 1000;
  const deduper = createSubmissionDeduper({ now: () => time, ttl: 10_000 });
  const first = deduper.begin("same submission");
  assert.equal(first.allowed, true);
  const pending = deduper.begin("same submission");
  assert.equal(pending.allowed, false);
  assert.equal(pending.state, "pending");
  deduper.complete(first.token);
  const accepted = deduper.begin("same submission");
  assert.equal(accepted.allowed, false);
  assert.equal(accepted.state, "accepted");
  time += 10_001;
  assert.equal(deduper.begin("same submission").allowed, true);

  const retryable = deduper.begin("provider failure");
  deduper.release(retryable.token);
  assert.equal(deduper.begin("provider failure").allowed, true);
});

test("client IP uses the Vercel header only on Vercel", (t) => {
  const previous = process.env.VERCEL;
  t.after(() => { if (previous === undefined) delete process.env.VERCEL; else process.env.VERCEL = previous; });
  process.env.VERCEL = "1";
  assert.equal(clientIp({ headers: { "x-vercel-forwarded-for": "192.0.2.1", "x-forwarded-for": "192.0.2.2" } }), "192.0.2.1");
  assert.equal(clientIp({ headers: { "x-vercel-forwarded-for": "invalid" } }), null);
  delete process.env.VERCEL;
  assert.equal(clientIp({ headers: { "x-forwarded-for": "192.0.2.2" }, socket: { remoteAddress: "127.0.0.1" } }), "127.0.0.1");
});

test("blocked traffic never reaches Resend; 429 includes Retry-After", async (t) => {
  const saved = { key: process.env.RESEND_API_KEY, recipient: process.env.SUBMISSION_EMAIL };
  t.after(() => {
    for (const [name, value] of [["RESEND_API_KEY", saved.key], ["SUBMISSION_EMAIL", saved.recipient]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  });
  process.env.RESEND_API_KEY = "test-only";
  process.env.SUBMISSION_EMAIL = "recipient@example.com";
  let fetchCalls = 0;
  const handler = createSubmissionHandler({
    fetchImpl: async () => {
      fetchCalls += 1;
      return { ok: true, json: async () => ({ id: "test-only" }) };
    },
    limiter: createSubmissionLimiter(),
    deduper: createSubmissionDeduper()
  });
  t.mock.method(console, "info", () => {});
  async function submit(body, headers) {
    const res = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(c) { this.code = c; return this; }, json(p) { this.body = p; return this; } };
    await handler({ method: "POST", ...request(body, headers) }, res);
    return res;
  }
  assert.equal((await submit({ companySite: "bot" })).code, 200);
  assert.equal((await submit({ kind: "newsletter", email: "test@example.com" }, { origin: "https://other.example" })).code, 403);
  assert.equal((await submit({ kind: "newsletter", email: "x".repeat(255) + "@example.com" })).code, 400);
  assert.equal(fetchCalls, 0);
  const rateBody = (index) => ({
    kind: "tool-submission",
    email: "rate-test@example.com",
    name: "Rate Test",
    toolName: `Tool ${index}`,
    toolUrl: "https://example.com",
    category: "Other",
    message: `Distinct test submission ${index}`
  });
  for (let i = 0; i < 3; i++) assert.equal((await submit(rateBody(i))).code, 200);
  const limited = await submit(rateBody(3));
  assert.equal(limited.code, 429);
  assert.equal(limited.headers["Cache-Control"], "no-store");
  assert.ok(Number(limited.headers["Retry-After"]) > 0);
  assert.equal(fetchCalls, 3);
});
