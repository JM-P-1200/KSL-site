# KSL Web Services release readiness

## Scope

This audit covers the customer inquiry path in `services.html`, `forms.js`, `api/submit.js`, `lib/submission-guard.js`, the Vercel configuration, privacy notice, and automated regression tests. It does not authorize a production deployment or change any environment variable.

## Protections implemented

- Server-side allowlists and length limits for every accepted form type.
- Request content-type, origin, shape, and 16 KiB body checks.
- Safe HTTP(S) URL validation without embedded credentials.
- Email address, sender, recipient, subject, and reply-to header protection.
- Plain-text email output with control-character handling.
- Honeypot handling that does not reveal detection.
- Best-effort per-instance IP and email rate limits.
- Best-effort per-instance duplicate suppression with retry release after provider failures.
- Eight-second Resend timeout and stable customer-facing failure responses.
- Structured logs limited to request ID, submission type, failure reason, and provider status.
- Accessible pending, success, and error announcements that preserve form input on failure.

## Rate-limit trade-off

The limiter and duplicate cache are intentionally in memory. They reduce ordinary abuse without adding paid or persistent infrastructure, but Vercel Functions can run multiple instances and recycle them. The limits are therefore not globally consistent.

If production abuse becomes material, the business owner should approve a shared store or managed rate-limit product after reviewing cost, data location, retention, and operational ownership. Until then, the current implementation should be described as layered best-effort protection, not a guarantee.

## Privacy and retention

The public privacy notice states that inquiries are delivered through Vercel and Resend to the configured KSL inbox and are not written to a customer database. Application logs do not include form contents or contact details.

Business-owner decisions that must remain explicit:

- Confirm that the published privacy contact remains monitored.
- Confirm the stated monthly review and maximum 12-month mailbox retention remain operationally realistic.
- Review Resend and mailbox retention statements when provider plans or policies change.
- Decide whether a future CRM is necessary before introducing persistent inquiry storage.
- Approve any move to distributed rate limiting because it would add another processor/store for request-derived identifiers.

## Manual preview verification

After the preview deployment is READY:

1. Open `/services` on desktop and a narrow mobile viewport.
2. Navigate from the skip link through the form using only the keyboard.
3. Submit one controlled test inquiry with no customer data.
4. Confirm the page announces success and clears the form.
5. Confirm exactly one message reaches the configured inbox.
6. Confirm Reply-To is the controlled test address.
7. Confirm the message contains the selected service and expected fields, and no consent or honeypot field.
8. Repeat with a deliberate validation error and confirm inputs remain intact.
9. Inspect Vercel runtime logs and confirm no name, email, phone, URL, or message content appears.
10. Delete the controlled test email from the inbox and, if available, from Resend logs.

Do not use automated tests to send real email.

## Release gates

- Automated build and tests: required PASS.
- Preview deployment: required READY.
- Preview page and security headers: required PASS.
- Real Resend delivery and Reply-To: manual NOT VERIFIED until the owner performs the controlled test.
- Production deployment: prohibited by this branch; merge approval remains with the owner.
