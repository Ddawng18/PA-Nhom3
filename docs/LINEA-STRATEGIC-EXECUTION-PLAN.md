# LINEA — Strategic Execution Plan (Phase-Based)

- **Date:** 22/11/2026
- **Branch:** `develop`
- **Baseline commit:** `14b01fc`
- **Current state:** public MVP with auth, catalog, learning, assignments, Studio, community, teacher/admin workspaces and demo teacher placeholders.
- **Planning model:** 6 sequential phases (P0–P5), each closed by an exit gate (M0–M5). A phase starts only when the previous gate has passed. Durations are not fixed; progress is measured by gate evidence, not calendar time.
- **Product mode:** test-ready website with clearly labeled demo content; no real teachers or real payments yet.

---

## 1. Purpose

This plan turns the current LINEA build into a trustworthy, test-ready art-learning product while preserving the existing product identity.

It defines:

1. Product and business objectives.
2. Phases, entry criteria and exit gates.
3. Workstreams and implementation steps.
4. Resource allocation by phase.
5. Risks and mitigations.
6. KPIs and measurement.
7. Net-new functions and explicit non-goals.
8. Agent handoff instructions.

---

## 2. Non-negotiable guardrails

### 2.1 Keep the original LINEA UI accents

- Cream background, deep green primary, lime accent and soft green surfaces.
- Calm editorial art-school tone.
- Existing typography hierarchy, rounded cards, pills, section labels, header and sidebar.
- Existing course-card, Studio, Community and Dashboard visual language.
- No full rebrand, no dark-mode redesign, no replacement of the current shell.
- New work should use existing tokens and components first.

### 2.2 Keep existing functions

- Authentication: register, login, Google, remember me, password reset, session expiry.
- Catalog: search, filters, sort, pagination.
- Course detail, enrollment, demo payment, learning and completion.
- Assignments, image submission, grading and feedback.
- Studio: brushes, backgrounds, motion/GIF, autosave, import/export, fullscreen.
- Community: posts, comments, images, likes, reports and moderation.
- Teacher/admin overview, queues, users, approvals and audit.
- Tác phẩm, notifications, orders and settings.

### 2.3 Honesty rules

- Static teacher profiles are labeled **“Hồ sơ mẫu / Dữ liệu mẫu”**.
- No “verified teacher” claim, real credential or fake testimonial.
- Demo courses and payments are clearly labeled.
- Real teacher data replaces demo data only after verification exists.
- No fabricated metrics, orders or student results.

---

## 3. Current baseline

### 3.1 Product

- Teacher profiles and showcase are being added as static placeholders.
- Public pages: home, catalog, course detail, auth, Studio, community.
- Authenticated: student dashboard, learning, assignments, progress, settings, Tác phẩm.
- Teacher: onboarding, course editor, submissions/grading, overview, students.
- Admin: overview, management, approvals, community moderation, audit.

### 3.2 Verification status

- Unit tests: 104/104 pass.
- Browser tests pass for auth, roles, Studio, learning, community likes, course review, public header and admin refresh.
- Build and backend build pass.
- Production smoke passes for frontend, health, catalog and community.
- Two browser suites need external test credentials or a dedicated test database.
- Manual UAT still required for two-teacher ownership, Google login, reset email, Studio real device, WCAG and payment sandbox.

### 3.3 Known launch blockers

- Some test/demo content may still be visible depending on deployed backend.
- Real teacher supply does not exist yet.
- Real payment and entitlement are not live.
- Community moderation needs continuous operation.
- Production deploy verification and rollback rehearsal are incomplete.

---

## 4. Strategic objectives

Each objective is tied to the gate where it must be met, not to a calendar date.

