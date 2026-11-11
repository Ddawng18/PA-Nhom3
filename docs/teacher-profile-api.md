# API hồ sơ giáo viên và duyệt/từ chối (WBS 2.3.2, 2.4.2)

Cập nhật: 11/11/2026. Phạm vi: xử lý phía máy chủ cho **gửi hồ sơ giáo viên**
(WBS 2.3.2) và **duyệt, từ chối hoặc yêu cầu bổ sung hồ sơ giáo viên**
(WBS 2.4.2), dựa trên phân tích 2.3.1/2.4.1 trong tài liệu
`docs/Nhóm 3_tuần 4.docx` (mục 3.1 và 3.2).

## 1. Liên kết bàn giao

| Hạng mục | Liên kết |
| --- | --- |
| Sản phẩm frontend | https://linea-nhom3.vercel.app/login |
| Backend đang triển khai (health) | https://linea-api-7f2q.onrender.com/api/health |
| Tài liệu phân tích 2.3.1 | `docs/Nhóm 3_tuần 4.docx`, mục 3.1; thẻ Trello: https://trello.com/c/qQjZUFr8 |
| Tài liệu phân tích 2.4.1 | `docs/Nhóm 3_tuần 4.docx`, mục 3.2; thẻ Trello: https://trello.com/c/I4aiu3aZ |
| Tài liệu API này | `docs/teacher-profile-api.md` |
| API hồ sơ giáo viên | `server/Linea.Api/Controllers/TeacherProfileController.cs` |
| API quản trị duyệt/từ chối | `server/Linea.Api/Controllers/AdminTeacherProfilesController.cs` |
| API tải ảnh bằng signed URL | `server/Linea.Api/Controllers/TeacherDocumentController.cs` |
| Quy tắc dữ liệu/EF | `server/Linea.Api/Models/TeacherProfile.cs`, `server/Linea.Api/Data/AppDbContext.cs` |
| Lưu ảnh local | `server/Linea.Api/Services/LocalPortfolioStorage.cs` |
| Lưu ảnh Supabase Storage | `server/Linea.Api/Services/SupabasePortfolioStorage.cs` |
| Signed URL | `server/Linea.Api/Services/SignedUrlService.cs` |
| Email | `server/Linea.Api/Services/EmailSender.cs`, `TeacherProfileEmails.cs` |
| Cập nhật vai trò tài khoản | `server/Linea.Api/Services/AccountDirectory.cs` |
| Migration trạng thái/quyết định | `server/Linea.Api/Migrations/20261111084701_AddTeacherProfileReviewDetails.cs` |
| Kiểm thử tích hợp | `server/Linea.Api.Tests/Program.cs`; kết quả tại mục 6 |

> Backend Render hiện tại là bản triển khai trước thay đổi này. Cần deploy lại
> backend (và cấu hình `SUPABASE_DB_URL`, Storage/email nếu dùng) trước khi kiểm
> thử đầu cuối trên URL sản phẩm.

## 2. Kiến trúc và quyết định triển khai

- Xác thực tiếp tục dùng Supabase Auth; vai trò lấy từ `nguoi_dung.role` qua
  handler hiện có. API không tin vai trò do client gửi.
- Hồ sơ giáo viên dùng các bảng nghiệp vụ đã có trong Supabase:
  `ho_so_giao_vien`, `anh_tac_pham`, `thong_bao`, `lich_su_trang_thai`.
- EF Core ánh xạ đúng tên bảng/cột snake_case. Khi có `SUPABASE_DB_URL`,
  backend dùng PostgreSQL; khi chạy test/legacy, backend dùng SQLite.
- Trạng thái hồ sơ: `CHO_DUYET`, `CAN_BO_SUNG`, `DA_DUYET`, `TU_CHOI`.
  `CAN_BO_SUNG` là trạng thái mới, yêu cầu lý do và danh sách trường cần sửa.
- Quyết định của admin lưu riêng `reasonCode`, `internalNote` và `fields`
  (JSON text) trên hồ sơ và trong lịch sử; không gộp vào một chuỗi lý do.
  `internalNote` chỉ trả cho admin, không trả cho chủ hồ sơ.
