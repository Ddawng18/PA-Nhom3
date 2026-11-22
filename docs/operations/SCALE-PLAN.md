# LINEA — Scale and performance plan

## Current shape

- React/Vite SPA on Vercel, route-level lazy chunks.
- ASP.NET Core API on Render, PostgreSQL on Supabase.
- Media in Supabase Storage; demo payments through sandbox providers.
- Public catalog is read-heavy; learning writes are scoped per learner/course.

## Verified baseline

- Public proof image reduced from **2.5 MB PNG** to **146 KB / 75 KB JPEG** with responsive `srcset`.
- Route splitting is present in the production build.
- Relevant indexes exist for public courses, community feeds, enrollments, lesson progress, submissions, grades and orders.
- Payment protocol checks: 28/28 pass.

## Thresholds and actions

| Signal | Action |
|---|---|
| API p95 > 800 ms (excluding cold start) | Profile the slow endpoint; add/verify index; add short-lived cache for public catalog |
| Catalog response > 200 KB | Keep page size bounded; return only card fields for list endpoints |
| Cold starts on Render free tier | Move API to a paid always-on instance before a paid pilot |
| LCP > 2.5 s | Preload the hero asset; keep below-fold images lazy; avoid large PNGs |
| INP > 200 ms | Split heavy Studio/editor code; defer non-critical work; profile long tasks |
| CLS > 0.1 | Reserve width/height for images, embeds and sticky regions |
| Storage growth > plan quota | Enforce upload size/type limits; archive unused media |
| Submission queue > 100 open items | Add teacher queue pagination and grading filters; alert on median > 24h |
| Error rate > 1% for 5 minutes | Freeze deploys; check Render/Supabase status; follow rollback runbook |

## Next performance work

1. Add public catalog response caching with explicit invalidation on course approval/update.
2. Add real-user monitoring for LCP, INP and CLS; do not infer from build size.
3. Run Lighthouse on home, catalog, course detail, pricing and lesson pages.
4. Add database query timing around catalog, dashboard and submission queue.
5. Run load tests for catalog reads, login and assignment submission before a paid pilot.
6. Move the Render service off the free tier before real payment traffic.

## Experiments

A/B tests should only start after measurement exists:

- hero promise;
- primary CTA copy;
- course-card proof (cover, teacher, trial lesson);
- checkout CTA placement on course detail.

Every experiment needs a hypothesis, assignment mechanism, success metric, guardrail metric, sample-size estimate and stop rule.

## Rollback posture

- Application rollback first; data rollback only with a reviewed script.
- Never drop migration columns or delete orders/submissions to recover an incident.
- Keep the previous deployment available and record its URL.
