# Bàn giao sửa review Sprint 6 — 14/11/2026

## Đồng bộ develop sau khi PR #6 được merge

- Base mới: `dadfda0` (merge PR #6, commit nguồn `da4d98f`). Đã merge base này vào nhánh PR #9 để giải quyết conflict.
- Ba file xung đột: `src/main.tsx`, `src/pages/CourseLearningPage.tsx`, `src/pages/MyCoursesPage.tsx`.
- Giữ router đầy đủ của Sprint 6, mỗi route học chỉ khai báo một lần; giữ Khách/catalog, progress, assignments và teacher submissions.
- Giữ client API học thực tế, nội dung/tiến độ đúng khóa, ảnh/video HTTPS và phần nộp bài. Bản PR #6 còn mapping tên khóa/slug và màn học chưa tích hợp bài tập.
- Giữ danh sách khóa theo ghi danh/API thật và đường dẫn giáo viên chấm bài; không đưa lại catalog/giá mẫu vào luồng dữ liệu thật.
- Đã đối chiếu `src/lib/courseApi.ts` và `src/styles/settings.css`: hai file của PR #6 đã có nguyên vẹn trên nhánh fullsoft, không có khác biệt với develop ở hai file này.
- Đây là giải quyết tích hợp Git; không thay thế nghiệm thu chức năng hoặc xác minh deploy.

Nguồn review: `d20c272`, PR #9 (`fullsoft` → `develop`). Đây là phần sửa mã cho S6-01–04 và tài liệu DoD, không triển khai toàn bộ S6-05–15.

## Đã sửa trong mã

- Thống nhất body thêm attachment: `lessonId/name/path/type/size`; response giữ tên cột FE đang dùng. Khi lưu metadata thất bại, FE cố dọn object mới và báo nếu cleanup không thành công.
- Lưu nội dung editor theo ID hiện có, không xóa/tạo lại toàn bộ cây. Kiểm tra ID trùng/khác khóa, quan hệ/thứ tự; xóa nội dung đã có bài nộp/tiến độ bị từ chối.
- Sắp xếp giữ ràng buộc thứ tự dương/unique bằng bước thứ tự tạm trong cùng transaction.
- Snapshot nội dung và version cùng transaction qua GET `/api/courses/{id}/editor`; FE không cần đọc trực tiếp bảng bài tập/rubric đã bị thu hồi quyền.
- Editor khóa dòng khóa học và kiểm tra NHAP trong transaction Serializable; lỗi PostgreSQL serialization/deadlock trả 409 cùng code và traceId. Endpoint attachment cũng kiểm tra nháp trong transaction có khóa dòng.
- Media kiểm tra chữ ký JPG/PNG/WEBP/PDF/ZIP, đối chiếu MIME, giới hạn ảnh 10 MB/tài liệu 20 MB, kiểm tra path thuộc đúng khóa (cả định dạng legacy).
- Thiếu cấu hình AssignmentStorage trả lỗi 503 có kiểm soát khi thao tác file; GET danh sách vẫn không khởi tạo storage. Lỗi dịch vụ ngoài có thông báo/code/traceId không lộ URL/key.
- Profile cập nhật header/sidebar ngay qua sự kiện sau lưu, chặn response cũ ghi đè dữ liệu vừa lưu, kiểm tra đúng tài khoản phiên hiện hành. Parameter hồ sơ nullable khai báo kiểu để lưu tên/avatar null trên PostgreSQL.

### Phú — PB15/PB16/PB20 (bổ sung 14/11/2026)

#### D05 / PB15 — theo dõi tiến độ

- Quy tắc hoàn thành: có ít nhất một bài bắt buộc; mọi bài bắt buộc `DA_HOAN_THANH`; mọi bài tập bắt buộc có bài nộp đã lưu. **Không chờ chấm**, không dùng ngưỡng điểm. Bài tùy chọn không chặn; khóa không có bài bắt buộc trả 0% và không tự hoàn thành; `DA_HUY` không bị đổi.
- `LearningProgressService` có `EvaluateAsync` làm nguồn duy nhất tính số bài, bài nộp, phần trăm và trạng thái; `RefreshAsync` ghi `ghi_danh.trang_thai` theo D05.
- `GET /api/progress?courseId=...` trả tổng hợp chương/bài/bài tập; không trả nội dung khóa đang `AN`; không ghi danh trả 403, không thấy khóa trả 404.
- SQL backfill: `server/Linea.Api/Data/Sql/progress-completion-d05.sql` và bản Supabase `supabase/20261114121000_progress_completion_rule.sql`.
- Dữ liệu dùng: `khoa_hoc`, `chuong`, `bai_hoc`, `bai_tap`, `tien_do_bai_hoc`, `bai_nop`, `ghi_danh`.
- Ca nghiệm thu: PB15-01 khóa 0 bài bắt buộc → 0%/`DANG_HOC`; PB15-02 đủ bài nhưng thiếu bài tập → `completed=false`; PB15-03 đủ bài + đủ bài nộp chưa chấm → `HOAN_THANH`; PB15-04 đã chấm → vẫn `HOAN_THANH`; PB15-05 bài tùy chọn chưa xong → không chặn; PB15-06 khóa `AN` → `available=false`, không trả nội dung; PB15-07 gọi lặp → không nhân bản dòng tiến độ.
- Response chính: `courseId`, `enrollmentStatus`, `completed`, `lessonPercent`, `requiredLessons`, `completedRequiredLessons`, `requiredAssignments`, `submittedRequiredAssignments`, `gradedRequiredAssignments`, `chapters[]`, `assignments[]`, `completedAt`. `gradedRequiredAssignments` chỉ để hiển thị, không tham gia điều kiện `completed`.

#### PB16 — quản trị người dùng/khóa học

- Người dùng: admin tìm theo email/tên, lọc role/trạng thái khóa, phân trang; xem chi tiết + lịch sử; khóa/mở có lý do 10–500 ký tự và `expectedVersion`; không tự khóa mình, không khóa tài khoản admin khác qua API; không xóa cứng.
- Khóa học: admin xem/tìm/lọc; ẩn `DA_DANG → AN`, hiện `AN → DA_DANG`; chỉ ẩn/hiện khóa đã đăng; có `visibility_version`, lý do, audit; không xóa ghi danh/tiến độ/bài nộp/điểm.
- API: `/api/admin/users` (search/role/locked/page), `/api/admin/users/{id}`, `PATCH /users/{id}/lock`, `PATCH /users/{id}/role`, `/api/admin/courses`, `/api/admin/courses/{id}`, `PATCH /courses/{id}/visibility`, `/api/admin/orders` (chỉ đọc), `/api/admin/orders/{id}`.
- Mã lỗi: `VALIDATION_ERROR` 400, `NOT_FOUND` 404, `VERSION_CONFLICT` 409, `INVALID_STATE` 409, `SCHEMA_NOT_READY` 503; tài khoản bị khóa bị chặn từ request kế tiếp.
- `ActiveAccountHandler` đọc `nguoi_dung.role`/`is_locked` trên mỗi request; token Supabase/JWT cũ không vượt được trạng thái khóa. `SupabaseAccountService` đọc `is_locked` làm lớp dự phòng.
- SQL/RLS: `server/Linea.Api/Data/Sql/admin-management.sql` và bản Supabase `supabase/20261114120000_admin_management.sql`; thêm cột khóa/version, `visibility_version`, `gia_vnd`, `ngay_cap_nhat`, `don_hang_demo`; mở rộng CHECK `lich_su_trang_thai` cho `BAI_NOP`/`DON_HANG`; policy đọc dashboard kiểm tra khóa + ghi danh, giữ nhánh admin/chủ khóa cho màn duyệt.
- Lỗi tích hợp đã sửa: `AdminOrderService.ListAsync` thiếu join `auth.users/nguoi_dung/khoa_hoc` dù select cột từ các bảng đó, gây `AdminSchemaNotReadyException`; đã sửa và chạy lại trên PostgreSQL thật.
- Ca nghiệm thu: PB16-01 student/teacher gọi API admin → 403; PB16-02 list/search/filter/page đúng; PB16-03 khóa tài khoản có lý do → request kế tiếp bị chặn; PB16-04 tự khóa mình → 400; PB16-05 hai tab cùng version → một 409; PB16-06 mở lại giữ ghi danh/tiến độ; PB16-07 ẩn khóa → catalog/learning/nộp bị chặn, dữ liệu cũ còn; PB16-08 hiện lại không tạo ghi danh mới; PB16-09 sửa body/URL bằng student không đổi role/lock; PB16-10 admin chỉ đọc đơn DEMO, không xác nhận thanh toán.

#### PB20 / G0–G9 — schema, môi trường, handover

- Thêm preflight `/api/health/preflight` trả tên cấu hình thiếu, trạng thái DB thật, `errorKind`/`hint` an toàn, schema readiness và storage readiness tách riêng; `/api/health` trả thêm database/mode.
- Thêm `deploy/preflight.ps1`; cập nhật `.env.example` và `render.yaml`; thêm tài liệu vận hành và SQL áp dụng/verify (nội dung đã gộp trong file này).
- `.env.example` có đủ key backend/frontend dùng: `AUTH_MODE`, `CLIENT_ORIGIN` dạng danh sách phẩy, `RUN_MIGRATIONS=false` cho DB hiện tại, bucket assignment/media/attachments, `PAYMENT_MODE=DEMO`, `SIGNED_URL_KEY`, SMTP, seed admin.
- SQL thủ công khi không có DB URL: chạy lần lượt `supabase/20261114120000_admin_management.sql` và `supabase/20261114121000_progress_completion_rule.sql`; verify bằng `deploy/verify_phu_sql.sql` và `deploy/verify_phu_sql_summary.sql` (chỉ đọc).

## Definition of Done

Đã tìm trong docs hiện có: có ghi chú Done/giới hạn kiểm chứng của Sprint 5 nhưng chưa có DoD chi tiết cho Sprint 6 tương đương yêu cầu. Tài liệu mới: [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md), đủ S6-01–S6-15, đặc biệt các task còn lại S6-05–S6-15. Owner/phụ thuộc bám kế hoạch mới nhất `D:\Sprint6.docx`.

D05/S6-07 đã được triển khai và kiểm tra ở mức service/API + dữ liệu thật; PB16 đã có API/schema/RLS và smoke test; PB20 đã có preflight/handover. Chưa đánh Done toàn bộ vì còn upload/Storage, E2E có đăng nhập và backup/restore.

## Triển khai và xác minh schema — ĐÃ ÁP DỤNG MỘT PHẦN

### SQL/bucket đã áp dụng

- `supabase/20261114120000_admin_management.sql`
- `supabase/20261114121000_progress_completion_rule.sql`
- `supabase/20261114111000_course_editor_rubrics.sql` (bảng `tieu_chi_cham_diem` trước đó còn thiếu)
- `supabase/20261114110000_assignment_storage.sql` (bucket `assignment-submissions`, private, 10 MB, JPEG/PNG/WEBP)
- Tạo thêm bucket `course-media` (public) và `course-attachments` (private).

Chưa áp dụng `deploy/sprint6-api-write-permissions.sql` vì cần deploy API/FE mới trước khi thu hồi quyền ghi browser.

Người áp dụng schema: chủ workspace, qua Supabase SQL Editor ngày 14/11/2026; Phú xác minh lại bằng `deploy/verify_phu_sql_summary.sql` và các smoke test runtime.

Thứ tự schema đã dùng: schema gốc → rename profiles → assignment storage → rubrics → dashboard RLS → admin management → D05. `deploy/sprint6-api-write-permissions.sql` để sau khi API/FE mới được deploy.

### Kết quả `deploy/verify_phu_sql_summary.sql`

Tất cả `true`: `users_table`, `courses_table`, `auth_users_table`, `admin_lock_columns`, `course_visibility_columns`, `demo_orders_table`, `account_lock_function`, `admin_function`, `history_check_includes_new_types`.

Số liệu: users 18 (admin 3, student 11, teacher 4), courses 11, hidden 0, enrollments 14, progress 13, submissions 0, demo_orders 0, `d05_should_complete_not_completed=0`, `d05_completed_but_missing=0`.

### Runtime đã kiểm tra

- Kết nối PostgreSQL qua pooler `aws-0-ap-south-1`: **OK**.
- `GET /api/health/preflight`: `status=ok`, `database.mode=postgres`, `connected=true`, `schema.ready=true`; `storage.available=false` do thiếu service role key.
- `GET /api/courses`, `/api/courses/11`: **200** với dữ liệu thật.
- `AdminManagementService`/`AdminOrderService` chạy trực tiếp trên PostgreSQL: users 5/18, user detail OK, courses 5/11, course detail OK, orders 0/0.
- Write smoke trong transaction rollback: khóa user, ẩn khóa, ghi `lich_su_trang_thai`, ghi `thong_bao` — **PASS**, không để lại dữ liệu.
- `LearningProgressService.EvaluateAsync` và `ProgressController.Get`: **PASS** trên dữ liệu thật (course 4: 2 chương, 1 bài tập, 0/1 bài nộp).
- `__EFMigrationsHistory` chưa có: **không chạy backend Development tự migrate** trên DB này; dùng `ASPNETCORE_ENVIRONMENT=Production` + `RUN_MIGRATIONS=false` sau khi áp SQL thủ công.

### PB20 — sao lưu/khôi phục thử

Trạng thái: **NOT_RUN**.

- Phạm vi: PostgreSQL schema `public`; `auth.users` chỉ đọc đối chiếu; Storage là nguồn riêng (dump DB không chứa object).
- Trước backup: chạy preflight, ghi project ref/môi trường/người thực hiện, SHA FE/BE, danh sách migration; không in connection string/service key.
- Backup: ưu tiên Supabase Dashboard Backups; nếu `pg_dump` dùng `--schema=public --format=custom`, lưu file/checksum/retention an toàn; không commit dump. Retention: 7 bản ngày + 4 bản tuần.
  ```powershell
  $env:PGURL = '<connection-string-tu-password-manager>'
  pg_dump --dbname $env:PGURL --schema=public --format=custom --file "backup-public-YYYYMMDD.dump"
  Remove-Item Env:\PGURL
  ```
- Storage: liệt kê manifest CSV bucket/path/size/updated_at, tải object private bằng service role ở server, không dùng browser.
- Restore thử: chỉ trên project staging riêng; áp schema theo thứ tự; `pg_restore --no-owner --no-privileges`; khôi phục Storage cùng prefix.
  ```powershell
  $env:PGURL = '<connection-string-staging>'
  pg_restore --dbname $env:PGURL --no-owner --no-privileges "backup-public-YYYYMMDD.dump"
  Remove-Item Env:\PGURL
  ```
- Đối chiếu: số dòng `nguoi_dung/khoa_hoc/ghi_danh/tien_do_bai_hoc/bai_nop/ket_qua_cham`, object count/size, một student mở khóa/tiến độ/bài nộp/điểm, khóa `AN` vẫn ẩn, tài khoản khóa vẫn bị chặn, `DA_HUY` không bị đổi.
- Rollback: quay SHA, không drop bảng/dữ liệu; không khôi phục quyền ghi rộng; ghi PASS/FAIL/NOT_RUN, người chạy, thời điểm, log đã che secret. Bằng chứng gồm file/manifest/checksum, lệnh đã chạy (che secret), bảng số liệu trước/sau, kết quả ca chức năng.

## Giới hạn giữ nguyên phạm vi

- Chưa chạy upload/Storage thật: `SUPABASE_SERVICE_ROLE_KEY` trống; vì vậy chưa nghiệm thu nộp ảnh bài vẽ (2.10.4).
- Chưa có `submissions` trong DB; chưa có ca D05 hoàn thành thật, chưa test khóa/mở/ẩn/hiện qua token user thật và audit/thông báo end-to-end.
- Backup/restore **NOT_RUN**; chưa có chứng cứ restore trên staging.
- Chưa áp dụng `deploy/sprint6-api-write-permissions.sql`, chưa rà restrictive policy Storage trên bucket thật.
- UI quản trị/tiến độ mới không thuộc phạm vi Phú; nếu nghiệm thu gồm giao diện thì cần phần frontend tương ứng.
- Thanh toán/paid gate thuộc S6-09; chưa có checkout/thu tiền thật.
- DB password và `JWT_KEY` từng bị dán vào chat trong quá trình hỗ trợ: cần đổi cả hai sau khi cấu hình xong; không ghi secret vào Git/tài liệu.

## Kiểm tra đã chạy

- `dotnet build server/Linea.Api/Linea.Api.csproj --no-restore`: PASS, 0 warning/0 error.
- `dotnet run --project server/Linea.Api.Tests --no-restore`: PASS 37/37, gồm ca D05 mới.
- `npm.cmd run build`: PASS (TypeScript + Vite); còn cảnh báo chunk >500 kB và annotation của dependency Zod.
- `npm.cmd run lint`: PASS.
- `npm.cmd run test`: PASS 78/78, 14 file.
- `git diff --check`: PASS.
- Supabase thật: kết nối DB/preflight/course public/admin service/progress service/write smoke như trên; **PASS**.
- Chưa chạy: upload/Storage, E2E có đăng nhập user thật, khóa/mở/ẩn/hiện qua API, backup/restore, deploy production.
