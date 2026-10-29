# KSL Web Services release readiness

## Scope and approval state

This document covers the customer inquiry path in `services.html`, `forms.js`, `api/submit.js`, `lib/submission-guard.js`, Vercel configuration, the privacy notice, and regression tests. It does not authorize a merge, production deployment, environment-variable change, or a new data store.

Automated checks and a READY preview are necessary but not sufficient for release. Every unchecked manual item below remains `NOT VERIFIED`.

## Protections implemented

- Server-side allowlists and field-length limits for every accepted form type.
- Request content-type, origin, shape, declared-length, and parsed 16 KiB body checks.
- Safe HTTP(S) URL validation without embedded credentials.
- Email address, sender, recipient, subject, and reply-to header protection.
- Plain-text email output with control-character handling.
- Honeypot handling that does not reveal detection.
- Best-effort per-instance IP/email rate limiting and duplicate suppression.
- Retry release after provider failures, an eight-second Resend timeout, and stable customer-facing errors.
- Logs limited to request ID, submission type, failure reason, and provider status; inquiry contents and contact details are excluded.
- Accessible pending, success, and error announcements that preserve form input on failure.

## Manual acceptance checklist

Use synthetic data and the Vercel Preview attached to the pull request. Never use a real customer's inquiry.

### Preview and email configuration

- [ ] Record the preview URL and confirm it represents the current PR head commit.
- [ ] Confirm the deployment is READY and the automated checks are green.
- [ ] Confirm `RESEND_API_KEY`, `SUBMISSION_EMAIL`, and `SUBMISSION_FROM` are present in the Preview scope without copying their values into evidence.
- [ ] Confirm the `SUBMISSION_FROM` domain has sending enabled and is verified in Resend.

### Inquiry delivery, Reply-To, and privacy

- [ ] Submit one inquiry using a controlled test-customer address that is different from the configured KSL inbox.
- [ ] Confirm one success announcement appears and the form clears only after success.
- [ ] Confirm exactly one message reaches the configured inbox with the expected service and inquiry fields.
- [ ] Confirm the Resend event timeline reports `Delivered`; record only the event status and time, not message contents.
- [ ] Click Reply and confirm the recipient is the controlled test-customer address, not `SUBMISSION_FROM`.
- [ ] Inspect the received message's raw headers and confirm `Reply-To` equals the controlled test address.
- [ ] Send a short reply and confirm it reaches the controlled test-customer inbox.
- [ ] Immediately repeat the identical inquiry and confirm that no second email is sent.
- [ ] Trigger a client-side validation error and confirm the error is understandable and entered values remain available.
- [ ] Review Vercel runtime logs and confirm no name, email, phone, URL, or inquiry text appears.
- [ ] Delete the test inquiry and reply from both test mailboxes. Record any Resend/provider copy that cannot be deleted immediately as a provider-retention limitation.

### Desktop and mobile layout

Check at approximately 1440 px and 1024 px desktop widths, then 390 px and 320 px mobile widths.

- [ ] No horizontal scrolling, clipped fields, overlapping controls, or unreadable text.
- [ ] Header, service cards, pricing labels, form, privacy notice, and footer remain readable in order.
- [ ] Managed website care remains clearly marked proposed and unavailable for purchase.
- [ ] Inputs, select, checkbox, links, and submit control remain comfortably operable on mobile.
- [ ] Pending, success, and error messages remain visible without covering controls.

### Keyboard and screen-reader behavior

- [ ] Starting at the address bar, use Tab/Shift+Tab only and confirm the skip link becomes visible and moves focus to main content.
- [ ] Confirm navigation, privacy link, every form field, consent checkbox, and submit button are reachable in a logical order.
- [ ] Confirm every interactive control has a visible focus indicator and there is no keyboard trap.
- [ ] Confirm labels and required state are announced for the form fields.
- [ ] Operate the select and checkbox using the keyboard, then submit without a mouse.
- [ ] Confirm pending, validation, success, and provider-error messages are announced and focus moves to feedback when appropriate.
- [ ] Confirm retrying after an error is possible without re-entering all fields.

### Acceptance record

Record the tester, date/time, PR head commit, preview URL, and PASS/FAIL for each section in the PR. Evidence must not contain API keys, full raw headers, personal addresses, or inquiry text. Any failed or unverified item blocks production release until resolved or explicitly accepted by the business owner.

