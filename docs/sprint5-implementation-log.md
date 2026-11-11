# Nhật ký bổ sung và thống nhất Sprint 5

Ngày: 11/11/2026. Nhánh: `develop`, nền trước thay đổi `8f07621`.

## Phạm vi và quyết định

Theo yêu cầu của PM: bổ sung phần thiếu, thống nhất frontend/backend, chạy test và ghi log. PM xác nhận **tự deploy thủ công**, nên lượt này không deploy, không đổi biến môi trường hosting và không áp dụng migration trên Supabase thật.

| Phần | Thay đổi |
| --- | --- |
| UI gửi hồ sơ — 2.3.3 | Thêm `/teacher/onboarding`: gửi mới/gửi lại, upload multipart, trạng thái, lý do từ chối/bổ sung, ảnh riêng tư bằng signed URL và lịch sử. Giới hạn theo API hiện có; khóa form khi chờ duyệt/đã duyệt hoặc tải hồ sơ thất bại. |
| Duyệt giáo viên — 2.4.3 | `/admin/teachers` đưa về tab phê duyệt Settings; cả hai điểm vào dùng `AdminTeacherProfilesController` để cập nhật trạng thái, vai trò, lịch sử và thông báo trong transaction. Bỏ màn ghi trực tiếp trạng thái Supabase. |
| Kiểm tra hồ sơ | `useTeacherApproval` đọc API hồ sơ hiện tại thay vì truy vấn một schema/trạng thái riêng. Nhận cả `CAN_BO_SUNG`. |
| Khóa học — 2.5.2/2.5.3/2.7.2 | `/api/courses` dùng `khoa_hoc`, ID bigint, owner UUID và trạng thái tiếng Việt, cùng dữ liệu với course editor. Tạo/sửa/list và gửi duyệt từ UI gọi API này. |
| Quyền và chuyển trạng thái | Server tự gán owner và `NHAP`; chỉ owner sửa nháp; bản nháp không công khai. Gửi duyệt/duyệt/từ chối dùng compare-and-update và transaction ghi lịch sử/thông báo. |
| Schema | Thêm migration `20261111153405_UseCanonicalLearningCourses`. PostgreSQL dùng CREATE IF NOT EXISTS để nhận bảng nghiệp vụ hiện hữu, không thay thế dữ liệu; không drop khi rollback. Giữ nguyên bảng `courses` cũ, không tự chuyển GUID sang bigint hoặc xóa dữ liệu cũ. |
| Dọn hợp đồng cũ | Bỏ service/DTO `CourseService` không còn dùng. API cũ dùng GUID và `name/status` được thay bằng ID số và các trường `tieu_de/cap_do/chu_de/mo_ta/anh_dai_dien`. |
| PB10/PB11 — 2.10.1/2.11.1 | Bổ sung [phân tích nghiệp vụ](sprint5-pb10-pb11-analysis.md), chỉ rõ dữ liệu, quyền, luồng, lỗi, test và các quyết định BA/PO cần review. Không ghi nhận đã được BA/PO duyệt. |

Nội dung chương/bài học/bài tập và file bài học tiếp tục dùng cơ chế Supabase/RLS hiện hữu; bảng cha nay cùng là `khoa_hoc`, không còn hai kho dữ liệu khóa học tách biệt. Đây không phải chuyển toàn bộ ứng dụng sang EF. Khi dùng frontend thật, backend phải kết nối **cùng Supabase PostgreSQL** qua `SUPABASE_DB_URL`; SQLite dành cho test/dev độc lập.

## Hợp đồng khóa học hiện hành

| Method | Endpoint | Quyền/đầu ra |
| --- | --- | --- |
| GET | `/api/courses?page=1&pageSize=20&search=...&mine=true` | Danh sách `items`, `page`, `pageSize`, `totalCount`. `mine` cần đăng nhập. Không có `mine`: công khai chỉ thấy `DA_DANG`; giáo viên thấy thêm khóa mình, admin thấy mọi khóa. |
| GET | `/api/courses/{id}` | Khóa đã đăng hoặc owner/admin; bản nháp người khác trả 404. |
| POST | `/api/courses` | Teacher/admin; server gán owner từ token và `NHAP`; trả 201. |
| PUT | `/api/courses/{id}` | Chỉ owner, chỉ `NHAP`; trả 409 nếu trạng thái đã thay đổi. |
| POST | `/api/courses/{id}/submit` | Owner, `NHAP` → `CHO_DUYET`, ghi lịch sử trong transaction. |
| POST | `/api/admin/courses/{id}/approve` | Admin, `CHO_DUYET` → `DA_DANG`, lịch sử + thông báo. |
| POST | `/api/admin/courses/{id}/reject` | Admin, lý do 10–1.000 ký tự; `CHO_DUYET` → `NHAP`, lịch sử + thông báo. |

