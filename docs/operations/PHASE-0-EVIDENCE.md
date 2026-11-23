# Phase 0 / Gate M0 - Evidence

- **Date:** 22/11/2026
- **Working branch:** `dang`
- **Deployed branch:** `develop` at `5963623`
- **Commit under test:** `5963623` (`feat: make demo teacher profiles editable`)
- **Production frontend:** https://pa-nhom3.vercel.app
- **Branch preview:** https://pa-nhom3-git-dang-nguyenhuynhdang000-gmailcoms-projects.vercel.app
- **Production API:** https://linea-api-6pw5.onrender.com

## Gate status

**M0 is OPEN.** Deployment is verified, but rollback rehearsal, analytics, manual UAT and
database-backup confirmation are not yet evidenced.

## P0.1 Demo teacher placeholders - PASS

- Demo profiles are committed and deployed to production.
- The production main bundle contains the editable store key `linea-demo-teachers-v1`.
- Profiles keep the visible `Hồ sơ mẫu` / `Dữ liệu mẫu` labels and disclaimer.
- `npm run test:teacher-profiles` passes, including admin edit, local persistence, public update,
  reset, not-found and responsive checks.

## P0.2 Public content cleanup - PASS

- Production catalog: `totalCount = 8`.
- `11567 boxes` and the unfinished `[DEMO]...cccc` course are hidden.
- Production community API returns `[]`; post `4` is hidden.
- Cleanup backup and rollback SQL are recorded in `docs/operations/DATA-CLEANUP.md`.

## P0.3 Latest commit deployment - PASS

- `develop` was fast-forwarded to `5963623` and pushed.
- GitHub reports the Vercel deployment for `5963623` as successful.
- Production and preview smoke tests pass:
  - frontend HTML has `id="root"`;
  - `/api/health` returns `ok`;
  - catalog returns items;
  - community returns an array.
- Production Playwright check passes: home showcase has 3 cards; `/teachers/nmratist` renders the
  demo labels and disclaimer.
- Production bundle `/assets/index-Bk4AatJR.js` contains the editable demo store key
  `linea-demo-teachers-v1`.
- Render backend is healthy and `/api/health/preflight` reports `ready=true`, Postgres connected,
  storage available and ZaloPay sandbox configured. `5963623` has no backend changes relative to
  the previous `develop` commit, so the backend commit is unchanged.

## P0.4 Production smoke and rollback rehearsal - PARTIAL (smoke PASS, rollback BLOCKED)

- Production smoke test passes:

```text
PASS frontend HTML: ok
PASS /api/health: ok
PASS /api/catalog/courses: 1 item(s)
PASS /api/community/posts: 0 post(s)
```

- Rollback rehearsal has **not** run. There is no staging project or deployment CLI/auth available
  in this workspace; the documented path is Vercel/Render dashboard promotion of a previous build.

## P0.5 Baseline funnel events - BLOCKED

- No analytics provider, SDK, measurement ID or event pipeline exists in the repository.
- The required visit, course view, signup, lesson start/completion, Studio export, assignment
  submission and like/comment events are therefore not firing.
- A provider choice and credentials are required before instrumenting production events; adding a
  local-only counter would not provide a trustworthy baseline.

### Read-only baseline snapshot (production, 22/11/2026)

| Measure | Value |
|---|---:|
| Users | 21 |
| Students / teachers / admins | 12 / 6 / 3 |
| Published / hidden courses | 8 / 18 |
| Enrollments | 37 |
| Learners with lesson progress | 8 |
| Completed lesson records | 18 |
| Assignment submitters | 2 |
| Assignment submissions / grades | 3 / 2 |
| Teacher profiles / approved | 4 / 4 |
| Visible / all community posts | 0 / 3 |
| Demo orders / succeeded | 16 / 6 |

This snapshot is a database baseline, not a substitute for firing funnel events.

## P0.6 Manual UAT - BLOCKED

- `LINEA_TEST_EMAIL` and `LINEA_TEST_PASSWORD` are not set, so student/teacher flows cannot be
  exercised against the deployed app.
- `TEST_DATABASE_URL` is not set, so the dedicated browser suites that need a test database cannot
  run.
- Two-teacher ownership needs two teacher accounts and their credentials.
- Google login is disabled according to `docs/supabase-setup.md`.
- Payment preflight is ready, but a sandbox transaction needs a student test account and a sandbox
  checkout run; no transaction has been completed.
- Studio real-device testing needs a physical mobile device. Local viewport tests are not a
  substitute.
- Reset-email delivery needs a mailbox and a test account.

## P0.7 Supabase migrations and backup - PARTIAL

- `supabase migration list` shows all 13 remote versions applied.
- Three remote versions (`20261104115545`, `20261104122006`, `20261105100739`) have no local file.
  Pull or placeholder them before the next `db push`.
- Database backup status was not verified; dashboard/management-API access is not available in this
  workspace.

## Required to close M0

1. Provide Vercel/Render access or run the staging rollback rehearsal manually and record the result.
2. Choose an analytics provider and provide its project token/measurement ID.
3. Provide two teacher test accounts (plus a student account for payment/reset/learning UAT) and
   enable Google login.
4. Confirm Supabase backup status and resolve the three remote-only migration versions.

P1 and P2 were subsequently authorised by the owner while these M0 evidence items remain open.
