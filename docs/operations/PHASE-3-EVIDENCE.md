# Phase 3 / Gate M3 - Evidence

- **Date:** 22/11/2026
- **Branch:** `dang`
- **Production DB:** Supabase `pscjbvjcprvzfkawflql`

## Closed

- 3 demo teacher profiles exist with sample badges/disclaimers.
- 8 published test courses carry the `Khóa mẫu` label; cover styles are populated.
- 5 educational community posts are live under the Teacher Demo account.
- 0 abusive/test posts are public; 3 older posts remain hidden.
- Grading median measured from production: **0.02 hours** across 2 graded submissions.
- Teacher authoring now includes:
  - guided templates;
  - live public-page preview;
  - 6-item publish checklist;
  - per-course outcomes and sample feedback;
  - cover fallback styles;
  - linked draft revision, with the previous version hidden after approval.
- Migrations applied and repaired:
  - `20261122093000_course_authoring_proof`
  - `20261122094000_course_revision_link`

## Still open

- **Reports:** the report table has 0 rows, so the 24-hour resolution window has no evidence.
- **Studio export rate:** exports are not persisted or tracked, so `≥20%` cannot be measured.
- **Teacher/admin UAT:** queue, grading and audit UI checks need demo-account credentials.
- **Deployment:** the new API fields/endpoints exist on `dang`, not on the deployed backend; live teacher publish/revision verification is pending deployment.

## Verification

- `npm run lint`: PASS
- `npm test -- --run`: 110/110 PASS
- `npm run build`: PASS
- `dotnet build server/Linea.slnx`: PASS
- `npm run test:teacher-authoring`: PASS
- `npm run test:public-proof`: PASS
- `npm run test:learning-loop`: PASS
- `npm run test:a11y`: PASS

M3 is **not closed** until report/export evidence and account-based teacher/admin UAT are recorded.