Body tạo/sửa: `tieu_de` 5–200 ký tự; `mo_ta` 50–5.000; `chu_de` 2–100; `cap_do` một trong `CO_BAN/TRUNG_CAP/NANG_CAO`; `anh_dai_dien` rỗng/null hoặc HTTPS tối đa 500 ký tự. Client không chọn owner/trạng thái.

## Test thực tế

- Frontend Vitest: **60/60**, 9 file; gồm kiểm tra biên form hồ sơ và ảnh.
- Backend smoke: **36/36**; gồm test API khóa học, quyền sở hữu, giả owner/status, SQLite search, phân trang, giữ kín nháp, khóa sửa khi chờ duyệt, duyệt/từ chối, chống duyệt lặp và kiểm tra lịch sử/thông báo thực lưu.
- Build frontend, ESLint và build backend thành công.
- Migration SQLite: áp dụng đủ 6 migration trên DB tạm `.git/sprint5-migration.db`, thành công.
- Browser local: gửi hồ sơ/ảnh thật tới API local; chờ duyệt khóa form; admin dùng màn thống nhất; đăng nhập lại nhận vai trò teacher; tạo/sửa và hiển thị khóa học ID số; responsive mobile; không có lỗi JavaScript; backend route không tồn tại được báo lỗi thay vì cho gửi form trắng.
- Browser dùng Playwright + backend .NET chạy local + SQLite tạm. Chỉ mock Supabase session/profile identity và phần metadata chương/bài học; không phải bằng chứng kiểm thử OAuth, RLS/Storage hay PostgreSQL production.
- Máy đang có runtime .NET 10; chạy backend target net9.0 bằng `DOTNET_ROLL_FORWARD=Major`.
- Kết quả browser/screenshot: `test-results/sprint5/` (gitignored, không commit dữ liệu test).

Lệnh chạy lại từ thư mục repo:

```powershell
npm.cmd ci
npm.cmd run build
npm.cmd run lint
npm.cmd test
$env:DOTNET_ROLL_FORWARD = 'Major' # chỉ cần nếu máy thiếu runtime .NET 9
dotnet run --project server/Linea.Api.Tests
npm.cmd run test:browser
```

Browser script cần backend đã build (smoke test ở lệnh trước thực hiện build), Playwright Chromium đã cài. Script tự tạo tài khoản test/SQLite tạm, khởi động dịch vụ local và dọn process/file tạm khi kết thúc. Không gọi Supabase thật.

## Bàn giao deploy thủ công

1. Deploy **backend và frontend cùng phiên bản**; chỉ deploy Render sẽ không đưa trang onboarding mới lên frontend.
2. Backend: `SUPABASE_DB_URL` trỏ đúng Supabase mà frontend đang dùng; `SUPABASE_URL`, publishable key, `CLIENT_ORIGIN` đúng origin frontend. Chỉ backend giữ database/service-role/signing/SMTP secrets.
3. Chuẩn bị migration và đối chiếu schema PostgreSQL trước khi bật `RUN_MIGRATIONS`; chuỗi migration hiện có dùng snapshot SQLite và các nhánh SQL PostgreSQL viết riêng, chưa được chạy trên PostgreSQL thật trong lượt này. EF Core 9 có thể báo pending-model-changes khi đổi provider; không tự bỏ qua lỗi này hoặc coi SQLite pass là PostgreSQL pass. [Tài liệu EF Core](https://learn.microsoft.com/en-us/ef/core/what-is-new/ef-core-9.0/breaking-changes#exception-is-thrown-when-applying-migrations-if-there-are-pending-model-changes).
4. Kho ảnh hồ sơ cần private bucket `teacher-docs` với cấu hình server hiện hữu; nếu dùng local storage trên hosting thì cần volume bền vững. Các bucket media/attachment của editor và RLS bảng con cần theo cấu hình nhóm.
5. Frontend build cần `VITE_API_URL` đúng backend mới và cấu hình Supabase public. Không đưa `SUPABASE_DB_URL`/service-role key vào biến `VITE_*`.
6. Sau khi PM deploy, kiểm thử có xác thực luồng gửi hồ sơ → admin duyệt → teacher tạo/sửa khóa học. Lượt này không xác nhận deploy/production Done.

## Trạng thái kết thúc

Các phần bổ sung mã và test local có minh chứng ở trên. PB10/PB11 đã có bản phân tích bổ sung, còn review nghiệp vụ; deploy/kiểm thử môi trường thật và review thành viên nhóm thuộc bước tiếp theo. [Báo cáo rà soát ban đầu](sprint5-review-2026-11-11.md) được giữ làm lịch sử, không thay thế bằng kết luận nghiệm thu mới.