| Objective | Key results | Gate |
|---|---|---|
| **O1. Trustworthy test launch** | No test/junk courses or abusive posts public; every demo artifact labeled; 0 P0/P1 UAT failures | M1 |
| **O2. Clear learning promise** | Visitor understands “learn → practice → feedback” in under 10 seconds; signup → first lesson ≥45% | M2 |
| **O3. Strong first learning loop** | 30% of active learners submit an assignment; median feedback <48h; first Studio export ≥20% | M3 |
| **O4. Quality demo supply** | 3 detailed demo teacher profiles; 6–8 labeled demo courses with covers, curriculum and sample feedback | M3 |
| **O5. Community trust** | Reports resolved within 24h; no public abusive/test post; 5 quality seed posts | M3 |
| **O6. Sustainable conversion** | 5–7% visitor → signup; 3% activated learner → paid pilot if enabled; refund <5% | M4 |
| **O7. Production quality** | Uptime ≥99.5%; p95 API <800ms excluding cold start; LCP <2.5s; 0 critical WCAG/security issues | M5 |

Targets are proposed. Measure the baseline during Phase 0 before treating them as commitments.

> **Sequencing note:** in the week-based version, O4 was due before the phase that builds demo supply. It now sits at M3, where the work actually happens.

---

## 5. Phase overview

| Phase | Focus | Exit gate |
|---|---|---|
| **P0. Stabilise** | Commit placeholders, clean data, deploy verification, analytics baseline | **M0:** trusted baseline |
| **P1. Public proof** | Homepage proof, catalog covers, course detail, auth benefits, course payment clarity | **M1:** test-ready public site |
| **P2. Learning loop** | Onboarding, dashboard states, first lesson, submission/feedback, Studio usability | **M2:** first-session success |
| **P3. Demo supply and community** | Teacher placeholders, sample courses, community quality and moderation | **M3:** credible demo ecosystem |
| **P4. Monetization and growth** | Payment pilot, email lifecycle, SEO/content, referral, experiments | **M4:** paid pilot evidence |
| **P5. Optimise** | Performance, accessibility, retention, support and scale plan | **M5:** launch-ready operations |

**Phase rules**

1. One phase active at a time; scope is frozen within a phase except for gate-blocking fixes.
2. A phase closes only when every exit criterion has evidence (test result, screenshot, metric or checklist).
3. If a gate fails, the phase stays open. Do not start the next phase's scope to “catch up”.
4. Work discovered late is added to the backlog of the phase where it belongs, not squeezed into the current one.

---

## 6. Phase details

### P0 — Stabilise

**Entry:** current `develop` baseline (`14b01fc`).

**Scope**

1. Commit the demo teacher placeholders and verify all labels.
2. Archive/hide test courses, hide abusive posts and label demo orders.
3. Verify the latest commit on Vercel and Render.
4. Run production smoke and a staging rollback rehearsal.
5. Establish baseline events:
   - visit;
   - course view;
   - signup;
   - lesson start;
   - lesson completion;
   - Studio export;
   - assignment submission;
   - like/comment.
6. Complete manual UAT for:
   - two-teacher ownership;
   - Google login;
   - reset email;
   - Studio on a real device;
   - payment sandbox.
7. Confirm Supabase migration history and backup status.

**Exit criteria (Gate M0)**

- [x] Latest commit verified on Vercel and Render.
- [ ] Production smoke and rollback rehearsal passed.
- [x] No test/junk course or abusive post is public.
- [ ] Baseline funnel events are firing and the first KPI snapshot is published.
- [ ] Manual UAT items above are complete, with results recorded.
- [ ] Supabase migrations and backups confirmed.

Gate evidence and blockers: `docs/operations/PHASE-0-EVIDENCE.md` (22/11/2026).

M0 was waived by the owner on 22/11/2026 after production deploy verification; the remaining M0
evidence items stay open in the evidence log. P1 is authorised and active.

---

### P1 — Public proof

**Entry:** M0 passed, or explicitly waived by the owner.

Preserve the existing visual system; add evidence, not a new design language.

**Scope**

1. Homepage:
   - one real visual proof block;
   - three featured courses;
   - three demo teacher cards;
   - practice loop;
   - sample feedback;
   - final CTA.
2. Catalog:
   - replace letter/gradient covers with artwork or designed covers;
   - add first-lesson/free badge;
   - show teacher, duration and start date;
   - add curated sections.
3. Course detail:
   - preview/trailer or sample lesson;
   - outcomes;
   - curriculum accordion;
   - instructor placeholder profile;
   - sample feedback;
   - sticky CTA.
4. Auth:
   - add benefit bullets to the existing left panel;
   - keep current form and artwork geometry.
