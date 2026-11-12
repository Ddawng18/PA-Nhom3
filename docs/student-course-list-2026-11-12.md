# Danh sách khóa học học viên — 12/11/2026

## Sửa lỗi

Trang `/my-courses` trước đây khai báo `enrolledCourses = []`, nên luôn hiển thị 0 khóa dù dashboard và database đã có ghi danh.

- Thay dữ liệu rỗng bằng hook `useStudentCourses`, đọc ghi danh của người đăng nhập qua Supabase Data API và tải đúng các khóa liên quan.
- Bỏ ghi danh đã hủy; giữ thứ tự ghi danh mới nhất; dùng `DANG_HOC`/`HOAN_THANH` cho các tab và bộ đếm.
- Chuẩn hóa ID bigint/số/chuỗi và kiểm tra định dạng response.
- Có trạng thái đang tải, lỗi/thử lại; lỗi truy vấn không bị diễn giải thành chưa đăng ký khóa nào.
- Nếu khóa bị ẩn bởi quyền đọc, vẫn giữ một mục ghi danh với thông báo khóa tạm không hiển thị, không làm mất ghi danh khỏi bộ đếm.
- Khóa hiện có liên kết “Xem tiến độ” về dashboard; không tạo đường dẫn học bài chưa triển khai.
- Giữ nguyên phần teacher và các policy Supabase; không đổi dữ liệu, role hoặc ghi danh trong lần sửa frontend này.

## Kiểm thử

- Vitest: **66/66**, 10 file; 6 ca mới cho mapping trạng thái/ID, khóa bị ẩn, dữ liệu sai định dạng, lọc đúng tài khoản và khóa đã ghi danh, danh sách rỗng và quyền đọc bị từ chối.
- Frontend build và ESLint thành công.
- Playwright chạy mã frontend local với **Supabase Auth và dữ liệu thật của student demo**: thấy khóa 4; tabs Tất cả (1), Đang học (1), Hoàn thành (0) đúng; mobile không tràn ngang.
- Chặn tạm request ghi danh trong browser test để mô phỏng 503: có thông báo lỗi, không hiện trạng thái chưa có khóa; thử lại tải được khóa thật. Không thay đổi cấu hình API hoặc dữ liệu server khi mô phỏng.
- Đã đăng xuất phiên kiểm thử.

File test browser: `tests/student-courses.browser.mjs`. Cần biến môi trường `LINEA_TEST_EMAIL`, `LINEA_TEST_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`; chạy `npm.cmd run test:student-courses`. Không lưu mật khẩu trong file test.

Ảnh local: `test-results/student-courses/desktop.png` và `mobile.png` (gitignored).

## Triển khai

Đây là thay đổi frontend nên cần build/deploy Vercel từ commit mới. Nếu project Vercel nối với fork `loiz123/PA-Nhom3`, đồng bộ nhánh `develop` từ repo nhóm về fork trước. Chưa deploy trong tác vụ này theo lựa chọn deploy thủ công của người dùng.