- Duyệt hồ sơ là thao tác nguyên tử trong một transaction: cập nhật trạng thái
  hồ sơ + `ngay_duyet`, đổi vai trò tài khoản, ghi lịch sử và thông báo. Với
  PostgreSQL, vai trò được cập nhật trong `nguoi_dung.role`; với chế độ legacy,
  cập nhật `users.Role`.
- Ảnh tác phẩm được kiểm tra magic bytes (JPG/PNG/WEBP), giới hạn 10 MB/ảnh và
  30 MB/tổng. Kho lưu có hai lựa chọn:
  - **Local** (mặc định khi chưa cấu hình Storage): tên UUID trong thư mục riêng
    tư (`TEACHER_DOCS_PATH`).
  - **Supabase Storage**: upload/HEAD/range-check/sign qua Storage REST khi có
    `SUPABASE_SERVICE_ROLE_KEY`; bucket mặc định `teacher-docs`.
- Signed URL có thời hạn 5 phút. Với local, API ký HMAC-SHA256 và phục vụ qua
  `/api/teacher-docs/{imageId}?token=...`. Với Supabase Storage, API lấy signed
  URL của Storage (300 giây).
- Email được gửi sau khi transaction commit, theo kiểu best-effort: lỗi SMTP
  không làm hỏng thao tác nghiệp vụ. Có chế độ outbox ghi file cho dev/test.
- Mọi thao tác gửi/duyệt/từ chối/yêu cầu bổ sung đều ghi
  `lich_su_trang_thai` và tạo bản ghi `thong_bao` tiếng Việt cho người gửi.

## 3. Hợp đồng API

### 3.1. Học viên gửi hồ sơ

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/api/teacher/profile/me` | Đã đăng nhập (student/teacher) | Hồ sơ hiện tại, ảnh, lịch sử; `404` nếu chưa có. Admin nhận `403`. |
| `POST` | `/api/teacher/profile/me/submit` | `student` | Gửi mới hoặc gửi lại sau `TU_CHOI`/`CAN_BO_SUNG`; trả `202`. |
| `POST` | `/api/teacher/profile/me/portfolio` | `student` | Upload ảnh riêng tư (multipart `file`); trả `201`. |
| `GET` | `/api/teacher/profile/me/portfolio/{imageId}` | Chủ hồ sơ | Tải ảnh của chính mình (local trả file, Storage trả redirect). |
| `POST` | `/api/teacher/profile/me/portfolio/{imageId}/signed-url` | Chủ hồ sơ | Tạo signed URL 5 phút. |

Ví dụ gửi hồ sơ:

```http
POST /api/teacher/profile/me/submit
Authorization: Bearer <supabase-access-token>
Content-Type: application/json

