# LINEA - Roadmap các phần còn lại

- **Ngày cập nhật:** 21/11/2026
- **Nhánh đề xuất:** `codex/linea-role-ui-uat` → `develop`
- **Commit develop làm nền:** `3e88b96`, merge PR #26
- **Triển khai:** bản đã chạy trước PR này qua smoke production. GitHub ghi Vercel build thành công cho `42e0c57`. Các thay đổi của PR đã kiểm tra với QA và chờ phát hành.
- **Frontend:** https://pa-nhom3.vercel.app
- **Backend:** https://linea-api-6pw5.onrender.com
- **Supabase project ref:** `pscjbvjcprvzfkawflql`

Tài liệu này dành cho các thành viên tiếp nhận dự án. Mục tiêu là:

1. Ghi lại chính xác những gì đã xong.
2. Liệt kê toàn bộ việc còn thiếu.
3. Chia roadmap theo phase, có thứ tự thực hiện.
4. Cung cấp prompt chi tiết để một agent khác có thể tiếp tục mà không cần đọc lại toàn bộ lịch sử.

---

## Cập nhật giao diện và QA — 21/11/2026

- Tách dashboard theo vai trò và đồng bộ giao diện đăng nhập, học viên, giáo viên, quản trị. Menu mobile của người đã đăng nhập dùng panel trượt trái.
- Giáo viên có trường nhập học phí cho khóa nháp. Cài đặt chỉ hiển thị phần có hỗ trợ trong ứng dụng và đường dẫn tới Đơn hàng.
- Luồng học đã qua API QA. Local đã mở được checkout ZaloPay Sandbox, nhưng thanh toán bị kẹt ở bước sinh trắc học. Chưa xác nhận giao dịch thành công hoặc cấp quyền học qua ZaloPay.
- Xem [tệp bàn giao theo roadmap](ROADMAP-HANDOVER-2026-11-21.md) và [hướng dẫn chạy local](../CHAY_LOCAL.md).

---

## Cập nhật kiểm tra sau pull — 21/11/2026

- Code Phase 4–7 đã được merge vào develop qua PR #25.
- Người dùng xác nhận đã deploy. Smoke chỉ đọc trên URL trong tài liệu đạt frontend, health, catalog và community (0 bài); chưa xác minh commit đang chạy.
- Sau pull: lint đạt, 101/101 Vitest đạt, frontend build và backend build đạt. Năm bộ browser test Studio, Community likes, roles, learning và accessibility smoke đạt với fixture. Kết quả này không thay thế UAT production.
- Đợt hoàn thiện tiếp theo đã sửa lưu phiên theo tab, chuyển các nhóm form còn lại sang shared primitives, nối nút đổi mật khẩu với luồng gửi email và chuyển xác nhận trong trình soạn khóa sang dialog gốc.
- Kiểm tra đợt hoàn thiện: lint, 101 unit test, hai bản build, các bài kiểm tra Chromium cho auth, Studio, Community, learning, admin và giáo viên đều đạt. Sáu trang giáo viên/admin đã được kiểm tra tên heading trong cây accessibility và tràn ngang ở 390/768/1440 px.
- Đã sửa lệch snapshot EF cho metadata catalog. EF xác nhận model khớp migration và API khởi động được với database test. Bộ tích hợp Sprint 5 vẫn cần chuyển từ tài khoản legacy sang Supabase Auth. UAT theo vai trò đã được kiểm tra riêng bằng ba tài khoản Supabase thật ở mục 8.2.
- Luồng ghi danh mới → nộp bài → chấm bài đã đạt trên QA. Còn nghiệm thu OAuth Google, nhận email đổi mật khẩu, Studio trên thiết bị thật và WCAG thủ công. Phát hành vẫn cần đối chiếu commit và diễn tập rollback trên staging.
- Ghi nhận backup, migration và cleanup bên dưới là lịch sử từ tài liệu; chưa kiểm tra lại trực tiếp trong lượt này.

---

## 1. Tóm tắt trạng thái

