# LINEA - Roadmap các phần còn lại

- **Ngày cập nhật:** 20/11/2026
- **Nhánh hiện tại:** `develop`
- **Commit mới nhất:** `b8a80d0 feat: upgrade studio workspace with autosave and tools`
- **Trạng thái remote:** đã push tới `origin/develop`
- **Frontend:** https://pa-nhom3.vercel.app
- **Backend:** https://linea-api-6pw5.onrender.com
- **Supabase project ref:** `pscjbvjcprvzfkawflql`

Tài liệu này dành cho các thành viên tiếp nhận dự án. Mục tiêu là:

1. Ghi lại chính xác những gì đã xong.
2. Liệt kê toàn bộ việc còn thiếu.
3. Chia roadmap theo phase, có thứ tự thực hiện.
4. Cung cấp prompt chi tiết để một agent khác có thể tiếp tục mà không cần đọc lại toàn bộ lịch sử.

---

## 1. Tóm tắt trạng thái

| Phase | Trạng thái | Ghi chú |
|---|---|---|
| Phase 0 - Baseline | Hoàn thành | Đã inventory, xóa temp file, phân loại UAT |
| Phase 1 - Trust/security | Hoàn thành phần code | Đã deploy; cần regression production đầy đủ |
| Phase 2 - IA/design system | Hoàn thành nền tảng | Role nav, tokens, primitives, atelier layer |
| Phase 3 - Public/auth/learning | Phần lớn hoàn thành | Còn catalog metadata decision và regression |
| Phase 4 - Studio/Community | Đang làm | Studio đã nâng cấp; Community còn like/moderation |
| Phase 5 - Teacher/Admin | Chưa bắt đầu | Cần workspace riêng và API bổ sung |
| Phase 6 - Performance/A11y | Chưa bắt đầu | Bundle ~895 KB, chưa audit WCAG đầy đủ |
| Phase 7 - UAT/Rollout | Chưa bắt đầu | Cần data sạch, UAT matrix, rollback |

---

## 2. Nguyên tắc làm việc

- Không tạo dữ liệu giả trong production.
- Không dùng client-side guard thay cho kiểm tra server.
- Mỗi commit chỉ giải quyết một concern.
- Mỗi thay đổi DB phải có migration, backup và rollback.
- Không commit `docs/docs2/` nếu chưa được yêu cầu.
- Không đưa `service_role`, `SUPABASE_DB_URL`, SMTP password lên Vercel/FE.
- Mọi thay đổi UI phải có trạng thái loading, empty, error, success và disabled.
- Mọi form phải dùng tiếng Việt nhất quán.
- Không phát triển infinite canvas thật trong phase này; chỉ hoàn thiện Studio hiện tại.

### Lệnh kiểm tra bắt buộc

```powershell
npm run lint
npm test -- --run
npm run build
dotnet build server/Linea.slnx --no-restore
```

Nếu có database test riêng:

```powershell
$env:TEST_DATABASE_URL="postgresql://..."
npm run test:browser
```

Không trỏ `TEST_DATABASE_URL` vào production.

---

## 3. Những gì đã hoàn thành

### Phase 1

- Search khóa học chỉ theo tiêu đề.
- Chặn ghi danh khóa không có bài học.
- Bỏ lịch sử mua hàng giả trong Settings.
- Session-expired: API 401 đăng xuất và hiển thị thông báo.
- Rate limit write API 30 request/phút.
- Cookie consent.
- Loại bỏ debug script tạm.
- Auth policy: 8-64 ký tự, ít nhất một chữ cái và một chữ số.
- Remember me mặc định tắt; lưu tab session khi tắt.

### Phase 2

- Role-based sidebar:
  - Student: dashboard, courses, studio, assignments, progress, orders, artworks, community, settings, teacher onboarding.
  - Teacher: owned courses, create course, teacher profile, community, settings.
  - Admin: admin management, community, settings.
- Role-aware login redirect:
  - Student → `/dashboard`
  - Teacher → `/my-courses`
  - Admin → `/admin/manage`