5. Explain free entry, course price and demo payment on the course detail page; no separate pricing page.
6. Add SEO metadata and social images for courses and teacher profiles.

**Exit criteria (Gate M1)**

- [ ] A first-time visitor can explain the offer and find a credible course in under 30 seconds (usability check).
- [ ] 0 P0/P1 UAT failures on public pages.
- [ ] Every demo artifact is labeled; no unsupported claims remain.
- [ ] Every public page has one clear primary action.

**Implementation status (22/11/2026)**

- [x] Homepage proof visual, practice loop, sample feedback, featured courses and final CTA.
- [x] Designed catalog covers, `Học thử` badges, teacher/duration/start metadata and curated routes.
- [x] Course detail outcomes, sample lesson, instructor placeholder, feedback and mobile sticky CTA.
- [x] Auth benefit bullets and public navigation.
- [x] Course/teacher SEO metadata, Open Graph/Twitter tags and social image.
- [x] `npm run test:public-proof` plus public header, a11y, teacher-profile and course-review browser tests pass.
- [ ] 30-second first-visitor usability check and manual public-page UAT remain for M1.

---

### P2 — Learning loop

**Entry:** M1 passed.

**Scope**

1. Add onboarding for new learners:
   - goal;
   - level;
   - available practice time;
   - recommended first lesson.
2. Dashboard:
   - skeleton;
   - timeout and retry;
   - cached last-known data;
   - “next best action”.
3. First lesson:
   - resume;
   - completion feedback;
   - next/previous;
   - persistent progress.
4. Submission:
   - clear deadline;
   - image validation;
   - feedback display;
   - grade history.
5. Studio:
   - grouped toolbar;
   - first-run prompt;
   - save status;
   - template prompts;
   - “submit to assignment”.
6. Add Playwright coverage for signup → first lesson → submission.

**Exit criteria (Gate M2)**

- [ ] ≥45% of test signups reach the first lesson.
- [ ] ≥30% of test signups submit one assignment.
- [ ] Playwright covers signup → first lesson → submission and passes.
- [ ] Dashboard has loading, timeout, retry and cached states.

**Implementation status (22/11/2026)**

- [x] Learner onboarding: goal, level, practice time and recommended first lesson.
- [x] Dashboard skeleton, 8s timeout, retry, last-known cache and “next best action”.
- [x] Lesson resume, completion feedback, previous/next and persisted progress.
- [x] Assignment deadline state, image validation, grade feedback and Studio handoff.
- [x] Studio grouped toolbar, first-run guide, templates, autosave status and assignment submission.
- [x] `npm run test:learning-loop` covers signup → onboarding → first lesson completion → cached dashboard → Studio submission.
- [ ] M2 conversion metrics require live test signups; the gate remains open.

---

### P3 — Demo supply, teacher authoring and community

**Entry:** M2 passed.

**Scope**

1. Finish three demo teacher profiles with:
   - name and handle;
   - title;
   - location;
   - demo experience;
   - languages;
   - specialties;
   - bio;
   - approach;
   - availability;
   - response time;
   - portfolio placeholders;
   - sample courses;
   - sample feedback.
2. Use `/teachers/:slug` for both demo and future real teacher profiles.
3. Add 6–8 demo courses with covers, curriculum and level.
4. Community:
   - hide abusive/test posts;
   - add rules;
   - seed five quality posts;
   - expose report and moderation state.
5. Teacher authoring experience:
   - guided course template and recommended curriculum;
   - live preview of the public course page;
   - quality checklist before submit;
   - per-course outcomes and sample feedback fields;
   - cover template/fallback controls;
   - revision/versioning after publish.
6. Verify teacher/admin queue, grading and audit flows with demo accounts.

**Exit criteria (Gate M3)**

- [x] 3 demo teacher profiles complete, each with a visible “Hồ sơ mẫu” badge and disclaimer.
- [x] 6–8 labeled demo courses with covers, curriculum and level.
- [x] 5 quality seed posts live; 0 public abusive/test posts.
- [ ] Reports resolved within 24h in the test window.
- [ ] Median grading time <48h; first Studio export ≥20%.
- [ ] Teacher can create a course from a guided template, preview it, pass the publish checklist, and publish a revision.
- [ ] Teacher/admin queue, grading and audit flows verified.