{
  "introduction": "Giáo viên minh họa với 5 năm kinh nghiệm...",
  "experience": "Đã giảng dạy ký họa và màu nước...",
  "portfolioFiles": ["teacher-docs/4f1c....png"]
}
```

```json
202 Accepted
{
  "id": 12,
  "status": "CHO_DUYET",
  "submittedAt": "2026-11-11T07:30:00+00:00"
}
```

Quy tắc dữ liệu:

| Trường | Quy tắc |
| --- | --- |
| `introduction` | Bắt buộc; 50-1000 ký tự sau khi làm sạch HTML. |
| `experience` | Bắt buộc; 10-2000 ký tự sau khi làm sạch HTML. |
| `portfolioFiles` | 1-5 ảnh; mỗi ảnh phải tồn tại trong kho, JPG/PNG/WEBP, ≤10 MB; tổng ≤30 MB; không trùng. |
| `status`, `role`, `userId` | Không nhận từ client. |

Trạng thái và chuyển trạng thái:

| Trạng thái hiện tại | Hành động | Kết quả |
| --- | --- | --- |
| Không có hồ sơ | Gửi | Tạo mới `CHO_DUYET`, ghi lịch sử + thông báo + email. |
| `TU_CHOI` | Gửi lại | Cập nhật nội dung/ảnh, về `CHO_DUYET`; lý do cũ được giữ trong lịch sử. |
| `CAN_BO_SUNG` | Gửi lại | Cập nhật nội dung/ảnh, về `CHO_DUYET`; lý do/mã/trường cũ được giữ trong lịch sử. |
| `CHO_DUYET` | Gửi lại | `409 TEACHER_PROFILE_EXISTS`; form bị khóa. |
| `DA_DUYET` | Gửi lại | `409 INVALID_STATUS_TRANSITION`; chuyển khu vực giáo viên. |
| Admin | Gửi | `403 FORBIDDEN`. |
| Giáo viên đã duyệt | Gửi | `409 INVALID_STATUS_TRANSITION`. |
| Gửi lại quá 3 lần/30 ngày | Gửi | `429 RATE_LIMITED`. |

### 3.2. Admin duyệt, từ chối hoặc yêu cầu bổ sung

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/api/admin/teacher-profiles` | `admin` | Hàng đợi; lọc `status`, tìm `q`, phân trang tối đa 20. |
| `GET` | `/api/admin/teacher-profiles/{id}` | `admin` | Chi tiết hồ sơ, ảnh, lịch sử, `internalNote`, `fields`. |
| `POST` | `/api/admin/teacher-profiles/{id}/approve` | `admin` | Duyệt hồ sơ đang `CHO_DUYET`. |
| `POST` | `/api/admin/teacher-profiles/{id}/reject` | `admin` | Từ chối, bắt buộc `reason` 10-500 ký tự. |
| `POST` | `/api/admin/teacher-profiles/{id}/request-changes` | `admin` | Chuyển `CAN_BO_SUNG`, bắt buộc lý do + `fields`. |
| `GET` | `/api/admin/teacher-profiles/{id}/portfolio/{imageId}` | `admin` | Tải ảnh để thẩm định. |
| `POST` | `/api/admin/teacher-profiles/{id}/portfolio/{imageId}/signed-url` | `admin` | Tạo signed URL 5 phút. |
| `GET` | `/api/teacher-docs/{imageId}?token=...` | Public + token | Tải ảnh local bằng signed URL; token sai/hết hạn trả `401`. |

Ví dụ duyệt:

```http
POST /api/admin/teacher-profiles/12/approve
Authorization: Bearer <admin-token>
Content-Type: application/json

{ "note": "Hồ sơ đầy đủ, ảnh đúng chuyên môn." }
```

```json
200 OK
{
  "id": 12,
  "status": "DA_DUYET",
  "role": "teacher",
  "reviewedAt": "2026-11-11T08:00:00+00:00"
}
```

Ví dụ từ chối:

```http
POST /api/admin/teacher-profiles/13/reject
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reasonCode": "UNCLEAR_PORTFOLIO",
  "reason": "Ảnh tác phẩm bị mờ, vui lòng tải lại ảnh rõ hơn.",
  "internalNote": "Đã kiểm tra 3 ảnh."
}
```

```json
200 OK
{
  "id": 13,
  "status": "TU_CHOI",
  "reasonCode": "UNCLEAR_PORTFOLIO",
  "rejectionReason": "Ảnh tác phẩm bị mờ, vui lòng tải lại ảnh rõ hơn.",
  "reviewedAt": "2026-11-11T08:05:00+00:00"
}
```

Ví dụ yêu cầu bổ sung:

```http
POST /api/admin/teacher-profiles/14/request-changes
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "reasonCode": "MISSING_DOCUMENT",
  "reason": "Thiếu ảnh tác phẩm theo chuyên môn đã chọn.",
  "fields": ["portfolioFiles"],
  "internalNote": "Cần kiểm tra lại ảnh."
}
```

```json
200 OK
{
  "id": 14,
  "status": "CAN_BO_SUNG",
  "reasonCode": "MISSING_DOCUMENT",
  "supplementReason": "Thiếu ảnh tác phẩm theo chuyên môn đã chọn.",
  "fields": ["portfolioFiles"],
  "reviewedAt": "2026-11-11T08:10:00+00:00"
}
```

Mã lý do được chấp nhận: `MISSING_DOCUMENT`, `UNCLEAR_PORTFOLIO`,
`INSUFFICIENT_EXPERIENCE`, `INVALID_IDENTITY`, `COPYRIGHT_VIOLATION`,
`DUPLICATE_PROFILE`, `OTHER`.