- Admin không còn mục Duyệt giáo viên/Đơn hàng/Tác phẩm trên sidebar.
- Admin Settings chỉ còn Hồ sơ/Bảo mật; ẩn Ưa thích học tập và Lịch sử mua hàng.
- Teacher My Courses chỉ hiển thị khóa sở hữu.
- Design tokens, `atelier.css`, `Button`, `FormField`, `EmptyState`.
- Tác phẩm khôi phục tại `/artworks` với trạng thái rỗng.

### Phase 3

- Guest home có showcase khóa mẫu và giảng viên minh họa **NmRAtist**.
- Login có Remember me mặc định tắt.
- Register/Reset dùng password policy mới.
- Progress page dùng grid responsive.
- Session-expired message.
- Learning đã kiểm tra local:
  - `/my-courses` → `/courses/34/learn`
  - curriculum, bài hiện tại, progress, nút tiếp tục hoạt động.
  - Dữ liệu đang là khóa test `qqqq...`.

### Phase 4 (đã làm)

Studio:

- Autosave localStorage và khôi phục bản vẽ.
- Fullscreen.
- Zoom 50-200%, pan bằng vùng cuộn.
- Độ đậm nét vẽ.
- Chèn ảnh JPG/PNG/WEBP ≤10 MB.
- Keyboard shortcuts:
  - `Ctrl/Cmd + Z`, `Ctrl/Cmd + Shift + Z`, `Ctrl/Cmd + Y`
  - `B` bút, `E` tẩy
  - `[` / `]` cỡ nét
- Giữ undo/redo, xóa tranh, tải PNG.
- Cảnh báo rời trang.

Community lõi đã có:

- Feed, post detail.
- Ảnh bài viết/comment.
- Comment, pagination.
- Edit/delete chỉ chủ bài, server ownership check.
- Image validation/preview.
- Loading/empty/error.

---

## 4. Việc còn thiếu - backlog tổng hợp

| ID | Việc | Ưu tiên | Trạng thái | Phụ thuộc |
|---|---|---|---|---|
| DATA-01 | Dọn khóa/post/order test khỏi dữ liệu public | P0 | Chờ approval/backup | BA/PO + DB |
| AUTH-01 | Regression Remember me đa tab và session expiry | P1 | Cần test | Auth |
| CAT-01 | Quyết định thời lượng/ngày khai giảng | P1 | Chờ quyết định | PO + schema |
| CAT-02 | Hiển thị metadata catalog hiện có | P2 | Một phần | API |
| LEARN-01 | Regression learning responsive + empty/error | P1 | Code có, cần test | QA |
| STUDIO-01 | Background white/grid/transparent | P2 | Chưa làm | Studio |
| STUDIO-02 | Brush types/presets | P2 | Chưa làm | Studio |
| STUDIO-03 | Mobile/touch/fullscreen QA | P1 | Chưa test đủ | QA |
| STUDIO-04 | Giảm bộ nhớ history canvas | P2 | Chưa làm | FE |
| COMM-01 | Like/reaction | P2 | Chưa có schema/API | DB/BE |
| COMM-02 | Thông báo comment/like | P2 | Chưa làm | BE/Notification |
| COMM-03 | Moderation/report | P2 | Chưa làm | DB/BE/Admin |
| COMM-04 | Community Playwright tests | P1 | Chưa làm | QA |
| COMP-01 | Migrate form/button còn lại | P2 | Một phần | FE |
| TEACH-01 | Teacher teaching overview | P1 | Chưa làm | Phase 5 |
| TEACH-02 | Submission queue toàn bộ khóa | P1 | Chưa làm | Phase 5 |
| TEACH-03 | Grading screen + history | P1 | Chưa làm | Phase 5 |
| TEACH-04 | Teacher students/profile | P2 | Chưa làm | Phase 5 |
| ADMIN-01 | Admin overview | P1 | Chưa làm | Phase 5 |
| ADMIN-02 | Reports/audit | P2 | Chưa làm | Phase 5 |
| ADMIN-03 | Quyết định quản lý order của admin | P2 | Cần chốt | PO |
| PERF-01 | Split bundle ~895 KB | P1 | Chưa làm | Phase 6 |
| PERF-02 | Index/caching/query tuning | P1 | Chưa làm | Phase 6 |
| A11Y-01 | WCAG AA audit đầy đủ | P1 | Chưa làm | Phase 6 |
| TEST-01 | Playwright regression toàn bộ role | P1 | Chưa làm | Phase 7 |
| DEPLOY-01 | Staging/production smoke + rollback | P0 | Chưa làm | Phase 7 |