| Phase | Trạng thái | Ghi chú |
|---|---|---|
| Phase 0 - Baseline | Hoàn thành | Đã inventory, xóa temp file, phân loại UAT |
| Phase 1 - Trust/security | Hoàn thành phần code | Đã deploy; cần regression production đầy đủ |
| Phase 2 - IA/design system | Hoàn thành nền tảng | Role nav, tokens, primitives, atelier layer |
| Phase 3 - Public/auth/learning | Phần lớn hoàn thành | Catalog metadata đã chốt và kiểm tra trên QA. Còn luồng ghi danh, nộp và chấm bài. |
| Phase 4 - Studio/Community | Hoàn thành phần code | Studio background/brush/history; Community like, report, moderation, notification |
| Phase 5 - Teacher/Admin | Hoàn thành phần code | Teacher overview/queue/students/history; Admin overview/audit/moderation |
| Phase 6 - Performance/A11y | Hoàn thành phần code | Bundle ~318 KB; index/cache; WCAG smoke audit |
| Phase 7 - UAT/Rollout | Một phần | Đã QA ba vai trò và kiểm duyệt. Còn UAT luồng học, phát hành bản sửa, xác minh commit và rollback. |

### Cập nhật 21/11/2026

Code Phase 4–7 đã được merge; người dùng xác nhận đã deploy. Theo ghi nhận trước đó, 3 migration mới đã
được áp lên Supabase production ngày 21/11/2026 sau khi backup.

- **Studio**: nền paper/grid/transparent, brush mềm/chì/marker, tẩy
  `destination-out`, export composite, autosave lưu nền + brush, history dùng
  PNG data URL. `npm run test:studio` pass ở 1440px và 390px.
- **Community**: like/unlike idempotent, optimistic UI, report, ẩn bài, notification
  comment/like, trang admin `/admin/community`. `npm run test:community-likes` pass.
- **Teacher**: `/teacher`, `/teacher/submissions`, `/teacher/students`, API aggregate,
  lịch sử chấm từ `lich_su_trang_thai`. Test role fixture pass.
- **Admin**: `/admin`, `/admin/audit`, `/admin/community`, API overview/audit,
  audit cho moderation.
- **Catalog**: thêm optional `thoi_luong`, `ngay_khai_giang`; hiển thị ở catalog
  và trang chi tiết khi có dữ liệu.
- **Performance**: route splitting (main ~318 KB), index migration, output cache
  catalog 30 giây.
- **A11y**: touch target 44px, label cho file input Studio, smoke audit 6 trang
  public pass; chưa thay thế audit WCAG thủ công đầy đủ.
- **Regression**: `test:learning`, `test:roles`, `test:a11y`, `test:studio`,
  `test:community-likes`; Vitest 101 test; backend build 0 warning.

Việc chưa thể hoàn tất trong repo:

- **DATA-01**: đã chạy 21/11/2026 sau phê duyệt, có backup trước khi chạy. Chi tiết
  ID, kết quả và rollback trong `docs/operations/DATA-CLEANUP.md`.
- **DEPLOY-01**: Theo ghi nhận trước đó, 3 migration đã áp lên Supabase ngày 21/11/2026 sau backup. Người dùng xác nhận code đã deploy; cần xác minh commit đang chạy và hoàn tất UAT. Smoke production chỉ đọc đã pass. Runbook: `docs/operations/RELEASE-ROLLBACK.md`.
- **COMP-01**: đã chuyển form hồ sơ Settings, Community compose/edit/comment/report, hồ sơ giáo viên, trường soạn khóa, tìm kiếm admin và nộp bài sang shared primitives trong working tree.
- **A11Y-01**: chưa có audit axe/WCAG thủ công toàn bộ luồng có đăng nhập.

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

### Cập nhật sau bản roadmap đầu

- Giáo viên có thể xóa mềm khóa học bản nháp:
  - API `DELETE /api/courses/{id}` chỉ cho chủ khóa và trạng thái `NHAP`.
  - Chuyển trạng thái sang `DA_GO`; ẩn khỏi “Khóa học của tôi”.
- Ô tìm kiếm trang Khóa học đã đồng bộ với ô tìm kiếm header:
  - pill, nền soft, không border lồng.