`fields` chỉ nhận `introduction`, `experience`, `portfolioFiles`.

### 3.3. Signed URL

Ví dụ tạo signed URL:

```http
POST /api/teacher/profile/me/portfolio/7/signed-url
Authorization: Bearer <student-token>
```

```json
200 OK
{
  "url": "/api/teacher-docs/7?token=eyJ2Ijoi...",
  "expiresAt": "2026-11-11T08:15:00+00:00"
}
```

- Token HMAC-SHA256 gắn `imageId`, `userId` của chủ hồ sơ và thời điểm hết hạn.
- Hết hạn sau 5 phút; sửa token hoặc dùng sai ảnh trả `401`.
- Với Supabase Storage, `url` là signed URL của Storage (300 giây).
- Chỉ chủ hồ sơ hoặc admin được yêu cầu signed URL; người khác nhận `404`.

## 4. Mã lỗi và thông báo

| HTTP | Mã | Tình huống |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Thiếu/sai `introduction`, `experience`, ảnh, `reason`, `reasonCode`, `fields`. |
| `401` | `SIGNED_URL_INVALID` | Signed URL sai, bị sửa hoặc hết hạn. |
| `401` | — | Thiếu/hết hạn token, tài khoản bị khóa. |
| `403` | `FORBIDDEN` | Admin gửi hồ sơ; student gọi API admin; sai vai trò. |
| `404` | `NOT_FOUND` | Chưa có hồ sơ/không tìm thấy ảnh. |
| `409` | `TEACHER_PROFILE_EXISTS` | Hồ sơ đang `CHO_DUYET` và gửi lặp. |
| `409` | `INVALID_STATUS_TRANSITION` | Duyệt/từ chối/yêu cầu bổ sung sai trạng thái; giáo viên đã duyệt gửi lại. |
| `409` | `ACCOUNT_NOT_FOUND` | Không tìm thấy tài khoản khi đổi vai trò. |
| `413` | `UPLOAD_TOO_LARGE` | Ảnh >10 MB hoặc tổng >30 MB. |
| `415` | `UPLOAD_INVALID_TYPE` | Không phải JPG/PNG/WEBP theo magic bytes. |
| `429` | `RATE_LIMITED` | Gửi lại quá 3 lần/30 ngày. |
| `502` | `STORAGE_ERROR` | Supabase Storage lỗi khi upload/kiểm tra/ký URL. |
| `503` | `STORAGE_NOT_CONFIGURED` | Bật Storage nhưng thiếu cấu hình. |
| `500` | — | Lỗi hệ thống; không trả chi tiết nội bộ. |

Thông báo tiếng Việt tiêu biểu:

- Gửi thành công: “Hồ sơ giáo viên của bạn đã được gửi và đang chờ duyệt.”
- Đang chờ: “Hồ sơ của bạn đã được gửi trước đó. Vui lòng chờ kết quả duyệt.”
- Duyệt: “Chúc mừng! Hồ sơ giáo viên của bạn đã được duyệt. Bạn có thể bắt đầu tạo khóa học.”
- Từ chối: “Hồ sơ giáo viên của bạn bị từ chối. Lý do: {reason}. Bạn có thể chỉnh sửa và gửi lại.”
- Yêu cầu bổ sung: “Hồ sơ giáo viên cần bổ sung: {reason}. Vui lòng cập nhật: {fields} và gửi lại.”
- Ảnh hết hạn: “Liên kết ảnh không hợp lệ hoặc đã hết hạn.”

## 5. Dữ liệu, migration và cấu hình

### 5.1. Dữ liệu

- `ho_so_giao_vien.trang_thai` nhận `CHO_DUYET`, `CAN_BO_SUNG`, `DA_DUYET`,
  `TU_CHOI`; `CAN_BO_SUNG` bắt buộc có `ly_do_bo_sung`.
- Cột quyết định hiện hành:
  - `ly_do_tu_choi` (khi `TU_CHOI`)
  - `ly_do_bo_sung` (khi `CAN_BO_SUNG`)
  - `ma_ly_do` (`reasonCode`)
  - `ghi_chu_noi_bo` (`internalNote`)
  - `truong_can_bo_sung` (JSON array các trường cần sửa)