---

## 5. Phase 4 - Hoàn thiện Studio và Community

### 5.1 Studio background options

**Mục tiêu:** cho phép chọn nền trắng, grid hoặc trong suốt mà không làm mất nét vẽ.

**File:**
- `src/pages/StudioPage.tsx`
- `src/styles/studio.css`

**Cách làm:**
1. Thêm state `background: "paper" | "grid" | "transparent"`.
2. Không fill nền canvas khi transparent; dùng CSS background cho `.studio-canvas-wrap`.
3. Eraser dùng `globalCompositeOperation = "destination-out"` để xóa thật.
4. Khi export:
   - Nếu background paper/grid: composite canvas + background ra canvas tạm.
   - Nếu transparent: export canvas hiện tại.
5. Autosave thêm `background` vào localStorage.
6. Kiểm tra ảnh import và undo/redo sau khi đổi nền.

**Acceptance:**
- Chuyển nền không xóa nét.
- Export PNG đúng nền.
- Undo/redo vẫn hoạt động.
- Autosave khôi phục cả nền.

**Agent prompt:**

```text
You are a senior React/Canvas engineer on LINEA. Implement background modes for the existing Studio:
- Add paper/grid/transparent background selection.
- Do not implement an infinite canvas.
- Keep local autosave, undo/redo, import, zoom, fullscreen and export working.
- Read src/pages/StudioPage.tsx and src/styles/studio.css first.
- Use destination-out for the eraser and composite the selected background on PNG export.
- Add accessible labels and disabled states.
- Run npm run lint, npm test -- --run, npm run build.
Return files changed, behavior tested, screenshots if possible, and any blockers.
```

### 5.2 Studio brush presets

**Mục tiêu:** có ít nhất bút mềm, bút chì, bút marker với size/opacity mặc định.

**Cách làm:**
- Thêm `brush` state; map presets sang `lineCap`, `lineJoin`, `globalAlpha`, `lineWidth`.
- Không cần brush engine phức tạp.
- Giữ eraser hiện tại.
- Lưu preset vào autosave.
- Kiểm tra touch và pointer.

**Acceptance:**
- Mỗi preset tạo nét khác nhau rõ ràng.
- Keyboard `B`/`E` vẫn hoạt động.
- Không ảnh hưởng undo/redo.

### 5.3 Community likes/reactions

**Phụ thuộc:** chưa có bảng/API like.

**Cần làm:**
1. Migration `community_post_likes`:
   - `post_id`, `user_id`, `created_at`.
   - Unique `(post_id, user_id)`.
   - RLS: authenticated insert/delete own; public read count.
2. API:
   - `POST /api/community/posts/{id}/like`
   - `DELETE /api/community/posts/{id}/like`
   - Trả `liked`, `likeCount`.
3. UI:
   - Nút Like, count, optimistic update, revert khi lỗi.
   - Không cho like khi chưa đăng nhập.
4. Test:
   - Like/unlike, double click, concurrent, 401.

**Agent prompt:**

```text
Implement community post likes on LINEA.
First inspect CommunityPage.tsx, CommunityController.cs and community migrations.
Add a reversible migration for community_post_likes with unique (post_id, user_id) and RLS.
Add idempotent like/unlike endpoints and return liked + likeCount.
Update the feed/detail UI with accessible button, count, loading and error states.
Do not use client-only state as source of truth.
Run backend build, frontend lint/test/build, and add Playwright coverage.
Return migration, API changes, UI changes, tests and rollback notes.
```