- Tiêu đề filter Chủ đề/Trình độ đã chuẩn hóa typography:
  - 10px, 700, uppercase, letter-spacing 0.12em.

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
- Nền canvas `paper/grid/transparent`: nét vẽ nằm trên canvas trong suốt, nền chỉ
  hiển thị bằng CSS; export PNG composite đúng nền đã chọn.
- Brush presets `Bút mềm/Bút chì/Bút marker` khác nhau về độ dày, alpha và kiểu
  đầu nét; tẩy dùng `destination-out`.
- Autosave lưu cả `background` và `brush`; đọc được bản lưu cũ dạng data URL.
- Logic thuần tách tại `src/logic/studio.ts` và có unit test.

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
| DATA-01 | Dọn khóa/post/order test khỏi dữ liệu public | P0 | Tài liệu ghi đã chạy; smoke API trả 0 bài, chưa kiểm tra lại database | BA/PO + DB |
| AUTH-01 | Regression Remember me đa tab và session expiry | P1 | Chromium kiểm tra bật/tắt, tab mới, reload và API 401 với phản hồi Auth fixture; còn OAuth trên môi trường QA | Auth |
| CAT-01 | Quyết định thời lượng/ngày khai giảng | P1 | Đã chốt optional, giáo viên nhập; migration đã áp 21/11/2026 | PO + schema |
| CAT-02 | Hiển thị metadata catalog hiện có | P2 | Hiển thị thời lượng/ngày khai giảng; test format | API |
| LEARN-01 | Regression learning responsive + empty/error | P1 | Pass `test:learning` (390px, error state) | QA |
| STUDIO-01 | Background white/grid/transparent | P2 | Hoàn thành; `test:studio` pass | Studio |
| STUDIO-02 | Brush types/presets | P2 | Hoàn thành; `test:studio` pass | Studio |
| STUDIO-03 | Mobile/touch/fullscreen QA | P1 | Chromium pass fullscreen và thao tác chạm mô phỏng ở 390px; còn thử trên thiết bị thật | QA |
| STUDIO-04 | Giảm bộ nhớ history canvas | P2 | Snapshot PNG thay ImageData; giới hạn 30 bước | FE |
| COMM-01 | Like/reaction | P2 | Đã deploy theo người dùng; còn UAT | DB/BE |
| COMM-02 | Thông báo comment/like | P2 | Code + migration đã áp; notification mapping sẵn sàng | BE/Notification |
| COMM-03 | Moderation/report | P2 | Đã deploy theo người dùng; còn UAT | DB/BE/Admin |
| COMM-04 | Community Playwright tests | P1 | Pass `test:community-likes` | QA |
| COMP-01 | Migrate form/button còn lại | P2 | Đã triển khai các nhóm form mục 9.1 trong working tree | FE |
| TEACH-01 | Teacher teaching overview | P1 | `/teacher` + `/api/teacher/overview` | Phase 5 |
| TEACH-02 | Submission queue toàn bộ khóa | P1 | `/teacher/submissions` + filter/pagination | Phase 5 |
| TEACH-03 | Grading screen + history | P1 | Chấm theo khóa + lịch sử `StatusHistory` | Phase 5 |
| TEACH-04 | Teacher students/profile | P2 | `/teacher/students`; hồ sơ giáo viên đã có | Phase 5 |
| ADMIN-01 | Admin overview | P1 | `/admin` + `/api/admin/overview` | Phase 5 |
| ADMIN-02 | Reports/audit | P2 | `/admin/audit`, audit lưu khi duyệt/khóa/chấm/moderation | Phase 5 |
| ADMIN-03 | Quyết định quản lý order của admin | P2 | Chốt: admin không quản lý order trong phạm vi đồ án | PO |
| PERF-01 | Split bundle ~895 KB | P1 | Main ~318 KB; không còn warning >500 KB | Phase 6 |
| PERF-02 | Index/caching/query tuning | P1 | Migration index + output cache catalog 30s | Phase 6 |
| A11Y-01 | WCAG AA audit đầy đủ | P1 | `test:a11y` pass 6 trang public; WCAG thủ công còn lại | Phase 6 |
| TEST-01 | Playwright regression toàn bộ role | P1 | Ba vai trò đăng nhập thật, Community đạt và luồng ghi danh/nộp/chấm đạt qua API QA. Bộ Sprint 5 legacy vẫn cần chuyển sang Supabase Auth | Phase 7 |
| DEPLOY-01 | Staging/production smoke + rollback | P0 | Smoke production 4/4; Vercel có trạng thái success cho `42e0c57`; còn đối chiếu alias/Render, diễn tập rollback và UAT | Phase 7 |

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

