import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import { createSubmissionHandler } from "../api/submit.js";
import { createSubmissionDeduper, createSubmissionLimiter } from "../lib/submission-guard.js";

const inquiry = {
  kind: "service-inquiry",
  name: "Maria Santos",
  email: "qa@example.com",
  phone: "",
  service: "repair",
  website: "https://example.com",
  timeline: "flexible",
  message: "Please assess this test website.",
  consent: "yes"
};

function responseHarness() {
  return {
    headers: {},
    setHeader(key, value) { this.headers[key] = value; },
    status(code) { this.code = code; return this; },
    json(payload) { this.payload = payload; return this; }
  };
}

function request(body, headers = {}, method = "POST") {
  return {
    method,
    body,
    headers: {
      "content-type": "application/json",
      host: "ksl-site.vercel.app",
      origin: "https://ksl-site.vercel.app",
      ...headers
    }
  };
}

async function submit(handler, body, headers, method) {
  const response = responseHarness();
  await handler(request(body, headers, method), response);
  return response;
}

function handlerWith(fetchImpl) {
  return createSubmissionHandler({
    fetchImpl,
    limiter: createSubmissionLimiter(),
    deduper: createSubmissionDeduper(),
    providerTimeoutMs: 50
  });
}

test("service inquiry validation and delivery", async (t) => {
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

  t.mock.method(console, "info", () => {});
  t.mock.method(console, "error", () => {});

  await t.test("valid inquiry is sanitized and handed to Resend", async () => {
    let providerRequest;
    const handler = handlerWith(async (url, options) => {
      providerRequest = { url, options };
      return { ok: true, status: 200, json: async () => ({ id: "mock-id" }) };
    });
    const result = await submit(handler, inquiry);
    assert.equal(result.code, 200);
    assert.match(result.payload.message, /sent/i);
    assert.equal(providerRequest.url, "https://api.resend.com/emails");
    const sent = JSON.parse(providerRequest.options.body);
    assert.equal(sent.reply_to, "qa@example.com");
    assert.deepEqual(sent.to, ["recipient@example.com"]);
    assert.equal(sent.subject, "KSL service inquiry: repair");
    assert.match(sent.text, /Name: Maria Santos/);
    assert.match(sent.text, /Website: https:\/\/example.com/);
    assert.match(sent.text, /Please assess this test website/);
    assert.ok(providerRequest.options.signal);
  });

  await t.test("missing required fields are rejected", async () => {
    for (const field of ["name", "message"]) {
      const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
      const result = await submit(handler, { ...inquiry, [field]: "" });
      assert.equal(result.code, 400, field);
    }
  });

  await t.test("invalid email is rejected", async () => {
    const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
    assert.equal((await submit(handler, { ...inquiry, email: "not-an-email" })).code, 400);
    assert.equal((await submit(handler, { ...inquiry, email: "victim@example.com\r\nBcc:other@example.com" })).code, 400);
  });

  await t.test("invalid service is rejected", async () => {
    const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
    assert.equal((await submit(handler, { ...inquiry, service: "unknown" })).code, 400);
  });

  await t.test("missing consent is rejected with useful guidance", async () => {
    const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
    const result = await submit(handler, { ...inquiry, consent: "" });
    assert.equal(result.code, 400);
    assert.match(result.payload.error, /privacy notice/i);
  });

  await t.test("oversized fields and request bodies are rejected", async () => {
    const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
    assert.equal((await submit(handler, { ...inquiry, message: "x".repeat(4001) })).code, 400);
    const declared = await submit(handler, inquiry, { "content-length": "16385" });
    assert.equal(declared.code, 413);
    const actual = await submit(handler, { ...inquiry, padding: "x".repeat(16385) });
    assert.equal(actual.code, 413);
  });

  await t.test("honeypot submissions receive a generic response without email", async () => {
    let calls = 0;
    const handler = handlerWith(async () => { calls += 1; });
    const result = await submit(handler, { ...inquiry, companySite: "spam.example" });
    assert.equal(result.code, 200);
    assert.equal(calls, 0);
  });

  await t.test("provider failures are safe and do not block a retry", async () => {
    let calls = 0;
    const handler = handlerWith(async () => {
      calls += 1;
      if (calls === 1) return { ok: false, status: 503 };
      return { ok: true, status: 200, json: async () => ({ id: "mock-id" }) };
    });
    const failed = await submit(handler, inquiry);
    assert.equal(failed.code, 502);
    assert.equal(typeof failed.payload.error, "string");
    const retry = await submit(handler, inquiry);
    assert.equal(retry.code, 200);
    assert.equal(calls, 2);
  });

  await t.test("missing and invalid environment configuration is rejected", async () => {
    const handler = handlerWith(async () => { throw new Error("provider should not be called"); });
    delete process.env.RESEND_API_KEY;
    assert.equal((await submit(handler, inquiry)).code, 503);
    process.env.RESEND_API_KEY = "test-only";
    process.env.SUBMISSION_EMAIL = "invalid\r\nBcc:other@example.com";
    assert.equal((await submit(handler, inquiry)).code, 503);
    process.env.SUBMISSION_EMAIL = "recipient@example.com";
  });

  await t.test("newsletter and tool-submission forms remain functional", async () => {
    const sent = [];
    const handler = handlerWith(async (url, options) => {
      sent.push(JSON.parse(options.body));
      return { ok: true, status: 200, json: async () => ({ id: "mock-id" }) };
    });
    assert.equal((await submit(handler, { kind: "newsletter", email: "news@example.com", companySite: "" })).code, 200);
    assert.equal((await submit(handler, {
      kind: "tool-submission",
      email: "maker@example.com",
      name: "Maker",
      toolName: "Useful Tool",
      toolUrl: "https://example.com/tool",
      category: "No-code app",
      message: "A useful directory submission.",
      companySite: ""
    })).code, 200);
    assert.equal(sent.length, 2);
    assert.equal(sent[0].subject, "New KSL newsletter signup");
    assert.equal(sent[1].subject, "KSL tool submission: Useful Tool");
  });

  await t.test("accepted duplicate submissions do not send duplicate email", async () => {
    let calls = 0;
    const handler = handlerWith(async () => {
      calls += 1;
      return { ok: true, status: 200, json: async () => ({ id: "mock-id" }) };
    });
    assert.equal((await submit(handler, inquiry)).code, 200);
    const duplicate = await submit(handler, inquiry);
    assert.equal(duplicate.code, 200);
    assert.match(duplicate.payload.message, /already received/i);
    assert.equal(calls, 1);
  });
});

