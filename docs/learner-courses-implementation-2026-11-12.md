# Bàn giao chức năng khóa học học viên — 12/11/2026

## Phạm vi đã viết mã

Trong lúc thực hiện, remote Back-End có commit `45b7d89` hoàn tác merge cũ. Bản hoàn thiện giữ thay đổi remote đó và thay phần catalog hard-code bằng luồng backend thật.

- Sửa trang Khóa học bị hỏng sau merge trên Back-End; bỏ catalog/giá giả.
- Khám phá khóa DA_DANG, tìm theo tên/chủ đề, xem chương và danh sách bài trước khi ghi danh.
- Ghi danh qua backend, không tạo bản ghi trùng; ghi danh lại giữ tiến độ cũ.
- Khóa học của tôi: lọc tất cả/đang học/hoàn thành, xem tiến độ và mở đúng khóa.
- Trang học riêng: văn bản, ảnh HTTPS, video YouTube/Vimeo hoặc liên kết HTTPS; bài trước/sau, ghi nhận bắt đầu học, đánh dấu hoàn thành.
- Tiếp tục bài đang học hoặc bài chưa hoàn thành; được xem lại khóa đã hoàn thành.
- Dashboard dùng dữ liệu backend cùng nguồn với danh sách khóa; nút tiếp tục mở đúng khóa.
- Trang `/progress`: tổng hợp tiến độ khóa và số bài tập đã chấm.
- Trang `/assignments`: bài chưa nộp/chờ chấm/đã chấm, mở đúng bài học.
- Nộp một ảnh JPG/PNG/WEBP, tối đa 10 MB, xem trước, kiểm tra chữ ký file ở server. Trước hạn và chưa chấm được thay ảnh.
- Giáo viên phụ trách khóa xem bài nộp và chấm điểm/nhận xét tại `/teacher/courses/:courseId/submissions`; lọc chờ chấm/đã chấm.
- Giáo viên thêm đề bài vào bài học có sẵn của khóa nháp. Không thay đổi yêu cầu của khóa đã xuất bản.
- Sửa điểm có kiểm tra phiên bản bài nộp/kết quả, lưu điểm cũ và mới vào `lich_su_trang_thai` và thông báo học viên.
- Thông báo giáo viên khi nộp bài; thông báo học viên khi có điểm.

## Quy tắc thực hiện

- Chỉ học viên được ghi danh, ghi tiến độ và nộp bài; server lấy ID từ phiên đăng nhập.
- Nội dung học/nộp bài cần ghi danh còn hiệu lực và khóa đang DA_DANG.
- Điểm 0–10, tối đa hai chữ số thập phân; nhận xét bắt buộc, tối đa 2.000 ký tự. Không đặt ngưỡng điểm đậu khi chưa có nghiệp vụ xác định.
- Sau khi có điểm, học viên không thay ảnh. Giáo viên sở hữu khóa có thể sửa điểm, lịch sử được giữ lại.
- Hoàn thành khóa cần ít nhất một bài học bắt buộc, tất cả bài học bắt buộc đã học và tất cả bài tập bắt buộc đã được chấm. Tiến độ phần trăm là phần bài học bắt buộc, không phải phần trăm chấm bài.
- Đánh dấu hoàn thành bài học không xác minh thời lượng xem video; không phát hành chứng chỉ.
- Chưa có thanh toán/học phí trong schema/API này, giao diện không giả lập việc mua khóa.

## Database và Storage cần chuẩn bị trước khi deploy

**Trong đợt làm này không chạy migration, không thay đổi dữ liệu thật, không deploy.** Có đọc metadata schema hiện tại để đối chiếu tên cột/ràng buộc.

Migration EF: `20261112113855_AddAssignmentsAndGrades`. Nhánh PostgreSQL đọc cùng tài nguyên SQL dưới đây; nhánh SQLite có bảng cho môi trường legacy. Không xóa bảng PostgreSQL khi rollback vì các bảng có thể đã tồn tại trước migration.

SQL cần chạy thủ công bằng Supabase SQL Editor khi chuẩn bị deploy:

[`server/Linea.Api/Data/Sql/learner-assignments.sql`](../server/Linea.Api/Data/Sql/learner-assignments.sql)

File này:

1. Tạo bảng còn thiếu `bai_tap`, `bai_nop`, `ket_qua_cham`, giữ các bảng/dữ liệu đã có.
2. Bật RLS, thu hồi quyền ghi trực tiếp enrollment/progress của browser và quyền truy cập trực tiếp các bảng bài tập. Các thao tác đi qua backend với xác thực và kiểm tra sở hữu.
3. Tạo bucket **private** `assignment-submissions`, giới hạn ảnh 10 MB. Policy restrictive ngăn policy Storage rộng có sẵn vô tình mở bucket này cho browser.
4. Tính lại trạng thái ghi danh hiện có theo quy tắc hoàn thành ở trên; không xóa bài/điểm/tiến độ, không tác động ghi danh DA_HUY.

