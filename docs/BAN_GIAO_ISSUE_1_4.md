# Bàn giao Issue 1–4 · LINEA

## Thay đổi

| Mục | Kết quả |
| --- | --- |
| 1. Hồ sơ giáo viên | Học viên có mục **Bạn muốn làm giáo viên?**. Hồ sơ chờ duyệt hoặc bị từ chối có thể rút để sửa. Form hỗ trợ ảnh tác phẩm, CV PDF tối đa 5 MB và thẻ tự nhập. Có thể xóa tệp gửi nhầm sau khi rút. Admin vẫn xét duyệt trong Quản trị. Các trang hồ sơ mẫu đã được gỡ. |
| 2. Xác nhận email | Người dùng đăng ký bằng email phải mở liên kết xác nhận trước khi đăng nhập. Form hỗ trợ gửi lại liên kết. Đăng ký và quên mật khẩu đều gửi qua Supabase Auth. Tham khảo [hướng dẫn cấu hình Brevo](../CHAY_LOCAL.md#4-đăng-ký-và-cấu-hình-brevo-thủ-công). |
| 3. Hạn nộp | Form bài tập hiển thị giờ theo thiết bị và lưu thời điểm dưới dạng UTC. Khi bấm **Lưu toàn bộ**, form giữ nguyên bài học đang mở và hiện **Đã lưu khóa học**. |
| 4. Ảnh tác phẩm khóa học | Trong **Thông tin cơ bản**, giảng viên tải tối đa 5 ảnh mỗi nhóm, có thể xem trước và xóa ảnh. Trang khóa học đã xuất bản hiển thị bộ ảnh giữa nội dung và các khóa học cùng chủ đề. |

Lỗi 5 về thanh toán không nằm trong pull request này.

## Cần làm trước khi triển khai web

Render theo dõi nhánh `develop` và giữ `RUN_MIGRATIONS=false`. Áp dụng schema trước khi merge hoặc triển khai API của pull request. API mới đọc các cột hồ sơ và ảnh mới ngay khi tải dữ liệu.

1. Dùng .NET SDK và công cụ EF Core 9.0.22 để xuất SQL đúng phạm vi ba migration của pull request:

   ```powershell
   dotnet ef migrations script 20261121085623_CatalogMetadataSnapshot 20261122153057_CourseArtwork --idempotent --project server/Linea.Api --output LINEA_Issue_1_4.sql
   ```

   Xem lại SQL rồi chạy trên project Supabase mà Render đang dùng. Phạm vi này gồm trạng thái rút hồ sơ, thông tin và bảng CV riêng tư, cùng hai cột ảnh và giới hạn 5 ảnh mỗi nhóm. Không chạy cập nhật EF toàn bộ lịch sử cho database dùng chung đang được quản lý bằng các script riêng. Không bật `RUN_MIGRATIONS` để thay bước này.

2. Kiểm tra bucket `teacher-docs` là **private** và `course-media` là **public**. Render cần `SUPABASE_SERVICE_ROLE_KEY` và đúng tên bucket. Chỉ API được giữ khóa server.
3. Trên Supabase Auth, giữ **Confirm email** bật. Với Brevo, dùng SMTP key trên Supabase và duyệt đúng IP của kết nối SMTP nếu Auth Logs trả `525 Unauthorized IP address`. Kiểm tra redirect `/auth/callback` và `/reset-password` của Vercel. Hai luồng Auth này không cần biến SMTP trên Render.

## Cách nghiệm thu trên web sau khi triển khai

1. Bằng tài khoản học viên, gửi hồ sơ có ảnh và CV, rút khi đang chờ duyệt, xóa tệp gửi nhầm rồi gửi lại. Kiểm tra admin thấy hồ sơ và tải được CV.
2. Thử đăng ký bằng một hộp thư chưa dùng và xác nhận trước khi đăng nhập. Thử **Quên mật khẩu** riêng bằng tài khoản đã tồn tại.
3. Trong khóa học nháp, chọn hạn nộp 04:00, lưu và mở lại trên cùng thiết bị. Kiểm tra giờ vẫn là 04:00 và lần lưu không đóng bài đang sửa.
4. Trong **Thông tin cơ bản**, thử thêm ảnh vào cả hai nhóm rồi **Lưu toàn bộ**. Mở lại bản nháp để kiểm tra ảnh còn đủ. Xuất bản qua luồng duyệt và kiểm tra thứ tự hiển thị trên trang khóa học.

Kiểm thử tự động bao gồm form hồ sơ, xác nhận email, lưu hạn nộp theo hai múi giờ, thông báo sau khi lưu, và luồng tải/hiển thị tác phẩm với API mô phỏng. Các migration đã được thử trên PostgreSQL cô lập. Việc lưu ảnh thật trên web được nghiệm thu sau khi áp dụng schema và triển khai bản mới.
