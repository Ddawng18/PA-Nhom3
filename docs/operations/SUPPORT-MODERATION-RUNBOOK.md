# LINEA — Support and moderation runbook

## 1. Support channels and triage

| Severity | Examples | First response | Resolution target |
|---|---|---|---|
| P0 | Payment grants wrong entitlement; auth outage; data leak | 15 minutes | 4 hours |
| P1 | Cannot log in; cannot submit assignment; course page unavailable | 1 hour | 24 hours |
| P2 | Broken image/video; wrong metadata; isolated UI bug | 1 business day | 3 business days |
| P3 | Copy/design request; feature idea | 3 business days | Backlog review |

Record every ticket with: account email, course/order ID, page URL, device/browser, time, screenshot, and whether the issue is reproducible.

## 2. Payment and entitlement

1. Check `PAYMENT_MODE` and `/api/health/preflight`.
2. For ZaloPay sandbox, never treat redirect as proof of payment. Confirm via callback or backend query.
3. If an order is `PENDING` past 15 minutes, do not create a second order. Run status reconciliation first.
4. If a paid order is `SUCCEEDED` but enrollment is missing, inspect order, enrollment and payment transaction before changing data.
5. Refund is not implemented. Do not promise a refund until the refund flow and provider procedure are approved.

## 3. Authentication and email

- Password reset: verify the account email and use the Supabase reset flow.
- Google login: check provider status in Supabase; do not ask users to share passwords.
- Email not received: check spam, SMTP/preflight status, and whether the account email is confirmed.
- Never ask for a password, service-role key, or payment secret in support chat.

## 4. Content and media

- Missing video: verify the lesson URL is HTTPS and supported (YouTube/Vimeo). Test the URL in an incognito window.
- Missing cover: check the uploaded image URL; the fallback cover style should still render.
- Teacher course issue: confirm ownership, course status, and whether the change belongs to a draft revision.
- Never edit published course content directly in production to bypass the revision flow.

## 5. Moderation

1. Every report is reviewed within 24 hours.
2. Hide immediately for abuse, spam, personal data, or copyright risk.
3. Record the reason and reviewer; do not delete evidence before review.
4. Notify the author with the rule and the action.
5. Appeal: a second administrator reviews within 2 business days.
6. Repeated violations: lock the account and escalate.

## 6. Incident and rollback

1. Declare incident owner and start time.
2. Stop writes if entitlement or payments may be wrong.
3. Preserve logs and affected order/submission IDs.
4. Roll back the application before rolling back data.
5. Do not delete orders, submissions or audit rows during rollback.
6. Publish a short incident note with impact, timeline, fix and prevention.

## 7. Privacy and access

- Collect only the data needed to resolve the ticket.
- Do not expose another learner's submission, email, grades or payment details.
- Use least-privilege access; service-role keys stay in server environment only.
- Delete or anonymize user data only through an approved request and recorded procedure.