const formScript = await readFile(new URL("../forms.js", import.meta.url), "utf8");

function formHarness(fetch) {
  const classes = new Set();
  const button = {
    textContent: "Send inquiry →",
    disabled: false,
    setAttribute() {},
    removeAttribute() {}
  };
  const status = {
    textContent: "",
    className: "",
    tabIndex: 0,
    focusCalls: 0,
    focus() { this.focusCalls += 1; }
  };
  const form = {
    dataset: { formKind: "service-inquiry" },
    resets: 0,
    classList: {
      add: (value) => classes.add(value),
      remove: (value) => classes.delete(value),
      contains: (value) => classes.has(value)
    },
    reportValidity: () => true,
    setAttribute() {},
    removeAttribute() {},
    querySelector: (selector) => selector.includes("submit") ? button : status,
    reset() { this.resets += 1; },
    addEventListener(event, callback) { this.submit = callback; }
  };
  vm.runInNewContext(formScript, {
    document: { querySelectorAll: () => [form] },
    fetch,
    FormData: class { entries() { return Object.entries(inquiry); } },
    TypeError
  });
  return { form, button, status, submit: () => form.submit({ preventDefault() {} }) };
}

test("plain-text server errors preserve inputs and restore the submit button", async () => {
  const harness = formHarness(async () => ({ ok: false, json: async () => { throw new SyntaxError("not JSON"); } }));
  await harness.submit();
  assert.equal(harness.form.resets, 0);
  assert.equal(harness.status.className, "error");
  assert.match(harness.status.textContent, /try again/i);
  assert.doesNotMatch(harness.status.textContent, /JSON|Unexpected token/);
  assert.equal(harness.button.disabled, false);
  assert.ok(harness.status.focusCalls > 0);
});

test("successful responses clear inputs and duplicate pending submissions are ignored", async () => {
  let resolve;
  let calls = 0;
  const harness = formHarness(() => {
    calls += 1;
    return new Promise((done) => { resolve = done; });
  });
  const pending = harness.submit();
  assert.equal(harness.button.disabled, true);
  await harness.submit();
  assert.equal(calls, 1);
  resolve({ ok: true, json: async () => ({ message: "Inquiry sent." }) });
  await pending;
  assert.equal(harness.form.resets, 1);
  assert.equal(harness.status.className, "success");
  assert.equal(harness.button.disabled, false);
});

test("rate-limit responses preserve inputs and show retry guidance", async () => {
  const harness = formHarness(async () => ({
    ok: false,
    json: async () => ({ error: "Too many submissions. Please wait a few minutes before trying again." })
  }));
  await harness.submit();
  assert.equal(harness.form.resets, 0);
  assert.equal(harness.status.className, "error");
  assert.match(harness.status.textContent, /wait a few minutes/);
  assert.equal(harness.button.disabled, false);
});
