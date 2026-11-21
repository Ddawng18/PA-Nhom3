# LINEA — Bàn giao cập nhật roadmap ngày 21/11/2026

Bản cập nhật dựa trên `develop` tại `3e88b96` (PR #26). Nhánh `codex/linea-role-ui-uat` gửi các thay đổi dưới đây để review.

| Phạm vi roadmap | Kết quả |
|---|---|
| Phase 1, phân quyền UI | Học viên, giáo viên và admin có trang tổng quan riêng tại `/dashboard`, `/teacher`, `/admin`. Khi mở nhầm URL, ứng dụng chuyển về dashboard của vai trò hiện tại. |
| Phase 2, giao diện | Đồng bộ nền kem, gradient xanh rêu và các khối số liệu. Trang đăng nhập và dashboard học viên dùng nét dựng hình bằng CSS. Menu của người đã đăng nhập trượt trái trên màn hình nhỏ. |
| Phase 3, Cài đặt | Giữ hồ sơ, bảo mật và lối vào đơn hàng cho vai trò phù hợp. Bỏ mục tiêu, tiến độ mẫu và tùy chọn thông báo chỉ tồn tại trong giao diện. |
| Phase 5, Giáo viên | Bộ đếm khóa học và nút tạo khóa nằm chung thanh. Form cho nhập học phí VNĐ khi tạo hoặc sửa bản nháp, 0 đồng là miễn phí. |
| Phase 7, chạy local | Thêm [CHAY_LOCAL.md](../CHAY_LOCAL.md) với hai terminal, cấu hình môi trường và đường dẫn health check. |

## Bằng chứng QA

- Luồng ghi danh miễn phí, mở bài, lưu tiến độ, nộp PNG, chấm 8,5/10, xem điểm và lịch sử chấm đã đạt qua API QA. Nộp lại sau khi chấm trả 409. Khóa thử đã được ẩn.
- Ba tài khoản demo đã đăng nhập và mở được các màn hình đọc theo vai trò trên bản production đang chạy. Kiểm tra đó không xác nhận các thay đổi giao diện mới đã được deploy.
- Bộ kiểm thử ZaloPay đạt 28/28 kiểm tra giao thức. API local báo `ZALOPAY_SANDBOX` và `payment.ready=true`. Người dùng đã mở được checkout, nhưng ví bị kẹt ở bước sinh trắc học. Chưa có bằng chứng đơn thanh toán thành công hoặc quyền học được cấp từ giao dịch ZaloPay.

## Còn nghiệm thu

- Chạy toàn bộ luồng học qua giao diện, duyệt hồ sơ giáo viên và kiểm tra quyền sở hữu với hai giáo viên.
- Thử thanh toán bằng ví sandbox hoặc thẻ kiểm thử được cổng hỗ trợ. Kiểm tra đơn thành công và quyền học sau xác nhận từ ZaloPay.
- Thử Google login, nhận email đặt lại mật khẩu, Studio trên thiết bị thật và WCAG thủ công.
- Sau khi merge và deploy, xác minh commit đang chạy, chạy lại smoke và diễn tập rollback trên staging. Đồng bộ lịch sử migration QA trước lần `db push` tiếp theo.

Chi tiết tiêu chí và trạng thái lịch sử nằm trong [DEVELOPMENT-ROADMAP.md](DEVELOPMENT-ROADMAP.md).