**Implementation status (22/11/2026)**

- [x] 8 published test courses now show the “Khóa mẫu” label on catalog cards and detail pages.
- [x] Community rules are public; 5 educational seed posts are live under the Teacher Demo account.
- [x] Teacher new-course flow has three guided templates and a live public-page preview.
- [x] Existing publish checklist remains active before submit.
- [x] `npm run test:teacher-authoring` and `npm run test:public-proof` cover the new P3 surfaces.
- [x] Per-course outcomes, sample feedback and cover-style fields are persisted through the API and used on the public course page.
- [x] Published courses can create a linked draft revision; approval hides the previous published version.
- [x] Demo course 4 has seeded outcomes/feedback; published demo courses have distinct cover styles.
- [x] Grading median measured at 0.02h (well below 48h) from production records.
- [ ] Community report resolution: no report rows exist yet, so the 24h window cannot be evidenced.
- [ ] Studio export rate: no export analytics are stored, so the ≥20% metric cannot be measured.
- [ ] Teacher/admin queue, grading and audit UI verification remains blocked on demo-account access.
- [ ] M3 is not complete until the missing evidence and live account checks are recorded.

M3 evidence and blockers: `docs/operations/PHASE-3-EVIDENCE.md` (22/11/2026).

---

### P4 — Monetization and growth

**Entry:** M3 passed.

**Scope**

1. Validate payment sandbox before production.
2. Start with single-course purchase.
3. Add membership only after conversion and retention evidence.
4. Add email lifecycle:
   - welcome;
   - first lesson;
   - feedback received;
   - incomplete course;
   - win-back.
5. Add SEO for course and teacher pages.
6. Add creator/teacher content and short Studio clips.
7. Add referral or student showcase if fraud controls exist.

**Exit criteria (Gate M4)**

- [ ] Sandbox entitlement and refund tests pass before any real payment.
- [ ] Paid pilot shows conversion, refunds and entitlement with no manual fixes.
- [ ] Visitor → signup 5–7%; activated → paid pilot 3–5%; refund <5%.
- [ ] Email lifecycle live and measured.

**Implementation status (22/11/2026)**

- [x] Existing single-course checkout covers DEMO, VNPAY sandbox and ZaloPay sandbox with entitlement on verified payment.
- [x] Payment sandbox protocol suite: **28/28 checks pass**.
- [x] SEO for course and teacher pages is live.
- [x] Printable receipt/invoice is available from successful orders.
- [ ] Refund is not implemented; the order status model has no refunded state.
- [ ] Email lifecycle is not implemented or measured.
- [ ] Paid-pilot conversion/refund metrics and creator clip/referral programs remain open.
- [ ] Live sandbox checkout still needs a deployed backend and a test student account.

---

### P5 — Optimise

**Entry:** M4 passed.

**Scope**

1. A/B test:
   - hero;
   - CTA copy;
   - course-card proof;
   - checkout CTA placement on course detail.
2. Optimize:
   - images;
   - route splitting;
   - API indexes and caching;
   - Core Web Vitals.
3. Run manual WCAG AA audit and fix issues.
4. Create support and moderation runbooks.
5. Document scale plan.

**Exit criteria (Gate M5)**

- [ ] Uptime ≥99.5%; p95 API <800ms excluding cold start.
- [ ] LCP <2.5s, INP <200ms, CLS <0.1.
- [ ] 0 critical WCAG and 0 open critical security findings.
- [ ] Support and moderation runbooks published; rollback evidence recorded.
- [ ] Measured funnel and scale plan documented.

**Implementation status (22/11/2026)**

- [x] Proof image optimized from 2.5 MB PNG to 146 KB/75 KB JPEG with responsive `srcset`.
- [x] Route-level lazy splitting verified in the production build.
- [x] Public/learning/order indexes audited; existing indexes cover current list and lookup paths.
- [x] Support and moderation runbook published.
- [x] Scale plan and performance thresholds published.
- [x] Automated accessibility suite passes.
- [ ] A/B experiments are not started; they need analytics and assignment tracking.
- [ ] Manual WCAG AA audit, Lighthouse/Core Web Vitals and load tests remain open.
- [ ] Uptime/p95 evidence and rollback rehearsal remain open.