**Đã làm (21/11/2026):**
1. Migration `community_post_likes`:
   - `post_id`, `user_id`, `created_at`, PK `(post_id, user_id)`.
   - RLS bật; revoke mọi quyền browser; API dùng quyền server.
   - Index `(user_id, created_at desc)`.
2. API:
   - `POST /api/community/posts/{id}/like`
   - `DELETE /api/community/posts/{id}/like`
   - Idempotent, trả `liked`, `likeCount`; list/detail trả count + liked của user.
3. UI:
   - Nút Like/Đã thích, count, optimistic update, revert khi lỗi.
   - Disabled khi chưa đăng nhập.
4. Test:
   - `npm run test:community-likes`: like/unlike, aria-pressed, anonymous guard,
     report form.
   - Concurrency do PK + `on conflict do nothing` bảo đảm.

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

**Đã làm (21/11/2026):**
- Notification qua bảng `thong_bao` khi comment/like (bỏ qua self-notify).
- API report `POST /api/community/posts/{id}/report`; trạng thái bài
  `VISIBLE/HIDDEN`; report lưu `OPEN/RESOLVED/DISMISSED`.
- Admin queue `/admin/community` + API `/api/admin/community/reports`,
  resolve HIDE/KEEP và đổi trạng thái bài.
- Audit `lich_su_trang_thai` với `loai_doi_tuong='CONG_DONG'`.
- Frontend map notification `community_like/community_comment/cong_dong`.
- RLS: report và like không public; chỉ API server truy cập.

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

**Đã triển khai:** `/teacher`, API `GET /api/teacher/overview` trả tổng khóa học,
đã đăng, bản nháp, bài chờ chấm/đã chấm, học viên, bài nộp gần đây và pending
theo từng khóa. Sidebar giáo viên có mục Tổng quan.

**Nội dung:** khóa đang dạy, bài chờ chấm, học viên gần đây, CTA tạo khóa học.

### 6.2 Submission queue

**Đã triển khai:** `/teacher/submissions`, API `GET /api/teacher/submissions`
gom bài từ mọi khóa giáo viên sở hữu; filter chờ chấm/đã chấm/tất cả + khóa;
phân trang 20; server kiểm tra `course.TeacherId`.

### 6.3 Grading screen

**Đã triển khai:** trang chấm theo khóa hiện có nhận tên học viên, ảnh, đề bài;
điểm 0-10 + nhận xét bắt buộc; lưu trong transaction; ghi `StatusHistory`
mỗi lần chấm/regrade; thông báo học viên. UI có nút "Lịch sử chấm" gọi
`GET /api/assignments/submissions/{id}/history`.

### 6.4 Teacher students/profile

**Đã triển khai:** `/teacher/students`, API `GET /api/teacher/students` lọc theo
khóa, phân trang 50, chỉ trả tên + trạng thái ghi danh (không email/số điện thoại).
Hồ sơ giáo viên và tài liệu giữ nguyên luồng hiện có.

### 6.5 Admin overview/reports/audit

**Đã triển khai:**
- `/admin` + `GET /api/admin/overview`: đếm người dùng, giáo viên, khóa học,
  bài cộng đồng, report mở + audit gần đây.
- `/admin/audit` + `GET /api/admin/audit`: lọc loại đối tượng, phân trang 50.
- `/admin/community`: hàng đợi report, ẩn/giữ bài, ghi audit.
- Giữ quyết định **không** thêm quản lý Orders vào sidebar admin.

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

