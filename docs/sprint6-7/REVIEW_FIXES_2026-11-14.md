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

## Definition of Done

Đã tìm trong docs hiện có: có ghi chú Done/giới hạn kiểm chứng của Sprint 5 nhưng chưa có DoD chi tiết cho Sprint 6 tương đương yêu cầu. Tài liệu mới: [DEFINITION_OF_DONE.md](DEFINITION_OF_DONE.md), đủ S6-01–S6-15, đặc biệt các task còn lại S6-05–S6-15. Owner/phụ thuộc bám kế hoạch mới nhất `D:\Sprint6.docx`.

## Chuẩn bị triển khai — CHƯA ÁP DỤNG

1. Phú review schema/migration rubric và script `deploy/sprint6-api-write-permissions.sql` trước khi chạy.
2. Đối chiếu `SUPABASE_MEDIA_BUCKET` (public), `SUPABASE_ATTACHMENTS_BUCKET` (private), `ASSIGNMENT_STORAGE_BUCKET` (private). Thay ID ví dụ trong script bằng ID thực tế; script dừng nếu bucket không khớp cấu hình public/private.
3. Backend phải dùng tài khoản DB server đủ quyền; không dùng role browser. FE giữ API URL và cấu hình đọc private attachment hiện có.
4. Deploy API/FE phù hợp trước khi thu hồi quyền ghi browser. Script thu hồi cả quyền bảng và quyền cột lịch sử, giữ nguyên quyền đọc/RLS hiện có, không tắt RLS hay cấp quyền rộng.
5. Rà restrictive policy Storage trên đúng bucket thực tế. Script không sửa quyền đọc; URL ký private attachment vẫn cần policy đọc đúng quyền. Không mặc định policy hiện tại đã an toàn.
6. Ghi rõ ai đã áp dụng script, môi trường, thời gian, backup grants/policies và kết quả truy vấn kiểm tra. Không khôi phục quyền ghi rộng để xử lý lỗi deploy.
7. Nghiệm thu theo DoD khi có chỉ định. Production chưa được xác minh; không đánh Done vì merge/build.

## Giới hạn giữ nguyên phạm vi

- Không chạy test/E2E/backend harness/API nghiệm thu, migration, SQL lên cloud, restore hoặc deploy trong tác vụ này theo yêu cầu không test đã có.
- SQL quyền là artifact bàn giao, chưa có bằng chứng áp dụng trên Supabase thật.
- Quy tắc hoàn thành trong service/SQL cũ còn chờ chấm thuộc S6-07; phải đổi thành nộp đủ, không chờ chấm theo DoD trước khi đóng S6-07.
- Thanh toán/paid gate thuộc S6-09; PR này không chứng minh đã có checkout hay thu tiền.
- Build/lint chỉ xác minh biên dịch và kiểm tra tĩnh. Chưa chứng minh concurrency, Storage thật hoặc quyền database runtime.

## Kiểm tra đã chạy

- `npm.cmd run build`: PASS (TypeScript + Vite); còn cảnh báo chunk >500 kB và annotation của dependency Zod.
- `npm.cmd run lint`: PASS.
- `dotnet build server/Linea.Api/Linea.Api.csproj --no-restore`: PASS, 0 warning/0 error.
- `git diff --check`: PASS.
- Test chức năng/E2E/concurrency/SQL/Supabase thật: NOT_RUN, không có kết quả pass được suy từ build.
