# KSL data retention and deletion procedure

## Status and scope

Approved business decisions:

- Operator: Japhet Palmare, operating KSL.
- Privacy contact: `japhmiguel@gmail.com`.
- Closed service-inquiry retention: 12 months after the inquiry is closed.
- Deletion reviews: performed personally by Japhet Palmare each month.

This procedure applies to service-inquiry emails, replies, attachments, exports, and other KSL-controlled copies. It does not create a database or require a paid service. Tool-submission and newsletter maximum retention periods remain undecided and require separate owner approval.

This is an operational procedure, not a claim of complete legal compliance. Obtain professional advice when a legal obligation, dispute, or unusual request is unclear.

## Roles and access

Japhet Palmare is responsible for:

- deciding when a service inquiry is closed;
- recording the closure date and deletion-due date;
- conducting and documenting the monthly review;
- handling access, correction, and deletion requests;
- approving and reviewing any retention exception;
- checking third-party deletion and retention limitations; and
- limiting access to inquiry records and the deletion-review log.

No other person should access inquiry records unless specifically authorized for a necessary task.

## Closing a service inquiry

An inquiry may be marked closed when the operator determines that no further service-inquiry action is genuinely expected. Examples include:

- the customer's question or troubleshooting request was resolved;
- KSL declined the work;
- the customer withdrew or declined the proposal;
- the quotation or assessment process ended under its stated terms; or
- the parties moved into a separate client engagement and the inquiry phase ended.

Do not mark an inquiry closed merely to shorten retention while a reply, quotation, or agreed follow-up is still pending. If the situation is unclear, leave it open and review it again during the next monthly review.

### Closure record

Use existing mailbox organization plus a simple operator-controlled review log. Do not create a customer database.

1. Apply the mailbox label `KSL/Service/Closed` to the complete inquiry thread.
2. Assign a non-identifying record ID, for example `KSL-SI-2026-001`.
3. Record:
   - record ID;
   - mailbox thread or message reference;
   - closure date;
   - deletion-due date, exactly 12 calendar months after closure;
   - status: `closed`, `exception`, or `deleted`;
   - exception reason and next review date, if any;
   - last review date; and
   - deletion completion date.
4. Do not put the customer's name, email address, phone number, website URL, inquiry text, attachments, or raw email headers in the review log.

The mailbox thread reference is used only to locate the record and must be protected like other account information.

## Monthly retention review

Japhet Palmare conducts the review once each calendar month.

1. Open the deletion-review log and the mailbox label `KSL/Service/Closed`.
2. Identify every record whose deletion-due date is on or before the review date.
3. Check whether the thread was reopened or moved into an active engagement. If it is genuinely active again, record the reason and new status; do not silently change the original closure date.
4. Check for an approved exception or legal hold. Confirm that its reason, scope, owner, and next review date are still current.
5. Delete every eligible KSL-controlled copy as described below.
6. Update only the minimal review-log fields.
7. Check that every closed mailbox thread has a log entry and every log entry still points to an existing thread or a documented deletion.
8. Review open inquiries for genuine activity. Close inactive inquiries when no further action is expected, then start their 12-month period from the recorded closure date.

A missed monthly review must be completed as soon as practical. The 12-month limit does not reset because a review was late.

## Deleting KSL-controlled copies

For an eligible service inquiry:

1. Delete the full inquiry thread from Inbox, Archive, Sent, Drafts, and any manually created folder or label where a copy exists.
2. Delete downloaded attachments, local exports, screenshots, printed copies, and working notes that contain the inquiry, unless an approved exception applies.
3. Remove the message from Trash or Deleted Items when the mailbox supports immediate permanent deletion.
4. Check whether the inquiry was copied into a quotation, client folder, task system, or backup controlled by KSL. Delete the copy or document why a narrowly scoped part must be retained.
5. Where the applicable provider offers a supported deletion request or control, use it and record the outcome. Do not claim provider deletion unless it is confirmed.
6. Mark the log entry `deleted` with the completion date. Do not retain the inquiry content as evidence of deletion.

