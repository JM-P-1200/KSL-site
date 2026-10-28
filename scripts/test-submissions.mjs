import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import handler from "../api/submit.js";

const inquiry = {
  kind: "service-inquiry", name: "Maria Santos", email: "qa@example.com",
  service: "repair", website: "https://example.com", timeline: "flexible",
  message: "Please assess this test website.", consent: "yes"
};

test("submission validation and email handoff", async (t) => {
  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});
  const original = { ...process.env };
  t.after(() => {
    for (const key of ["RESEND_API_KEY", "SUBMISSION_EMAIL", "SUBMISSION_FROM"]) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
  });
  process.env.RESEND_API_KEY = "test-only";
  process.env.SUBMISSION_EMAIL = "recipient@example.com";
  process.env.SUBMISSION_FROM = "KSL <test@example.com>";
  const fetchMock = t.mock.method(globalThis, "fetch", async () => ({ ok: true, json: async () => ({ id: "test-email-id" }) }));
  let sequence = 0;
  async function submit(body = inquiry, method = "POST") {
    body = { ...body, email: body.email === inquiry.email ? `qa-${sequence++}@example.com` : body.email };
    const response = { setHeader() {}, status(code) { this.code = code; return this; }, json(payload) { this.payload = payload; return this; } };
    await handler({ method, body, headers: { "content-type": "application/json" } }, response);
    return response;
  }
  await t.test("accepts an inquiry and preserves contact text", async () => {
    const result = await submit();
    assert.equal(result.code, 200);
    const [url, options] = fetchMock.mock.calls.at(-1).arguments;
    assert.equal(url, "https://api.resend.com/emails");
    const sent = JSON.parse(options.body);
    assert.equal(sent.reply_to, "qa-0@example.com");
    assert.deepEqual(sent.to, [process.env.SUBMISSION_EMAIL]);
    assert.match(sent.text, /Name: Maria Santos/);
    assert.match(sent.text, /Website: https:\/\/example.com/);
    assert.match(sent.text, /Please assess this test website/);
  });
  await t.test("rejects invalid fields without contacting the provider", async () => {
    const count = fetchMock.mock.callCount();
    for (const patch of [
      { consent: "" }, { name: " " }, { message: "too short" },
      { service: "unknown" }, { timeline: "unknown" }, { email: "invalid" },
      { website: "https://" }, { website: "javascript:alert(1)" },
      { website: "ftp://example.com" }, { website: "https://" + "x".repeat(500) },
      { phone: "x".repeat(51) }
    ]) assert.equal((await submit({ ...inquiry, ...patch })).code, 400);
    assert.equal(fetchMock.mock.callCount(), count);
  });
  await t.test("supports optional websites, other services, and existing form types", async () => {
    for (const service of ["repair", "setup", "care"]) {
      assert.equal((await submit({ ...inquiry, service, website: "" })).code, 200);
    }
    assert.equal((await submit({ kind: "newsletter", email: inquiry.email })).code, 200);
    assert.equal((await submit({ kind: "tool-submission", email: inquiry.email, name: "Test", toolName: "Tool", toolUrl: "https://example.com", message: "Test submission" })).code, 200);
    assert.equal((await submit({}, "GET")).code, 405);
  });
  await t.test("returns JSON when configuration or the provider fails", async () => {
    delete process.env.RESEND_API_KEY;
    assert.equal((await submit()).code, 503);
    process.env.RESEND_API_KEY = "test-only";
    fetchMock.mock.mockImplementation(async () => ({ ok: false, status: 403 }));
    assert.equal((await submit()).code, 502);
    fetchMock.mock.mockImplementation(async () => { throw new Error("network failure"); });
    const result = await submit();
    assert.equal(result.code, 502);
    assert.equal(typeof result.payload.error, "string");
  });
});

const formScript = await readFile(new URL("../forms.js", import.meta.url), "utf8");
function formHarness(fetch) {
  const classes = new Set();
  const button = { textContent: "Send inquiry →", disabled: false };
  const status = { textContent: "", className: "" };
  const form = {
    dataset: { formKind: "service-inquiry" }, resets: 0,
    classList: { add: v => classes.add(v), remove: v => classes.delete(v), contains: v => classes.has(v) },
    reportValidity: () => true, setAttribute() {}, removeAttribute() {},
    querySelector: selector => selector.includes("submit") ? button : status,
    reset() { this.resets++; }, addEventListener(event, callback) { this.submit = callback; }
  };
  vm.runInNewContext(formScript, {
    document: { querySelectorAll: () => [form] }, fetch,
    FormData: class { entries() { return Object.entries(inquiry); } }, TypeError
  });
  return { form, button, status, submit: () => form.submit({ preventDefault() {} }) };
}

test("plain-text server errors preserve inputs and restore the submit button", async () => {
  const h = formHarness(async () => ({ ok: false, json: async () => { throw new SyntaxError("not JSON"); } }));
  await h.submit();
  assert.equal(h.form.resets, 0);
  assert.equal(h.status.className, "error");
  assert.match(h.status.textContent, /try again/i);
  assert.doesNotMatch(h.status.textContent, /JSON|Unexpected token/);
  assert.equal(h.button.disabled, false);
});

test("successful responses clear inputs and duplicate pending submissions are ignored", async () => {
  let resolve;
  let calls = 0;
  const h = formHarness(() => { calls++; return new Promise(done => { resolve = done; }); });
  const pending = h.submit();
  assert.equal(h.button.disabled, true);
  await h.submit();
  assert.equal(calls, 1);
  resolve({ ok: true, json: async () => ({ message: "Inquiry sent." }) });
  await pending;
  assert.equal(h.form.resets, 1);
  assert.equal(h.status.className, "success");
  assert.equal(h.button.disabled, false);
});


test("rate-limit responses keep inputs and show the retry guidance", async () => {
  const h = formHarness(async () => ({ ok: false, json: async () => ({ error: "Too many submissions. Please wait a few minutes before trying again." }) }));
  await h.submit();
  assert.equal(h.form.resets, 0);
  assert.equal(h.status.className, "error");
  assert.match(h.status.textContent, /wait a few minutes/);
  assert.equal(h.button.disabled, false);
});