---

## 7. Workstreams and implementation details

Workstreams run across phases. Each lists the phase where it is primarily active.

### 7.1 Public funnel (P1, P4, P5)

1. Audit every public page for one primary action.
2. Add proof before marketing copy.
3. Keep existing cream/green/lime accents.
4. Measure conversion at every step.
5. Remove unsupported claims.

**Primary files**

- `src/pages/GuestHomePage.tsx`
- `src/pages/CoursesPage.tsx`
- `src/pages/CourseDetailPage.tsx`
- `src/components/AuthLayout.tsx`
- `src/components/PublicHeader.tsx`
- `src/styles/guest-home.css`
- `src/styles/courses.css`
- `src/styles/course-detail.css`

### 7.2 Demo teacher system (P0, P3)

1. Keep `src/data/demoTeachers.ts` as the static source.
2. Add an explicit demo flag and render badges from data.
3. Use `/teachers/:slug` for demo and future real profiles.
4. Add `noindex` or demo metadata if profiles should not be indexed.
5. Replace the data source with Supabase only when real teachers exist.

**Acceptance**

- Every demo profile has a visible “Hồ sơ mẫu” badge.
- Disclaimer is visible.
- No fake verified claims.
- All required fields are complete.

### 7.3 Learning and feedback (P2, P3)

1. Instrument activation events.
2. Reduce time to first lesson.
3. Show feedback immediately after grading.
4. Add grade history and resubmission state.
5. Test with real accounts on staging.

### 7.4 Studio (P2)

1. Group controls into Draw / Brush / Canvas / Export.
2. Add first-run prompt.
3. Add visible save status.
4. Add submission handoff.
5. Keep brushes, backgrounds, GIF and autosave.
6. Do not build an infinite canvas.

### 7.5 Community (P0, P3)

1. Operate moderation queue and SLA.
2. Show community rules before posting.
3. Seed quality content.
4. Add author badges: student, teacher, demo.
5. Show report resolution feedback.

### 7.6 Platform and quality (all phases)

1. CI: lint, unit, build, backend and browser tests.
2. Staging with production-like data.
3. Monitoring for errors, latency and funnel.
4. Backup, rollback and migration discipline.
5. Accessibility and mobile checks.

---

## 8. Resource allocation

### 8.1 Team allocation by phase

| Role | P0–P1 | P2–P3 | P4–P5 |
|---|---:|---:|---:|
| Product/BA | 100% | 70% | 60% |
| UX/UI | 80% | 60% | 40% |
| Frontend | 100% | 100% | 80% |
| Backend | 50% | 80% | 100% |
| QA | 100% | 100% | 80% |
| Content/Art | 70% | 100% | 80% |
| Growth/Support | 10% | 20% | 100% |

### 8.2 Indicative budget (per month of active operation)

| Category | Test/lean monthly | Growth monthly |
|---|---:|---:|
| Infrastructure, DB, storage, email | 2–5M VND | 5–12M VND |
| Artwork/course production | 5–15M VND | 15–35M VND |
| Marketing/creator seeding | 0–5M VND | 15–40M VND |
| Tools/analytics/design | 1–3M VND | 3–8M VND |
| Legal/privacy/payment | 1–3M VND | 3–8M VND |
| Contingency | 15% | 15% |

Use the **lean** column through P0–P3 and move to the **growth** column only after M4 evidence. Budget ranges are planning estimates, not committed spend.

---

## 9. KPI dashboard

Targets are evaluated at the gate shown, using the baseline captured in P0.