Deleting a label alone is not deletion. Deleting the mailbox copy does not automatically delete Resend, Vercel, mailbox-provider, subprocessor, or backup records.

## Access, correction, and deletion requests

Requests are received at `japhmiguel@gmail.com`.

1. Assign a non-identifying request ID and record the received date and status without copying the request's full contents into the review log.
2. Prefer verification by replying to the same address used for the original submission.
3. Ask for only the minimum additional information needed to locate the record or prevent disclosure/deletion to the wrong person, such as the approximate date and form category.
4. Search the KSL inbox, sent mail, trash, labels, approved exports/backups, and relevant provider records.
5. For access, provide only the requester's own information and check that unrelated customer or security information is removed.
6. For correction, update the KSL-controlled record where correction remains useful and notify relevant processors when appropriate and supported.
7. For deletion, follow the deletion steps above unless an approved exception applies.
8. Explain any record that cannot be deleted immediately, including the system, reason, expected expiry or next review, and whether it is restricted from ordinary use.
9. Confirm completion without including sensitive internal details or another person's information.

Response-time targets have not been set in this procedure and require owner approval or legal advice. Requests must still be handled without avoidable delay.

## Exceptions and legal holds

An exception must be specific and documented. Possible reasons include an applicable accounting or tax requirement, an active contract, a live dispute, or the establishment, exercise, or defence of a legal claim.

Before applying an exception, the operator must record:

- the non-identifying record ID;
- the source and reason for the requirement;
- the minimum records covered;
- the person who approved it;
- the date applied; and
- a next review or expiry date.

Do not retain an entire inquiry thread when only one document is required. Restrict use of held records to the documented reason. Review every exception monthly and delete the record when the reason ends. Seek professional advice rather than inventing a legal hold when the requirement is uncertain.

## Minimal deletion-review log

A simple protected CSV, spreadsheet, or document is sufficient; it must not be public or committed to the repository.

| Field | Example |
| --- | --- |
| Record ID | `KSL-SI-2026-001` |
| Mailbox thread reference | Provider thread identifier |
| Closure date | `2026-10-29` |
| Deletion due | `2027-10-29` |
| Status | `closed`, `exception`, or `deleted` |
| Exception code | Blank unless required |
| Next review | Date, if an exception applies |
| Last reviewed | Review date |
| Deleted on | Completion date |

Do not include names, addresses, phone numbers, URLs, messages, attachments, or full email headers. Access is limited to the operator. The retention period for the minimal deletion-review log itself remains an owner decision.

## Tool submissions and newsletter records

The 12-month closed-inquiry rule does not automatically apply to tool submissions or newsletter requests.

Until the operator approves fixed periods:

- keep tool submissions only while editorial review or necessary follow-up is active, and include them in periodic necessity reviews;
- keep newsletter addresses only while the person remains subscribed or the requested updates continue;
- action unsubscribe and deletion requests on KSL-controlled copies; and
- document any provider-controlled limitation without promising immediate deletion.

The operator must approve fixed maximum periods and align the public privacy notice before treating this item as complete.

## Third-party limitations to verify

At least when the provider plan or terms change, and during periodic privacy reviews, verify:

### Vercel

- what request, function, firewall, and deployment logs are retained on KSL's plan;
- whether form bodies or personal information can appear in any enabled logging or observability product;
- available deletion or support-request controls;
- subprocessors and processing locations; and
- whether plan-specific data-processing terms apply.

### Resend

- the retention period for email content, delivery events, logs, and backups on KSL's actual plan;
- whether an individual email and associated event data can be deleted through the dashboard, API, or support;
- the effect of account termination;
- subprocessors and storage/processing locations; and
- whether deleting a mailbox copy has any effect on Resend records—it must not be assumed.

### Mailbox provider and backups

- Trash or Deleted Items retention and permanent-deletion behavior;
- backup, archive, export, and account-recovery copies;
- administrator or delegated access;
- available search and deletion controls; and
- the provider's process for privacy or deletion assistance.

Record the verification date, source, applicable plan, result, and next review date without copying customer information into the record.