### 5.4 Community notifications/moderation

**Mục tiêu:**
- Thông báo khi có comment/like.
- Report/ẩn bài vi phạm.
- Admin có hàng đợi moderation.

**Cần làm:**
- Dùng bảng `thong_bao` hoặc bảng notification hiện có.
- Thêm API report; trạng thái `VISIBLE/HIDDEN`.
- RLS admin.
- UI report cho user; UI moderation cho admin.
- Audit log.

**Acceptance:**
- Comment tạo thông báo cho chủ bài.
- Report không public; admin xử lý.
- Bài ẩn không xuất hiện public.

### 5.5 Studio/Community tests

- Playwright:
  - Studio: draw, undo, redo, export, autosave reload, import, zoom, fullscreen.
  - Community: create/edit/delete own, non-owner denied, comment, image, like.
- Responsive 390/768/1440.
- Keyboard/touch.
- Visual screenshots lưu trong `test-results/phase4/`.

---

## 6. Phase 5 - Teacher và Admin workspace

### 6.1 Teacher overview

**Route đề xuất:** `/teacher` hoặc `/teacher/dashboard`.

**Nội dung:**
- Khóa đang dạy.
- Bài chờ chấm.
- Học viên gần đây.
- CTA tạo khóa học.

**Nguồn dữ liệu:** API teacher hiện có hoặc bổ sung endpoint aggregate.

### 6.2 Submission queue

**Route:** `/teacher/submissions`.

**Yêu cầu:**
- Gom bài nộp từ tất cả khóa giáo viên sở hữu.
- Filter: chờ chấm/đã chấm/khóa.
- Mở chi tiết, ảnh, học viên, thời gian.
- Chỉ chủ khóa được xem; server enforce.

### 6.3 Grading screen

**Yêu cầu:**
- Ảnh bài nộp + đề bài.
- Điểm 0-10, nhận xét không rỗng.
- Lưu điểm + chuyển trạng thái trong transaction.
- Lịch sử chấm/regrade nếu được duyệt.
- Thông báo học viên.

### 6.4 Teacher students/profile

- Danh sách học viên theo khóa.
- Hồ sơ giáo viên, trạng thái duyệt, tài liệu.
- Không lộ email/số điện thoại ngoài nhu cầu.

### 6.5 Admin overview/reports/audit

- Trang `/admin` tổng quan.
- Báo cáo người dùng/khóa học/doanh thu.
- Audit log duyệt giáo viên, khóa tài khoản, đổi vai trò.
- **Không tự thêm lại mục Orders vào sidebar admin** nếu chưa có quyết định; hiện admin không mua khóa học.

### 6.6 Phase 5 acceptance

- Mỗi role chỉ thấy workspace của mình.
- Không có IDOR.
- API trả 403/404 đúng.
- Có test teacher A/B.
- UI states đầy đủ.
- RLS/audit được kiểm tra.

---

## 7. Phase 6 - Performance, accessibility, hardening

### 7.1 Bundle splitting

Hiện bundle khoảng **895 KB**, warning >500 KB.

**Cách làm:**
- Lazy route với `React.lazy`/dynamic import cho Studio, Admin, Teacher editor, Community.
- `manualChunks` cho vendor.
- Kiểm tra bundle sau build.
- Không lazy-load trang login/dashboard quá mức gây chậm first paint.

**Acceptance:** main chunk giảm đáng kể; navigation vẫn mượt; loading state rõ.

### 7.2 API/DB performance

- Đo thời gian `/api/catalog/courses`, `/api/courses/mine`, teacher submissions.
- Thêm index theo query thực tế.
- Pagination bắt buộc.
- Cache danh mục công khai nếu an toàn.
- Giảm cold start Render (warm-up hoặc gói trả phí).
- Không cache dữ liệu cá nhân.

### 7.3 Accessibility

- WCAG AA: contrast, focus, labels, keyboard, screen reader.
- Dialog focus trap.
- `aria-live` cho loading/error/success.
- Touch target ≥44px.
- Test bằng axe/Playwright và manual keyboard.

