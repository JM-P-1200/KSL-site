# Privacy notice and submission protection — release review

Updated October 28, 2026 (Asia/Manila). Changes are prepared for review; this PR does not change production.

## Confirmed owner decisions

- [x] Operator: **Japhet Palmare operating KSL** (owner-supplied spelling).
- [x] Privacy contact: **japhmiguel@gmail.com**, approved for public display.
- [x] Closed inquiries: maximum **12 months after last meaningful contact**, unless necessary legal retention applies.
- [x] Japhet Palmare personally handles deletion reviews.
- [x] Monthly manual Gmail cleanup procedure documented below.
- [x] Notice draft banner removed; applicability begins when published to production. Last-updated date is not a claim that production already changed.
- [ ] Account-specific Resend plan or custom retention arrangement confirmed.
- [ ] Owner approves merging and production release.

The approved 12 months is the owner's operating policy, not a period prescribed by the NPC. No mailbox deletion, provider setting, paid service, credential, firewall or production change is performed by this PR.

## What was verified, and what was not

- Reviewed Google's published Gmail behavior: deleted messages move to Trash and are normally permanently deleted after 30 days.
- Reviewed Resend's published policy: 30-day email/log retention on Free, Pro and Scale; seven-day backups; Enterprise/custom retention can differ. Earlier deletion can require provider support.
- Resend's account page requires a separate sign-in in this browser. **The actual account plan/custom terms were not verified.** Do not label that item completed based solely on public documentation.
- Gmail labels, filters, account backup/export settings and actual mailbox deletion have not been inspected or changed.
- The public notice describes the standard provider policy with its plan qualification; it does not claim this account was audited.

## Monthly Gmail cleanup — owner's procedure

1. Keep KSL conversations identifiable as Active, Closed or Client. Labels are organizational only and do not delete copies. No labels are created by this PR.
2. Review Closed inquiries monthly, beginning when the last meaningful contact is about **10 months old**. Record the relevant last-contact date; do not rely only on the date of the first incoming message.
3. Review the complete inquiry conversation: received messages, sent replies, attachments, and any downloaded/exported copies under your control. Archiving a thread is not deletion.
4. Exclude active work and records needed for a client engagement, contract, invoice, legal obligation or dispute. Record the reason for any retention exception and review it again.
5. For records due for disposal, move the identified KSL messages to Trash **at least 45 days before the 12-month deadline**. This allows for Gmail's normal 30-day Trash period and review timing.
6. At the next review, check that due items are no longer in the active mailbox/archive or recoverable Trash. If something remains, review those specific messages. Never indiscriminately empty a personal account's entire Trash.
7. Permanent deletion is irreversible and requires the owner's deliberate action. No unattended deletion script or bulk purge is configured.
8. Keep a minimal cleanup record (review date, date range, number of threads removed and exceptions) without copying inquiry content or unnecessary contact details into it.
9. An individual deletion request may need earlier action and separate review of Resend/provider copies. Contact provider support if required; do not promise a Gmail deletion removes every provider copy.

Gmail/Resend backup and infrastructure retention is provider-controlled; distinguish removing accessible mailbox records from erasing all physical backups.

## Implementation and limits

- Notice links beside service consent, tool submissions, newsletter requests, and relevant footers.
- Inquiry processing is separate from marketing.
- JSON/string-field validation, 16 KiB parsed-body check, length limits, HTTP/HTTPS URL checks, credential-free URLs and cross-site browser checks.
- Existing honeypots, plus newsletter honeypot; trapped submissions do not reach Resend.
- Best-effort **per warm function instance** quotas: five submissions per IP per minute and three per email per ten minutes, shared across form types.
- Keyed fingerprints and counts in bounded process memory, not raw IP/email values; lazy expiration or instance recycling.
- HTTP 429 with Retry-After and preserved form inputs; responses use no-store.
- Cold starts, multiple instances/regions and varied identities can bypass aggregate quotas. These are not distributed rate limits. Origin checks do not stop scripts spoofing headers.
- Stronger global limits would need separately approved shared storage or reviewed platform firewall rules.

## Validation and release sequence

- Run `npm run vercel-build` and `git diff --check`.
- Check the latest preview's privacy page, mailto link, notice links, layout and unchanged service prices.
- Earlier application smoke test succeeded and Resend accepted the labeled preview inquiry; content-only edits do not require more real emails.
- Verify account-specific Resend retention, resolve any conflict with the notice, and obtain final merge/release approval.
- On an approved release, verify the production page and submit one labeled inquiry. Confirm provider acceptance and delivery evidence separately.

## Sources reviewed

- [Google: Delete messages in Gmail](https://support.google.com/mail/answer/7401?hl=en)
- [Resend: Retention and deletion](https://www.resend.com/security/gdpr)
- [NPC: Right to be informed](https://privacy.gov.ph/the-right-to-be-informed/)
- [NPC: Retention guidance](https://privacy.gov.ph/day-to-day/)
- [NPC: Data subject rights](https://privacy.gov.ph/data-subject-rights/)
- [Vercel: Request headers](https://vercel.com/docs/headers/request-headers)

This review documents the implementation and owner's operational commitments; it does not certify all legal or organizational privacy obligations.
