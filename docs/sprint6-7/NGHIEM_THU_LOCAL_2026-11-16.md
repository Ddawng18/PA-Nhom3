# Nghiệm thu local sau PR #16 — 16/11/2026

- `develop` đã pull đến `b8f160f`; backend/frontend local còn các thay đổi chưa commit nên SHA không đại diện toàn bộ working tree.
- Backend local kết nối Supabase demo thật, Storage thật; frontend local chạy Vite. `CLIENT_ORIGIN=http://127.0.0.1:4176` được đặt riêng cho phiên chạy local. Không ghi token/key vào tài liệu.
- Dữ liệu tạo mới: khóa `TEST DEMO nghiem thu` ID 13, chương 34, bài học 39, bài tập 2 và bài nộp 1. Khóa đã được xuất bản; tài khoản student demo đã ghi danh và bài đã được chấm/sửa điểm. Đây là dữ liệu kiểm thử trong môi trường demo chung.

## Kết quả

### Studio và Community — cập nhật theo yêu cầu

- Người dùng đã thay đổi phạm vi S6-15: Community cần đăng bài lưu thật vào database; quyết định này thay thế giới hạn UI demo trước đó. Bài viết gồm tiêu đề và nội dung văn bản, ai cũng đọc được; đăng bài yêu cầu đăng nhập. Chưa có ảnh, sửa/xóa, thích hoặc bình luận.
- Bảng `community_posts` được tạo bằng migration `20261116100757_community_posts`; RLS bật, quyền Data API cho anon/authenticated bị thu hồi; API backend thực hiện đọc/ghi. Thử API: anonymous POST 401, student POST 200, anonymous đọc lại 200, tiêu đề trống 400. Thử browser trên địa chỉ LAN: đăng và tải lại thấy bài. Bài `TEST DEMO` được giữ trong database demo.
- Studio: 13 nhánh kiểm thử browser local PASS: vẽ/tẩy/màu, undo/redo, xóa, PNG, cảnh báo điều hướng, scale, touch giả lập và bàn phím. Thiết bị cảm ứng thật chưa được kiểm tra. File `evidence/acceptance-2026-11-15/studio-2026-11-16-network/results.json` có 5 BLOCKED được kịch bản tự thêm, trong đó 4 ca thuộc Khách/Community và không nằm trong lượt chỉ chọn Studio này.
- Frontend local tại `http://192.168.1.176:4176`, API tại cổng 5197; hai địa chỉ được kiểm tra trên chính máy chạy. Thiết bị khác cùng Wi-Fi còn phụ thuộc firewall/mạng. Các máy chủ chỉ còn hoạt động khi phiên chạy vẫn mở.

### Kiểm tra quyền bổ sung — 16/11

- Với bài nộp demo ID 1: anonymous nhận 401; học viên nộp bài và giáo viên sở hữu khóa nhận 200; học viên khác, giáo viên khác và admin không liên quan nhận 404. Giáo viên khác không xem được danh sách bài của khóa và không chấm được bài (404).
- Học viên chưa ghi danh không xem được bài học và không ghi được tiến độ (403); student/teacher không gọi được API quản trị (403). Các tài khoản học viên và giáo viên thử riêng đã được tạo, sau đó xóa qua Auth; không lưu mật khẩu/token.
- Khi ẩn khóa demo ID 13: endpoint học và bài học trả 404, nhưng ảnh bài nộp ban đầu vẫn trả 200 cho học viên (**FAIL**). Đã sửa API ảnh yêu cầu khóa được đăng và ghi danh hợp lệ đối với học viên; sau sửa ca ảnh trả 404 (**PASS**). Giáo viên sở hữu vẫn được xem ảnh; sau test khóa đã hiện lại.
- Khi khóa student demo: token cũ gọi API ảnh trả 401; đọc trực tiếp `ghi_danh` và `tien_do_bai_hoc` trả danh sách rỗng qua RLS. Sau test đã mở khóa lại.
- Student thử tự đổi role thành admin qua Data API nhận 403; đọc lại bằng API admin xác nhận role vẫn là student.
- Phạm vi: test HTTP local với database và Storage demo thật trên working tree chưa commit. Chưa kiểm tra hết quyền trên mọi endpoint, ảnh qua URL ký đã cấp trước khi khóa/ẩn, hoặc tải lại trên thiết bị thật. URL ký đã cấp có thể hoạt động đến khi hết hạn.