### 7.4 Tests

- Unit logic.
- Playwright role/auth/community/studio/learning.
- Visual regression 390/768/1440.
- API error paths: 401/403/404/409/429/500.

---

## 8. Phase 7 - UAT và rollout

### 8.1 Data cleanup

Chỉ thực hiện sau khi có approval và backup.

**Việc cần làm:**
- Archive test courses (status `AN`, không xóa cứng).
- Xóa/ẩn test community posts.
- Hủy hoặc gắn nhãn demo orders.
- Giữ tài khoản demo cho UAT.
- Kiểm tra catalog public chỉ còn dữ liệu thật.

**Không chạy SQL xóa nếu chưa backup.**

### 8.2 UAT matrix

- Student: register/login, catalog/search, detail, enroll, learn, submit, progress, community, settings.
- Teacher: owned courses, submissions, grade, profile.
- Admin: approvals, users, courses, reports/audit.
- Guest: public pages, login redirect.
- Mobile 390, tablet 768, desktop 1440.

### 8.3 Release

1. Deploy backend Render.
2. Deploy frontend Vercel.
3. Smoke test production.
4. Feature flag nếu có.
5. Theo dõi error/API latency.
6. Rollback:
   - Vercel previous deployment.
   - Render previous build.
   - Reversible migrations.

### 8.4 Rollback criteria

- Auth broken.
- Data leak/IDOR.
- Payment/enrollment corruption.
- API error rate tăng mạnh.
- Không thể đăng nhập/không thể học.

---

## 9. Cross-cutting tasks

### 9.1 Migrate form/button còn lại

Đã migrate:
- LoginForm, RegisterForm, ResetPasswordPage.
- CookieConsent.
- ArtworksPage.

Còn:
- Settings form.
- Community compose/comment.
- Teacher onboarding.
- Teacher course editor.
- Admin search/filter.
- Learning submission dialog.

**Quy tắc:**
- Dùng `FormField`, `Button`, `EmptyState`.
- Giữ `name`, `FormData`, refs, file inputs.
- Không đổi hành vi submit.
- Mỗi nhóm một commit.

**Agent prompt:**

```text
Migrate one form group on LINEA to shared primitives.
Pick exactly one group: settings, community compose/comment, teacher onboarding, teacher course editor, admin search, or learning submission.
Read src/components/ui/Button.tsx, FormField.tsx, EmptyState.tsx and the target component first.
Replace duplicated button/field markup while preserving every name, FormData key, ref, aria-describedby, validation and async state.
Do not change server contracts.
Run lint, tests and build. Add a focused test if the project test setup supports it.
Return files changed, behavior preserved, test results and any UI differences.
```

### 9.2 Catalog duration/open date

Hiện schema/API chưa có `thoi_luong` hoặc `ngay_khai_giang`.

**Quyết định cần chốt:**
- Giáo viên tự nhập hay admin nhập?
- Có bắt buộc không?
- Có dùng để sắp xếp/lọc không?

**Nếu duyệt:**
1. Migration thêm cột nullable.
2. API create/update/detail/list.
3. UI form giáo viên/admin.
4. Validation và test.
5. Không hiển thị nếu chưa có dữ liệu.

### 9.3 Remember me

Đã có behavior:
- Tắt: sessionStorage tab marker; đóng browser/mở tab mới sẽ đăng xuất.
- Bật: session Supabase mặc định.

Cần kiểm tra:
- Reload tab khi tắt vẫn giữ đăng nhập.
- Mở tab mới khi tắt: có thể đăng xuất toàn bộ; chấp nhận hay cần cải thiện?
- Đăng xuất xóa marker.
- Google login xử lý marker.

---

## 10. Commit/PR plan

### Phase 4

```text
feat: complete studio background modes
feat: add studio brush presets
feat: add community likes
feat: add community notifications and moderation
test: cover studio and community flows
```

### Phase 5