Bundle trước split khoảng **895 KB**, warning >500 KB.

**Đã làm:**
- Lazy route bằng `React.lazy` + `Suspense` cho Studio, Community, Admin, Teacher
  editor/submissions, Learning, Settings, Notifications, Artworks, Orders.
- Giữ eager các trang first paint: login, register, dashboard, catalog, course detail.
- `manualChunks` cho `react`, Supabase, `zod`, `lucide-react`.
- Build hiện tại: main `~315 KB` (gzip ~94 KB); chunk lớn nhất còn lại
  `vendor-supabase ~224 KB`; không còn warning >500 KB.
- Fallback `.route-fallback` có `role="status"` và `aria-live="polite"`.

**Còn kiểm tra:** navigation thực tế trên production, cold cache và mạng chậm.

**Acceptance:** main chunk giảm đáng kể; navigation vẫn mượt; loading state rõ.

### 7.2 API/DB performance

**Đã làm:**
- Index migration `20261121091000_workspace_query_indexes.sql` cho teacher
  pending/queue, enrollment, notification, audit, community author.
- Output cache 30 giây cho catalog list/detail; chỉ dữ liệu public, không cache
  dữ liệu cá nhân.
- Teacher submissions/students bắt buộc phân trang 20/50.

**Còn lại:** đo latency thực tế trên Render, cân nhắc warm-up hoặc gói trả phí
để giảm cold start.

### 7.3 Accessibility

**Đã làm:**
- Touch target chính ≥44px (header icon, password toggle, Studio toolbar/zoom,
  community actions).
- Bổ sung label cho file input ẩn của Studio.
- `role=status`/`aria-live` cho loading và thông báo ở các trang mới.
- `npm run test:a11y` pass 6 trang public ở 390px: accessible name, label,
  alt, duplicate id, main landmark, overflow.

**Còn lại:** audit axe/WCAG thủ công cho luồng đăng nhập, focus trap dialog và
screen reader; một số form cũ chưa migrate primitive.

### 7.4 Tests

**Đã làm:**
- Vitest 101 test (gồm Studio, notification, catalog, auth policy).
- Playwright: `test:studio`, `test:community-likes`, `test:roles`,
  `test:learning`, `test:a11y`; các suite cũ header/community vẫn pass.
- 390px cho Studio, Community, Learning; role fixture teacher/admin.

**Còn lại:** visual regression 768/1440 có ảnh lưu `test-results/phase4/`;
test API 401/403/404/409/429/500 với dữ liệu thật.

---

## 8. Phase 7 - UAT và rollout

### 8.1 Data cleanup

Chỉ thực hiện sau khi có approval và backup.

**Đã chạy 21/11/2026** sau phê duyệt BA/PO, có backup trước khi chạy:
`%TEMP%\kilo\linea-backup-20261121-0755.json`.

- Ẩn 14 khóa test/junk: ID 12,13,14,15,16,17,20,27,29,30,31,32,33,34 → `AN`.
- Ẩn 2 bài cộng đồng test: ID 1,2 → `HIDDEN`.
- 12/12 đơn demo giữ nguyên; bảng `don_hang_demo` + `che_do='DEMO'` đã là nhãn demo.
- Giữ tài khoản demo; ghi 16 bản ghi audit `DATA-01`.
- Sau dọn: 9 khóa `DA_DANG`, 0 bài `VISIBLE` trong DB.
- Catalog production đã còn 9 khóa; 2 post test vẫn hiện trên API cũ vì bản deploy
  hiện tại chưa lọc `status`. Chờ deploy backend mới để feed ẩn hoàn toàn.

Chi tiết ID, kết quả và SQL rollback: `docs/operations/DATA-CLEANUP.md`.

### 8.2 UAT matrix

- Student: register/login, catalog/search, detail, enroll, learn, submit, progress, community, settings.
- Teacher: owned courses, submissions, grade, profile.
- Admin: approvals, users, courses, reports/audit.
- Guest: public pages, login redirect.
- Mobile 390, tablet 768, desktop 1440.