Cập nhật quản trị: browser local đăng nhập admin và tải được danh sách người dùng/khóa học. API khóa tài khoản student demo khiến token cũ nhận 401, mở khóa lại nhận 200; API ẩn khóa demo ID 15 khiến catalog 404, hiện lại trả 200. Đã khôi phục trạng thái ban đầu. Chưa kiểm thử mọi bộ lọc, conflict phiên bản hay thao tác trên thiết bị thật. Giao diện quản lý là phiên bản chức năng bổ sung theo hệ thống hiện có; Figma chỉ có khung duyệt giáo viên, chưa có khung riêng cho danh sách quản trị.

Cập nhật thanh toán demo: đã tạo khóa thử ID 14 (30.000đ) và ID 15 (18.000đ) trong môi trường demo. Với khóa 14, gửi đồng thời hai request cùng idempotency key tạo cùng một đơn; xác nhận đồng thời cùng kết quả đều HTTP 200. FAILED và CANCELLED không cấp quyền; SUCCEEDED cấp quyền; endpoint ghi danh trực tiếp trả 409. Kiểm tra trình duyệt bằng student trên khóa 15: mở checkout có nhãn DEMO, mô phỏng thất bại, thử lại thành công, chuyển trang học và xem lịch sử đơn đều đạt. Đây là dữ liệu thật trong môi trường demo, không thu tiền.

| Ca | Kết quả |
|---|---|
| Build backend | PASS |
| Vitest | PASS 86/86 |
| Frontend lint/build | PASS; build cảnh báo kích thước bundle |
| Catalog và chi tiết khóa 12 ở trình duyệt, dữ liệu API thật | PASS: hiển thị tên và giá; cần CORS đúng origin local |
| Auth ba tài khoản demo | PASS |
| Tạo khóa nháp, lưu editor có chương/bài/bài tập, gửi và duyệt | PASS qua HTTP |
| Ghi danh miễn phí và đánh dấu bài học | PASS qua HTTP sau migration RLS |
| Nộp ảnh vào Storage và học viên xem ảnh | PASS qua HTTP |
| Chấm điểm và học viên xem điểm | Ban đầu FAIL 409 do độ chính xác timestamp; sau sửa PASS |
| Sửa điểm và gửi lại version cũ | PASS: cập nhật HTTP 200; version cũ HTTP 409 |
| Gửi lại bài đã chấm | PASS: HTTP 409 |
| Anonymous xem ảnh | PASS: HTTP 401 |
| Trạng thái sau chấm | PASS: khóa ID 13 trả `HOAN_THANH` |

## Giới hạn

Chưa kiểm tra độc lập trạng thái hoàn thành ở thời điểm sau nộp nhưng trước chấm; chưa kiểm tra ảnh bằng tài khoản học viên hoặc giáo viên khác, thay ảnh đúng deadline, lỗi Storage/rollback, khóa/mở tài khoản và toàn bộ ca thanh toán (như lỗi giữa transaction và đơn của người khác). Đây là các ca còn thiếu, không đánh Done toàn Sprint. Bộ test backend đầy đủ yêu cầu PostgreSQL test riêng và không chạy trên database demo chung.

Xung đột `CoursesPage.tsx` khi pull được giải quyết theo giao diện catalog mới; component mới đã hiển thị giá từ API. Stash `codex-before-develop-ui-20261116` còn được giữ làm bản dự phòng.