- `lich_su_trang_thai` lưu thêm `ma_ly_do`, `ghi_chu_noi_bo`,
  `truong_can_bo_sung` để audit từng quyết định.
- Khi gửi lại, các cột quyết định hiện hành được xóa; lịch sử giữ lý do/mã/
  trường cũ.
- `ma_nguoi_dung` là duy nhất trên `ho_so_giao_vien`; mỗi người chỉ có một hồ sơ
  hiện hành.

### 5.2. Migration

- `20261111072247_AddTeacherProfileWorkflow`: tạo bảng hồ sơ/ảnh/thông báo/
  lịch sử.
- `20261111084701_AddTeacherProfileReviewDetails`: thêm cột quyết định, cập
  nhật check constraint trạng thái cho `CAN_BO_SUNG` trên PostgreSQL và thêm
  cột tương ứng cho SQLite.

### 5.3. Cấu hình

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `SUPABASE_DB_URL` | Có khi dùng Supabase | Kết nối PostgreSQL để đọc/ghi hồ sơ và đổi `nguoi_dung.role`. |
| `TEACHER_DOCS_PATH` | Không | Thư mục ảnh local; mặc định `App_Data/teacher-docs`. |
| `SUPABASE_SERVICE_ROLE_KEY` | Có khi dùng Storage | Khóa server-side cho Supabase Storage. **Không** đưa vào frontend. |
| `SUPABASE_STORAGE_BUCKET` | Không | Bucket ảnh; mặc định `teacher-docs`. |
| `SIGNED_URL_KEY` | Khuyến nghị | Khóa ký signed URL local; nếu trống dùng `JWT_KEY` hoặc `SUPABASE_SERVICE_ROLE_KEY`, cuối cùng là khóa ngẫu nhiên. |
| `EMAIL_OUTBOX_PATH` | Không | Ghi email ra file cho dev/test thay vì gửi SMTP. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`, `SMTP_ENABLE_SSL` | Không | Cấu hình gửi email thật. Thiếu cấu hình thì bỏ qua và ghi log. |

- Khi có `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`, backend chọn
  `SupabasePortfolioStorage`; ngược lại dùng `LocalPortfolioStorage`. Cần tạo
  bucket **riêng tư** tên `teacher-docs` (hoặc tên trong
  `SUPABASE_STORAGE_BUCKET`) trước khi dùng; service role key upload/sign trực
  tiếp nên không cần policy cho `anon`/`authenticated`.
- Ở Production, `Program` không tự chạy migration (chỉ chạy ở Development). Nếu
  deploy với SQLite, cần chạy `dotnet ef database update` trước.
- Email chỉ gửi sau khi transaction commit; lỗi SMTP được ghi log và không làm
  hỏng phản hồi API.

## 6. Kết quả kiểm thử

Lệnh chạy:

```powershell
dotnet build server/Linea.slnx
$env:DOTNET_ROLL_FORWARD='Major'
dotnet run --project server/Linea.Api.Tests --no-build
```

Kết quả ngày 11/11/2026: **30/30 test đạt**, gồm các test mới cho phạm vi này:

```text
PASS teacher profile endpoints require authentication and a student role
PASS student submits a teacher profile and remains a student
PASS pending teacher profile blocks resubmission
PASS admin approves a teacher profile and promotes the account
PASS admin rejects a teacher profile and the student resubmits
PASS admin requests changes and the student resubmits
PASS teacher profile permissions and portfolio privacy are enforced
PASS signed portfolio URLs serve images and reject tampering
PASS Supabase storage builds upload, validation and signed URL requests
PASS portfolio upload rejects invalid type and oversized files
RESULT passed=30 failed=0
```

Đối chiếu tiêu chí chấp nhận:

| Tiêu chí | Bằng chứng kiểm thử |
| --- | --- |
| AC-TP-02, AC-TP-04, AC-TP-05 | Test gửi hồ sơ, thiếu ảnh/trường, upload sai loại/quá dung lượng. |
| AC-TP-06, AC-TP-07, AC-TP-16 | Test chặn gửi lặp; gửi lại sau `TU_CHOI`; yêu cầu bổ sung và gửi lại sau `CAN_BO_SUNG`. |
| AC-TP-09, AC-TP-10, AC-TP-11 | Unique `ma_nguoi_dung`, vai trò vẫn `student` sau khi gửi, admin bị `403`. |
| AC-TP-12 | Ảnh riêng tư: người khác nhận `404`, chủ hồ sơ/admin tải được. |
| AC-TP-13 | Giới hạn 3 lần gửi lại/30 ngày. |
| AC-APR-01, AC-APR-03, AC-APR-05 | Duyệt cập nhật trạng thái + ngày duyệt + role + lịch sử/thông báo; từ chối thiếu lý do bị chặn; cập nhật có điều kiện `WHERE trang_thai = 'CHO_DUYET'`. |
| AC-APR-02, AC-APR-04, AC-APR-09, AC-APR-10 | Từ chối lưu lý do/mã/ghi chú, giữ `student`; sai trạng thái trả `409`; người dùng thấy lý do và gửi lại được. |
| AC-APR-06, AC-APR-07 | Học viên gọi API admin nhận `403`; admin bị khóa bị handler xác thực từ chối. |
| AC-APR-08, AC-APR-11, AC-APR-12 | Đăng nhập lại nhận `teacher`; signed URL 5 phút và kiểm tra quyền xem; lịch sử ghi actor/trạng thái cũ/mới/mã lý do/ghi chú. |
| AC-APR-15 | `CAN_BO_SUNG` lưu lý do + trường cần sửa + thông báo/email; người dùng sửa và gửi lại. |

## 7. Giới hạn còn lại

1. **`NHAP`**: chưa thêm trạng thái nháp; hồ sơ chỉ tồn tại sau khi gửi.
2. **Xác nhận email/khóa tài khoản**: API tin cậy token Supabase đã xác minh;
   chưa kiểm tra riêng `email_confirmed_at`. `nguoi_dung` chưa có cột
   `account_status`.
3. **Email thật**: đã có SMTP + outbox, nhưng chưa kiểm thử gửi thật qua nhà
   cung cấp SMTP; cần cấu hình và kiểm thử trên môi trường staging.
4. **Supabase Storage thật**: đã có client REST và test bằng HTTP giả lập; chưa
   kiểm thử với bucket/service key thật. Cần tạo bucket riêng tư `teacher-docs`
   và đặt `SUPABASE_SERVICE_ROLE_KEY` ở backend.
5. **Signed URL của Supabase**: do Storage cấp, không gắn với userId như token
   local; bù lại thời hạn 300 giây và quyền tạo URL đã được kiểm tra ở API.
6. **Tìm email trên Supabase**: hàng đợi admin lấy `display_name` từ
   `nguoi_dung` và email từ `auth.users`; nếu không đọc được `auth.users`, email
   trả `null` và chỉ ghi log.
7. **Hiệu năng hàng đợi**: bộ lọc `q` và phân trang hiện chạy sau khi tải danh
   sách theo trạng thái; phù hợp MVP, cần tối ưu bằng truy vấn join khi dữ liệu
   lớn.
8. **Chuyển kho lưu**: local dùng path `teacher-docs/<uuid>.<ext>`, Supabase
   Storage dùng `<uuid>.<ext>` trong bucket. Khi đổi backend lưu ảnh cần di
   chuyển object và cập nhật `anh_tac_pham.duong_dan_anh` tương ứng.
9. **Triển khai**: cần deploy lại backend, cấu hình `SUPABASE_DB_URL` và (nếu
   dùng) Storage/SMTP trước khi kiểm thử đầu cuối.

## 8. Cách chạy nhanh

```powershell
# 1. Backend + SQLite (không cần Supabase) cho kiểm thử cục bộ
dotnet run --project server/Linea.Api

# 2. Chạy toàn bộ kiểm thử tích hợp
dotnet build server/Linea.slnx
$env:DOTNET_ROLL_FORWARD='Major'
dotnet run --project server/Linea.Api.Tests --no-build
```

Với Supabase, đặt `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
`SUPABASE_DB_URL`, `CLIENT_ORIGIN` theo `server/README.md` trước khi chạy.