| Vai trò | Bằng chứng hiện có | Còn nghiệm thu trên môi trường QA |
|---|---|---|
| Guest | Smoke HTTP production, kiểm tra accessibility 6 trang public | Kiểm tra với trình đọc màn hình và điều hướng trên thiết bị thật |
| Học viên | Chromium với fixture cho đăng nhập đa tab, 401 và learning. QA thật kiểm tra đăng nhập, khóa đã ghi danh và tiến độ. | Đăng nhập Google, nhận email đổi mật khẩu, ghi danh mới và nộp bài |
| Giáo viên | Dialog xác nhận đã kiểm tra Tab, Escape và trả focus. QA thật kiểm tra workspace và vòng đời bản nháp. | Quyền sở hữu giữa hai tài khoản, chấm và lịch sử chấm trên dữ liệu QA |
| Admin | QA thật kiểm tra quyền admin, hàng đợi kiểm duyệt, ẩn bài và dấu vết audit. | Nghiệm thu duyệt hồ sơ và khóa học với dữ liệu QA |

Kết quả với Supabase QA ngày 21/11/2026. Frontend và API chạy từ workspace, kết nối Auth và database QA.

- Luồng học với khóa QA #39 đã qua tạo khóa, thêm bài học và bài tập, gửi duyệt, duyệt đăng, chặn đọc trước khi ghi danh (403), ghi danh miễn phí, mở bài, đánh dấu hoàn thành và đọc bài tập. Admin đã ẩn khóa thử sau kiểm tra.
- Sau khi cấu hình Storage QA, khóa thử #40 đã qua từ tạo, duyệt, ghi danh đến nộp PNG và chấm 8,5/10. Học viên đọc được điểm, trạng thái `DA_CHAM` và bị chặn nộp lại (409). Giáo viên đọc được lịch sử chấm. Admin đã ẩn khóa thử #40.

| Vai trò | Đã kiểm tra |
|---|---|
| Học viên | Đăng nhập từ giao diện, mở dashboard, đọc danh sách khóa đã ghi danh, mở khóa học và đọc tiến độ. API giáo viên/admin trả 403. |
| Giáo viên | Đăng nhập từ giao diện, đọc tổng quan, hàng đợi bài nộp và danh sách học viên. API admin trả 403. Tạo, sửa thời lượng và xóa mềm bản nháp, xác nhận trạng thái `DA_GO` qua audit. |
| Admin | Đăng nhập từ giao diện. Tổng quan, audit và hàng đợi kiểm duyệt trả 200 sau khi sửa truy vấn audit và áp migration Community. Guest gọi API admin trả 401. |
| Community | Học viên tạo bài QA, giáo viên thích hai lần chỉ tính một lượt, bỏ thích và gửi báo cáo. Admin ẩn bài, guest nhận 404, audit ghi `HIDDEN`. Bài thử đã được xóa. |

QA thiếu schema Community. Đã diễn tập `20261121090000_community_likes_moderation.sql` trong transaction có rollback, sau đó áp trực tiếp trên QA và xác nhận RLS, quyền SELECT của `anon` và `authenticated`. Cần đồng bộ lịch sử migration Supabase QA trước lần `db push` tiếp theo vì lần áp này chạy qua SQL trực tiếp. Commit production và rollback bản phát hành vẫn cần kiểm tra riêng.

### 8.3 Release

Runbook đầy đủ: `docs/operations/RELEASE-ROLLBACK.md`; smoke script:
`node deploy/smoke.mjs <frontend> <api>`.

1. Backup Supabase + áp 3 migration mới.
2. Deploy backend Render.
3. Deploy frontend Vercel.
4. Smoke test production (`deploy/smoke.mjs`).
5. Feature flag nếu có.
6. Theo dõi error/API latency.
7. Rollback:
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

Đã chuyển trong đợt hoàn thiện roadmap:
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