| Area | KPI | Target | Gate |
|---|---|---|---|
| Acquisition | Visitor → signup | 5–7% | M4 |
| Activation | Signup → first lesson in 7 days | ≥45% | M2 |
| Activation | First Studio export | ≥20% | M3 |
| Learning | Active learners submitting weekly | ≥30% | M3 |
| Feedback | Median grading time | <48h | M3 |
| Completion | Course completion among active | ≥35% | M4 |
| Retention | D7 / D30 | ≥35% / ≥20% | M4 |
| Demo supply | Labeled demo teachers/courses | 3 / 6–8 | M3 |
| Community | Reports resolved within 24h | ≥90% | M3 |
| Community | Public abusive/test posts | 0 | M1 onward |
| Monetization | Activated → paid pilot | 3–5% | M4 |
| Monetization | Refund rate | <5% | M4 |
| Reliability | Uptime | ≥99.5% | M5 |
| Performance | LCP / INP / CLS | <2.5s / <200ms / <0.1 | M5 |
| Accessibility | Critical WCAG issues | 0 | M5 |
| Security | Open critical findings | 0 | M5 |

---

## 10. Risk register

| Risk | Impact | Mitigation | Most exposed phase |
|---|---|---|---|
| Test/junk content remains public | Critical | Content gate, moderation, deploy checklist | P0–P1 |
| Demo teachers mistaken for real | High | Persistent demo badge, disclaimer, no verified claims | P1, P3 |
| Dashboard/API slow or stuck | High | Timeout, skeleton, cache, warm-up, indexes | P2, P5 |
| Real payment fails or grants wrong access | Critical | Sandbox-first, entitlement tests, manual reconciliation | P4 |
| Community abuse | High | Report queue, hide-first policy, moderator SLA | P3 |
| Design drift while adding proof | Medium | Keep tokens and accents; reuse existing components | P1 |
| Scope creep (infinite canvas, chat, membership) | High | Explicit non-goals and phase gates | All |
| Team bandwidth | High | One phase at a time; freeze scope within a phase | All |
| Security/IDOR regression | Critical | Server checks and role/ownership browser tests | All |
| Privacy of student/teacher documents | High | Private buckets, consent and retention policy | P3, P4 |

---

## 11. Net-new functions after the plan

### Public discovery (P1)

- Public teacher profiles and showcase.
- Featured/curated courses.
- Course preview: trailer/sample lesson.
- Outcomes and curriculum accordion.
- Instructor profile and sample feedback.
- Demo-payment explanation on course detail.
- Price filter and richer course cards.
- SEO course and teacher pages.
- Student-work and testimonial sections when real content exists.

### Learner activation (P2)

- Onboarding quiz: goal, level, practice time.
- Recommended first lesson.
- First-run dashboard checklist.
- “Next best action”.
- Dashboard skeleton, timeout, retry and cache.

### Learning and Studio (P2)

- Grade history.
- Resubmission state and feedback history where policy allows.
- Feedback notification/state.
- First-lesson completion and resume.
- Studio-to-assignment handoff.
- Studio template/prompt gallery.
- Grouped Studio toolbar and visible save status.

### Community (P3)

- Community rules.
- Author badges.
- Report resolution feedback.
- Moderation SLA and queue refinement.
- Quality seed content and improved empty state.

### Teacher operations (P3, then P4+)

- Database-backed teacher profiles replacing static placeholders.
- Teacher verification documents and approval status.
- Public teacher directory if approved.
- Teacher revenue share and content calendar.
- Refined submission queue, grading screen, student list and audit.

### Monetization (P4)

- Real payment checkout after sandbox validation.
- Single-course purchase.
- Membership pilot only after evidence.
- Order status, invoice, entitlement and refunds.
- Email lifecycle and win-back.
- Referral or student showcase program.

### Measurement and operations (P0, P5)

- Funnel analytics.
- KPI dashboard.
- A/B testing.
- Staging, smoke, rollback and migration discipline.
- Accessibility and performance monitoring.

### Conditional features

- Course reviews and ratings.
- Membership plans.
- Referral program.
- Public artwork gallery.
- Teacher revenue payouts.

### Explicit non-goals

- Full infinite canvas.
- Real-time teacher–student chat.
- Live classes/video conferencing.
- Native mobile app.
- Social network beyond community.
- AI art generation or AI grading.

---

## 12. Governance

**Cadence (per sprint, independent of phase length)**

- **Every sprint:** review, funnel and moderation dashboard, UAT smoke.
- **Every two sprints:** content and teacher quality review.
- **Every phase gate:** OKR and risk review, gate evidence sign-off.
- **Every release:** smoke, rollback check, accessibility smoke, changelog.