## Instance-local rate limiting

The limiter and duplicate cache are intentionally held in Vercel Function memory. They can reduce ordinary bursts and repeat clicks handled by the same warm instance. They do not coordinate across concurrent instances, regions, redeployments, or cold starts, and they are not a guaranteed global abuse control or durable idempotency system.

Shared storage should be considered only when one or more measurable conditions occurs:

- repeated abuse bypasses local limits across instances or causes material Resend usage, cost, or support work;
- duplicate inquiries continue to be delivered during concurrency, retry, or multi-region incidents;
- traffic regularly scales to multiple function instances and deterministic global quotas become operationally necessary;
- a contractual or security requirement calls for auditable, centrally enforced limits;
- privacy-safe monitoring shows the present controls are insufficient, rather than adding storage pre-emptively.

Before implementation, the business owner must approve the vendor, cost, data location, retention/TTL, access controls, deletion behavior, incident ownership, and fallback behavior. Store the minimum possible derived identifier, prefer keyed hashes over raw IP/email values, use short expirations, prevent the limiter from becoming a customer database, and document how false positives can be handled.

## Inquiry retention and deletion procedure

The approved service-inquiry decisions and operating steps are documented in [data-retention-procedure.md](data-retention-procedure.md).

Approved:

- [x] Operator and privacy contact: Japhet Palmares, `japhmiguel@gmail.com`.
- [x] Closed service inquiries: delete KSL-controlled copies no later than 12 months after the recorded closure date, subject to a documented exception.
- [x] Monthly deletion reviews are personally handled by Japhet Palmares.

Decisions still requiring owner approval or professional advice:

- [ ] Set an acknowledgement target for privacy requests: ___ business days.
- [ ] Set a completion target: ___ calendar days, subject to documented provider limitations.
- [ ] Approve maximum retention periods for tool submissions and inactive newsletter signup records.
- [ ] Decide how active customer work, accounting records, disputes, or other required records are handled; obtain professional advice where needed.
- [ ] Confirm which mailbox backups, exports, and provider records are within scope.
- [ ] Approve how long the minimal deletion-review log is retained.
- [ ] Verify Resend, Vercel, and mailbox deletion capabilities and plan-specific retention periods.

### Operating procedure

1. Receive requests only through the published privacy contact. Assign a request ID and record the received date, requester address, status, and owner; do not copy the inquiry text into the tracker.
2. Acknowledge within the approved target. Verify control of the inquiry address by replying to it; request additional information only when reasonably necessary to locate records or prevent unauthorized deletion.
3. Search the systems actually used for inquiries: the configured KSL inbox and its folders, sent mail and trash, approved exports/backups, and Resend email/event records. The current application does not write inquiries to a customer database.
4. Identify records by controlled address and an approximate date range. Avoid broad exports or exposing unrelated customer records.
5. Ask the designated owner to decide whether any record must be retained for an active engagement or another documented business obligation. Do not invent a legal hold; record the specific owner-approved reason and review date.
6. Delete eligible inquiry messages, attachments, replies, copies, and exports from owner-controlled systems, including trash where supported. Request provider deletion where supported.
7. If a provider copy or backup cannot be deleted immediately, document the system, reason, access restrictions, expected expiry, and approved follow-up date. Do not claim deletion is complete for that copy.
8. Confirm completion or the remaining limitation to the requester without disclosing internal security details or unrelated records.
9. Keep only a minimal audit entry: request ID, dates, systems checked, outcome, limitation/review date, approver, and confirmation date. Do not retain the original inquiry in the audit entry.
10. During the approved monthly review, remove inquiries beyond the approved retention period unless the owner has recorded a current reason to retain them. Test the procedure periodically with synthetic data.

## Release gates

- Automated build and tests: `PASS`.
- Current PR mergeability and absence of conflicts: required `PASS` immediately before approval.
- Vercel Preview deployment and smoke checks: required `PASS`.
- Resend delivery and Reply-To: manual `NOT VERIFIED` until the controlled test passes.
- Desktop/mobile layout and keyboard accessibility: manual `NOT VERIFIED` until the checklist passes.
- Service-inquiry retention/deletion procedure: `DOCUMENTED`; unresolved periods, response targets, provider limitations, and exception handling still require owner approval or professional advice.
- Production deployment: prohibited by this branch; merge and deployment approval remain with the owner.