**Đã chốt và triển khai (21/11/2026):**
- Giáo viên sở hữu khóa học tự nhập; không bắt buộc.
- Không dùng để sắp xếp/lọc; chỉ hiển thị metadata.
- Cột nullable `thoi_luong varchar(50)`, `ngay_khai_giang date`.
- API create/update/detail/list và editor nhận/trả hai trường.
- Form giáo viên có ô "Thời lượng" và "Ngày khai giảng".
- Catalog/card/detail chỉ hiển thị khi có dữ liệu; `formatStartDate` có unit test.
- Migration: `supabase/migrations/20261121092000_course_catalog_metadata.sql`
  và EF `20261121085623_CatalogMetadataSnapshot`. EF cập nhật model snapshot
  và thêm hai cột nếu còn thiếu. Khi rollback ứng dụng, giữ các cột và dữ liệu.

### 9.3 Remember me

- Tắt: phiên lưu trong `sessionStorage`, vẫn giữ khi reload. Tab mới mở độc lập không nhận phiên và không gọi đăng xuất tab gốc.
- Bật: phiên lưu trong `localStorage` để dùng lại trên cùng trình duyệt.
- Google dùng lựa chọn trên form đăng nhập. Mã PKCE được lưu theo tab để hoàn tất callback.
- API quản trị trả 401 sẽ xóa trạng thái đăng nhập hiện tại và hiển thị thông báo hết phiên.
- `npm run test:auth` kiểm tra hai chế độ, reload, tab mới, yêu cầu gửi email đổi mật khẩu và API 401 qua Supabase SDK với HTTP fixture. Còn xác nhận OAuth và nhận email thật trên môi trường QA.

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

## 13. Quyết định đã chốt (21/11/2026)

1. `thoi_luong` (chuỗi tối đa 50 ký tự) và `ngay_khai_giang` (date) là optional;
   giáo viên sở hữu khóa học nhập, chỉ hiển thị khi có dữ liệu.
2. Triển khai like/reaction, report, moderation và notification trong phạm vi đồ án.
3. Admin có overview/audit và kiểm duyệt cộng đồng; **không** thêm quản lý order
   vào sidebar admin (giữ quyết định trước).
4. Remember me tắt nghĩa là session chỉ sống trong tab hiện tại; tab mới đăng xuất.
5. DATA-01 chỉ chạy sau khi BA/PO duyệt và có backup; runbook đã tạo.
6. COMP-01 đã chuyển các nhóm form được liệt kê ở mục 9.1 trong working tree.
7. Giữ demo payment đến hết đồ án; không triển khai thanh toán thật.
8. Studio chỉ dùng background/brush preset, không làm infinite canvas.

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

- Bản nền của PR là commit `42e0c57` trên `origin/develop`, gồm Phase 4–7 qua PR #25.
- PR gồm migration đồng bộ snapshot PostgreSQL và migration metadata catalog. Database đã có cột metadata vẫn áp được và giữ dữ liệu khi rollback ứng dụng.
- Các thay đổi của PR chờ deploy. Smoke 4/4 được ghi nhận cho bản production trước PR.
- Phase 4: Studio/Community browser suites pass. Studio đã qua kiểm tra fullscreen và cảm ứng mô phỏng; còn QA trên thiết bị thật.
- Phase 5: đã qua QA thật cho workspace giáo viên, quản trị, kiểm duyệt và audit. Còn kiểm tra ghi danh mới, nộp bài và chấm bài trọn luồng.
- Phase 6: PERF-01/02 và A11Y smoke hoàn thành; WCAG thủ công toàn bộ còn lại.
- Phase 7: QA đã qua đăng nhập theo vai trò, bản nháp, kiểm duyệt và luồng ghi danh/nộp/chấm qua API. Còn chạy luồng học qua giao diện, thanh toán Sandbox thành công, đồng bộ lịch sử migration QA, xác minh commit sau deploy và diễn tập rollback.
- 3 migration đã áp lên Supabase project `pscjbvjcprvzfkawflql` ngày 21/11/2026:
  - `20261121090000_community_likes_moderation.sql`
  - `20261121091000_workspace_query_indexes.sql`
  - `20261121092000_course_catalog_metadata.sql`
- Backup trước migration: `%TEMP%\kilo\linea-backup-20261121-0755.json`
  (không commit vì chứa dữ liệu production).