Có thể dùng migration EF nếu hệ thống triển khai đang quản lý lịch sử migration tương ứng. Nếu chạy SQL thủ công thì file không tự ghi vào lịch sử EF. SQL có thể chạy lại khi EF thực hiện migration sau này. Không chạy lại các script grant quyền ghi trực tiếp cũ sau SQL mới.

Backend cần `SUPABASE_DB_URL` (kết nối server có quyền đọc/ghi các bảng; môi trường hiện tại dùng pooler), `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`. Key server chỉ ở Render, không đặt trong biến VITE. Bucket bài tập cố định riêng, không dùng `SUPABASE_STORAGE_BUCKET` của hồ sơ giáo viên. Frontend giữ `VITE_API_URL` trỏ backend và cấu hình Supabase Auth hiện có.

Nên triển khai backend/frontend cùng phiên bản, sau khi chuẩn bị SQL. Bản frontend cũ ghi thẳng Supabase sẽ bị từ chối ghi sau thay đổi quyền. Nếu deploy thủ công với SQL, giữ cấu hình chạy migration tự động theo quy trình đang dùng; không bật `RUN_MIGRATIONS=true` chỉ để thử khi chưa đối chiếu toàn bộ lịch sử EF cũ.

## An toàn dữ liệu và giới hạn

- Ảnh chỉ được mở bởi người nộp hoặc giáo viên sở hữu khóa; backend cấp link ngắn hạn 5 phút. Không trả đường dẫn object trong danh sách.
- Các thao tác ghi của cùng học viên/khóa dùng transaction lock PostgreSQL; việc lưu điểm, trạng thái hoàn thành, lịch sử và thông báo cùng transaction.
- Kiểm tra phiên bản trước chấm để tránh ghi đè ảnh mới/điểm mới từ tab khác.
- Ảnh thay thế được dọn sau khi commit. Nếu Storage hoặc database lỗi giữa lúc upload/lưu, có thể còn object không được tham chiếu; cần dọn theo log/dữ liệu khi vận hành. Không tự xóa ảnh không rõ nguồn.
- Mã ưu tiên runtime PostgreSQL/Supabase hiện có; chưa kiểm thử luồng bài tập bằng SQLite legacy.
- Chưa chạy kiểm thử chức năng, phân quyền, concurrency, SQL hoặc E2E trong đợt này, theo yêu cầu người dùng. Build thành công không chứng minh các luồng runtime đã chạy đúng.

## Kiểm tra đã thực hiện

- `npm.cmd run build`: thành công (TypeScript + Vite), còn cảnh báo bundle lớn và chú thích thư viện Zod.
- `dotnet build server/Linea.Api/Linea.Api.csproj --no-restore`: thành công.
- `git diff --check`: không có lỗi khoảng trắng.
- Không chạy `npm test`, E2E, backend harness, API ghi dữ liệu hay migration thật.

## API

| API | Mục đích |
| --- | --- |
| GET `/api/courses` | Danh sách khóa công khai/phù hợp quyền |
| GET `/api/courses/mine` | Khóa đã ghi danh và tiến độ của người đăng nhập |
| GET `/api/courses/:id/learning` | Giới thiệu, chương/bài, tiến độ và trạng thái ghi danh |
| POST `/api/courses/:id/enroll` | Ghi danh |
| GET `/api/courses/:id/lessons/:lessonId` | Nội dung bài học đã có quyền học |
| PUT `/api/courses/:id/lessons/:lessonId/progress` | Bắt đầu/hoàn thành bài học |
| GET `/api/assignments?lessonId=...` | Bài tập và bài nộp/điểm của bản thân; bỏ lessonId để xem tất cả |
| POST `/api/assignments/:id/submission` | Multipart `file`, không nhận studentId/status từ client |
| GET `/api/assignments/submissions/:id/image` | Link ảnh ngắn hạn; legacy trả file sau kiểm tra quyền |
| GET `/api/assignments/teacher?courseId=...` | Bài tập và bài nộp của khóa do giáo viên sở hữu |
| POST `/api/assignments/teacher` | Thêm bài tập cho bài học của khóa nháp |
| PUT `/api/assignments/submissions/:id/grade` | Chấm/sửa điểm, nhận xét và phiên bản mong đợi |

Tham khảo cách phục vụ ảnh riêng tư: [Supabase Storage](https://supabase.com/docs/guides/storage/serving/downloads), [Storage remove implementation](https://github.com/supabase/storage-js/blob/master/src/packages/StorageFileApi.ts).