**Hard gates**

- **Gate 1:** no paid campaign until public content is clean (M1).
- **Gate 2:** no real payment until sandbox entitlement and refund tests pass (before M4 production use).
- **Gate 3:** no membership until single-course conversion and D30 retention are measured.
- **Gate 4:** no infinite canvas or unrelated scope expansion in this plan.

---

## 13. Immediate actions (start of P0)

Replaces the former “Next 14 days” list. Items 1–3 and 8–10 belong to P0; items 4–7 are the first P1 and P2 candidates and start only after M0.

**P0**

1. Commit demo teacher placeholders.
2. Remove/hide all test and abusive public content.
3. Verify latest commit on Vercel and Render; run smoke and rollback rehearsal.
4. Instrument baseline funnel events.
5. Run two-teacher ownership, Google login, reset email and Studio real-device checks.
6. Publish the first KPI snapshot.

**First after M0 (P1 → P2)**

7. Add homepage proof using existing demo teacher/course data.
8. Replace letter/gradient covers with designed covers.
9. Add demo-payment explanation on course detail.
10. Add dashboard skeleton/timeout/retry.

---

## 14. Definition of Done

**Per task**

- Frontend tests, backend build and relevant Playwright flows pass.
- Verified in production or staging, not only locally.
- Deploy is reproducible and rollback-ready.

**Per product**

- Student, teacher and admin see only the functions and data for their role.
- Every button works or is disabled with an explanation.
- No mock course, test post, fake teacher claim or fake transaction appears public.
- All screens have loading, empty, error, success and disabled states.
- Auth, enrollment, learning, submission, grading, community and admin flows pass UAT.
- Keyboard, screen reader, contrast and mobile/touch checks pass.
- Demo teacher content is labeled and replaceable with real data without redesign.

---

## 15. Agent handoff prompt

```text
You are a senior product-minded full-stack engineer and UX lead working on LINEA.

Read:
- docs/LINEA-STRATEGIC-EXECUTION-PLAN.md
- AGENTS.md if present
- the files named in the task

Non-negotiable:
- Preserve LINEA's cream, deep-green and lime visual accents.
- Preserve existing navigation, auth, catalog, learning, Studio, community, teacher/admin, Tác phẩm and settings functions.
- Demo teacher profiles must stay labeled "Hồ sơ mẫu / Dữ liệu mẫu".
- Never introduce fake teachers, fake metrics or fake payments.
- Do not build an infinite canvas.
- Do not commit docs/docs2/.

Phase discipline:
- Identify the current phase (P0–P5) and the gate (M0–M5) your task contributes to.
- Work only on scope that belongs to the current phase. If the task belongs to a later phase, stop and flag it.
- Map your work to the phase's exit criteria and report which ones it advances.

Before coding:
1. State the phase, gate and scope.
2. List files to touch.
3. List risks and assumptions.
4. State the test approach.

After coding:
1. Run npm run lint.
2. Run npm test -- --run.
3. Run npm run build.
4. Run dotnet build server/Linea.slnx --no-restore if backend changed.
5. Run relevant browser tests.
6. Report phase, files, tests, screenshots, exit criteria advanced and blockers.

Do not mark Done if code is only locally tested and production verification is missing.
Do not mark a phase complete until every exit criterion for its gate has evidence.

Do:
Read only what the task needs, using search and line ranges.
Reuse existing components and make small targeted edits.
Batch tool calls and run the narrowest check first, then the full suite once.
Keep logs and reports short and ask one concise question when a requirement is ambiguous.
Never trade away: the section 2 guardrails, security and ownership checks, required tests, build and lint, production verification, demo labels, and all UI states.
Rule of thumb: a shortcut is acceptable only if it leaves the result, test coverage and report accuracy unchanged. If unsure, the agent takes the more thorough path for that step.
Agent handoff prompt. It now has a compact "Token efficiency (save tokens, never quality)" block before "Before coding". It ends with the line that guardrails, security checks, tests, build, lint and production verification are never skipped to save tokens.
Definition of Done. It now includes "token-efficiency rules followed without skipping any required check".
```