```text
feat: add teacher workspace overview
feat: add teacher submission queue
feat: add grading screen and history
feat: add admin overview and audit
test: cover teacher ownership and admin RBAC
```

### Phase 6

```text
perf: split route bundles
perf: tune catalog and submission queries
fix: close accessibility gaps
test: add visual and accessibility regression
```

### Phase 7

```text
chore: clean demo data after approval
test: run full role UAT matrix
chore: deploy and document rollback
```

Không commit `docs/docs2/` trừ khi được yêu cầu.

---

## 11. Definition of Done toàn dự án

- Student/teacher/admin chỉ thấy đúng dữ liệu và chức năng.
- Mọi nút có hành vi hoặc bị disable kèm giải thích.
- Không có mock course/post/order trong production.
- Mọi màn hình có loading/empty/error/success/disabled.
- Auth, enrollment, learning, submission, grading, community, admin pass UAT.
- Keyboard, screen reader, contrast, mobile/touch pass.
- Frontend tests, backend build, Playwright pass.
- Deploy reproducible; rollback có tài liệu.
- PO/BA ký xác nhận phạm vi và dữ liệu.

---

## 12. Global agent prompt

Dùng prompt này khi giao việc cho agent khác:

```text
You are a senior product-minded full-stack engineer and UX lead working on LINEA, a Vietnamese art-learning platform.

Repository:
- Frontend: React 19, TypeScript, Vite, React Router, hand-written CSS.
- Backend: ASP.NET Core (.NET 9), EF Core, PostgreSQL/Supabase.
- Auth/Storage: Supabase.
- Tests: Vitest, Playwright.

Read first:
- AGENTS.md if present.
- docs/DEVELOPMENT-ROADMAP.md.
- docs/docs2/README or the UAT PDFs if needed.
- The specific files named in the task.

Rules:
- Work on one concern only.
- Do not invent production data.
- Do not weaken server-side authorization.
- Do not add a full infinite canvas feature.
- Preserve existing form names, FormData keys, refs and async behavior.
- Write user-facing copy in Vietnamese.
- Make small, reviewable commits.
- Do not commit docs/docs2/ unless asked.

Before coding:
1. State the exact scope.
2. List files to touch.
3. List risks and assumptions.
4. State the test approach.

After coding:
1. Run npm run lint.
2. Run npm test -- --run.
3. Run npm run build.
4. Run dotnet build server/Linea.slnx --no-restore if backend changed.
5. Run relevant Playwright tests if available.
6. Report files changed, tests, screenshots, blockers.

Do not mark a task Done if it is only code-complete but not verified on staging/production.
```

---

## 13. Quyết định cần chốt

1. Có bổ sung `thoi_luong`/`ngay_khai_giang` vào schema không, và ai nhập?
2. Có triển khai like/reaction và moderation không, hay để phase sau?
3. Admin có cần quản lý orders/reports/audit không, hay chỉ duyệt giáo viên/khóa học?
4. Remember me khi tắt có chấp nhận việc mở tab mới đăng xuất không?
5. Có dọn dữ liệu test trước demo không; ai backup và ai duyệt?
6. Có tiếp tục migrate toàn bộ form/button trong phase 4/5 hay chỉ các form mới?
7. Có cần real payment hay giữ demo payment đến hết đồ án?
8. Có cần Studio background/brush nâng cao trong sprint này không?

---

## 14. Tài liệu tham chiếu

- `docs/docs2/CHANGELOG-PA-Nhom3.md`
- `docs/docs2/UAT (1).pdf`
- `docs/docs2/UAT (2).pdf`
- `docs/docs2/UAT.pdf`
- `docs/phan-tich-nghiep-vu-sprint-4.docx`
- `server/README.md`
- `README.md`

---

## 15. Trạng thái bàn giao

- Code hiện tại: commit `b8a80d0`, đã push `origin/develop`.
- Chưa deploy commit Studio.
- `docs/docs2/` vẫn untracked.
- Phase 4 chưa hoàn tất: Studio còn background/brush/mobile test; Community còn like/moderation/notification.
- Phase 5-7 chưa bắt đầu.
