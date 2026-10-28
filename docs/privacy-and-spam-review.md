# Privacy notice and submission protection — review checklist

Prepared October 28, 2026. This is a review branch; do not merge or release until the owner confirms the notice details.

## Decisions still needed

- [x] Owner confirmed the operator: Japhet Palmare operating KSL.
- [x] Owner approved publishing japhmiguel@gmail.com as the privacy contact, replacing the earlier business-email preference.
- [x] Owner approved 12-month retention for closed inquiries and will personally handle deletion reviews.
- [ ] Confirm mailbox, Resend, and hosting retention settings. Japhet Palmare is responsible for manual deletion reviews.
- [x] Replace the operator, contact and retention draft fields with the owner's confirmed details.
- [ ] Remove the draft banner and set an effective date after final release approval.

The approved 12 months is the owner's operational choice, not a period prescribed by the NPC. No provider retention settings or existing emails are changed by this PR. The draft is deliberately marked noindex; decide whether to remove that tag when publishing.

## What this branch changes

- Adds a readable privacy notice linked beside service consent, tool submissions, newsletter requests, and the relevant footers.
- Describes hosting/email processing, optional fields, non-marketing use of inquiries, request rights, browser storage and external fonts.
- Keeps the existing honeypot and prevents its submissions from reaching Resend.
- Requires JSON objects with string fields; rejects cross-site browser submissions, oversized bodies, invalid/overlong fields, and website URLs containing credentials.
- Adds synchronous per-instance rate limits: five submissions per IP per minute and three per email per ten minutes. Shared across newsletter, tool submission, and service inquiry within one instance.
- Returns HTTP 429 with Retry-After and a useful message while retaining form inputs.
- Stores keyed fingerprints in bounded process memory, not raw IP/email values; no Redis, paid service, CAPTCHA, credentials, or firewall-setting changes.
- Keeps application responses non-cacheable and provides Allow: POST on method errors.

## Important limits

These counters are **best-effort per warm function instance**, not a global quota. Cold starts, multiple regions/instances, and varied source/email combinations can bypass aggregate limits. Email-based limits can also temporarily affect a shared address. The store expires entries lazily on the next request or disappears when the instance is recycled. Platform request parsing happens before the application's 16 KiB body check.

Origin checking stops ordinary cross-site browser posts, not scripts capable of spoofing headers. The honeypot is one bot signal, not human verification. No claim of complete spam prevention is made.

For sustained abuse, use a shared atomic counter or a reviewed Vercel Firewall rule after the owner approves the provider, cost and access/configuration change. Do not silently enable a new provider or weaken Deployment Protection.

## Verification

- Run `npm run vercel-build` and `git diff --check`.
- Check preview notice links, readable layout, consent interaction, and unchanged prices.
- Submit one labeled normal preview inquiry; verify email-provider acceptance.
- Use local mocked tests for burst limits and malformed requests instead of sending spam or bursts of real emails.
- Owner reviews draft identity/contact/retention before merge; production remains unchanged.

## Operational follow-through before publishing

1. Assign a person to monitor the privacy mailbox and respond to requests.
2. Record which inbox/provider folders hold submissions; approve a deletion review routine.
3. On deletion requests, review mailbox/provider copies and any legitimate retention obligations; do not treat deleting a browser form as deleting email records.
4. Never request passwords or identity documents through the public form.

## Sources reviewed

- Philippine National Privacy Commission, [Right to be informed](https://privacy.gov.ph/the-right-to-be-informed/): notice scope, purposes, recipients, controller/contact, retention and rights.
- NPC, [Data Privacy Act](https://privacy.gov.ph/data-privacy-act/) and [retention guidance](https://privacy.gov.ph/day-to-day/).
- NPC, [Data subject rights](https://privacy.gov.ph/data-subject-rights/).
- Vercel, [Request headers](https://vercel.com/docs/headers/request-headers): platform-supplied client-IP headers.

This notice describes the reviewed implementation and proposed operations; it is not a claim that all legal or organizational privacy obligations have been audited.
