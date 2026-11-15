# Báo cáo công việc Sprint 6 — 15/11/2026

## Phạm vi

Hoàn thiện các hạng mục có thể triển khai trực tiếp trong repository từ checklist S6-13, S6-14 và S6-15. Báo cáo này ghi nhận thay đổi mã nguồn, không thay thế nghiệm thu tích hợp và không tự đánh dấu các tiêu chí DoD là đạt.

## Công việc đã thực hiện

### S6-13 — Studio vẽ

- Thêm route `/studio` cho cả khách và người dùng đã đăng nhập.
- Dùng Canvas và Pointer Events để vẽ bằng chuột hoặc cảm ứng; tọa độ được quy đổi theo kích thước hiển thị của canvas.
- Bổ sung bút, tẩy, chọn màu, điều chỉnh cỡ nét, hoàn tác/làm lại với lịch sử giới hạn 30 trạng thái.
- Thêm xóa tranh có xác nhận và tải tác phẩm thành PNG.
- Cảnh báo/chặn điều hướng nội bộ và Back/Forward bằng React Router khi tranh chưa xuất; giữ `beforeunload` cho tải lại/đóng tab/rời website.
- Theo dõi snapshot hiện tại so với snapshot đã xuất để undo/redo, xóa và vẽ mới cập nhật đúng cảnh báo; quay lại đúng snapshot đã xuất sẽ không cảnh báo thừa.
- Nối nút Studio trên dashboard tới trang mới.

### S6-14 — Trang Khách

- Bổ sung CTA đăng ký và khám phá catalog khóa học.
- Thêm liên kết tới Studio và trang cộng đồng demo.
- Giữ catalog tại route hiện có `/courses`; không thêm API hoặc dữ liệu khóa học giả.

### S6-15 — Cộng đồng demo

- Thêm trang feed `/community` và trang chi tiết `/community/:postId` với nội dung mẫu được gắn nhãn.
- Thêm tương tác thích và bình luận chỉ lưu trong state của trang; tải lại sẽ đặt lại tương tác.
- Thêm sao chép liên kết bài viết, xử lý nội dung bình luận trống và trạng thái bài viết không tồn tại.
- Hiển thị cảnh báo “DEMO — DỮ LIỆU MẪU, TƯƠNG TÁC KHÔNG ĐƯỢC LƯU” và nhắc không nhập thông tin nhạy cảm.
- Không thêm API ghi, database, thông báo hoặc chia sẻ ra dịch vụ bên ngoài. Hình minh họa là khối màu CSS, không dùng ảnh bài nộp hay asset bên ngoài.

### Điều hướng và tài liệu

- Cập nhật điều hướng công khai để mở Studio và Cộng đồng.
- Ẩn liên kết đăng nhập trong header khi phiên còn đang được xác định; khi đã đăng nhập, header tiếp tục dẫn tới tài khoản.
- Cập nhật bài test điều hướng theo các route mới.
- Cập nhật [checklist tiến độ](CHECKLIST_TIENDO_2026-11-15.md) để mô tả phần mã đã có và các kiểm tra còn thiếu. Tiêu chí cần nghiệm thu thực tế vẫn để `[ ]`.

## Kiểm tra đã chạy

- `npm test` — đạt, 80/80 test.
- `npm run build` — đạt.
- `npm run lint` — đạt.
- `git diff --check` — đạt.
- Playwright với Google Chrome cục bộ — thử vẽ bằng chuột, điều hướng nội bộ và Back khi tranh chưa xuất, xuất rồi undo và điều hướng lại; hộp thoại xuất hiện và hủy điều hướng giữ người dùng ở Studio.

Build có cảnh báo bundle JavaScript vượt 500 kB và cảnh báo chú thích pure trong dependency Zod; build vẫn hoàn thành.

## Chưa thực hiện / chưa có bằng chứng

- Chưa kiểm tra Studio trên thiết bị thật, gồm cảm ứng, resize, đổi hướng, bàn phím và hộp thoại trước khi tải lại/đóng tab. Thao tác chuột, xuất PNG, undo sau xuất và điều hướng nội bộ/Back đã được thử tự động trên Google Chrome desktop.
- Chưa xác minh tương tác cộng đồng không tạo request ghi bằng Network inspector.
- Chưa nghiệm thu responsive 360px, luồng đăng nhập/đăng xuất, dữ liệu catalog công khai hoặc tình huống API lỗi.
- Chưa kiểm tra SHA đang deploy, Supabase/Storage, SQL/migration hoặc dữ liệu production.
- Vì vậy, các mục S6-13–S6-15 cần bằng chứng môi trường thực tế tiếp tục chưa được tick.

## Điểm cần lưu ý

Cảnh báo rời Studio dựa trên sự kiện `beforeunload`; nội dung hộp thoại do trình duyệt quyết định. Tranh không được lưu tự động và không thể khôi phục sau khi đóng tab nếu người dùng chưa tải PNG.
