# Sửa quyền đọc dashboard học viên — 12/11/2026

## Nguyên nhân

Student demo đã ghi danh vào khóa 4 nhưng dashboard gọi trực tiếp Supabase Data API và bị chặn. `authenticated` thiếu SELECT trên `ghi_danh`/`tien_do_bai_hoc`; các bảng khóa/chương/bài học mới có policy đọc của admin. Profile giáo viên cũng chưa đọc được trong quan hệ học viên đã ghi danh.

## Thay đổi đã áp dụng

Migration Supabase: `20261112072259_fix_student_dashboard_read_access`.

- Cấp SELECT cho authenticated trên ghi danh và tiến độ, kèm policy chỉ đọc hàng có `ma_nguoi_dung = auth.uid()`.
- Học viên đọc khóa `DA_DANG` khi có ghi danh `DANG_HOC` hoặc `HOAN_THANH` của chính mình.
- Đọc chương/bài học dựa trên quan hệ với khóa được phép đọc.
- Đọc profile giáo viên của khóa đã ghi danh để hiển thị tên trên dashboard.
- Không tắt RLS, không cấp quyền ghi, không thay đổi role hoặc nội dung khóa học.
- Giữ nguyên các policy admin và profile cá nhân đã có.

## Kết quả kiểm tra thực tế

Dùng Supabase Auth thật với student demo, Data API và Playwright trên `https://linea-nhom3.vercel.app/dashboard`:

- Đọc được 1 ghi danh vào khóa 4, 2 chương, 4 bài học, 4 dòng tiến độ và tên Teacher Demo.
- Dashboard hiển thị `[DEMO] Khóa học Digital Art mẫu cho giáo viên`; không có JavaScript page error.
- Query ghi danh/tiến độ của tài khoản khác trả 0 dòng.
- Query khóa `NHAP` hoặc profile role admin trả 0 dòng.
- Anonymous không được đọc ghi danh.
- Đã đăng xuất phiên kiểm thử.

Ảnh minh chứng local: `D:\QLDA\dashboard_student_demo_20261112.png`.

Supabase security advisor đã chạy. Các cảnh báo sẵn có về hàm SECURITY DEFINER, bảng ngoài phạm vi chưa có policy và cấu hình Auth không được thay đổi trong bản sửa dashboard này.

Trang `/my-courses` của học viên vẫn có danh sách mẫu rỗng trong frontend hiện tại. Bản sửa này dành cho dashboard; không xác nhận đã hoàn thiện trang danh sách hay trải nghiệm học bài.
