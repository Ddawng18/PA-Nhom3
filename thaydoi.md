# LINEA — thay đổi và việc còn lại của Sprint 4

Cập nhật: 04/11/2026. Đây là kết quả kiểm tra và thay đổi trong workspace, không tự động xác nhận task Trello đã hoàn thành.

## Đã thực hiện

- Gộp nhánh `Back-End` vào `Thinh-dev` và push đến commit `6707ccf`; frontend đã triển khai tại https://linea-nhom3.vercel.app. Đã kiểm tra `/login` trả HTTP 200. API ASP.NET chưa được triển khai.
- Supabase có 13 bảng nghiệp vụ mới và bảng `nguoi_dung` đổi tên từ `profiles`: tổng cộng 14 bảng tương ứng tên ERD theo quy ước chữ thường có dấu gạch dưới. Dữ liệu cũ, 8 khóa ngoại đến bảng người dùng và chính sách RLS được giữ lại. Đã kiểm thử trigger tạo hồ sơ trong giao dịch hoàn tác. Migration đổi tên đã áp dụng trên Supabase và lưu tại `supabase/20261104122006_rename_profiles_to_nguoi_dung.sql`.
- Backend kiểm tra vai trò hiện tại của tài khoản với vai trò trong JWT mỗi lần xác thực. Token có vai trò khác CSDL bị từ chối; cần đăng nhập lại. Nếu vai trò được đổi trở lại giá trị cũ, kiểm tra này không thu hồi vĩnh viễn token cũ.
- API quản trị từ chối vai trò không hợp lệ hoặc nhập bằng số; kiểm thử bổ sung cả khi nâng và hạ quyền.
- Frontend thoát trạng thái chờ nếu việc khôi phục phiên Supabase phát sinh lỗi.
- Nhóm chọn Supabase Auth làm nguồn xác thực. Đã thêm `GET /api/account/me`: API gửi bearer token tới Supabase Auth để xác minh, sau đó đọc `nguoi_dung` bằng token của người dùng và RLS; vai trò lấy từ CSDL, không lấy từ metadata do người dùng sửa. Trang hồ sơ gọi API và hiển thị vai trò khi `VITE_API_URL` được cấu hình.
- Backend mặc định dùng Supabase Auth cho các route có phân quyền student/teacher/admin. Các thao tác quản trị `users` cũ trả 501 vì vẫn trỏ vào bảng tài khoản JWT riêng; các endpoint đăng ký/đăng nhập cũ trả 410 và frontend dùng Supabase Auth. Chế độ JWT cũ chỉ bật trong Development với `AUTH_MODE=legacy`. Đã chuẩn bị `server/Dockerfile` cho hosting .NET, chưa kiểm thử image vì máy không có Docker.

## Kết quả kiểm thử tại máy

- `npm.cmd test`: 13/13 test đạt.
- `npm.cmd run lint`: đạt.
- `npm.cmd run build`: thành công; JavaScript sau build khoảng 605 KB, Vite cảnh báo kích thước chunk.
- `dotnet run --project server/Linea.Api.Tests/Linea.Api.Tests.csproj`: 24/24 test đạt với SQLite tạm; kiểm tra Supabase và quyền dùng HTTP giả lập, chưa dùng tài khoản thật. Máy chỉ có runtime .NET 10, đã chạy dự án .NET 9 bằng `DOTNET_ROLL_FORWARD=Major`; chưa kiểm thử với runtime .NET 9.
- Chưa kiểm thử đăng ký, xác nhận email, đăng nhập và phân quyền đầu cuối trên website thật; không xem test SQLite là bằng chứng cho Supabase thật.

## Cần hoàn tất / xác nhận

1. **Hoàn tất tích hợp:** endpoint `/api/account/me` và phân quyền student/teacher dùng Supabase Auth. Chức năng admin quản lý tài khoản Supabase chưa triển khai; API bài tập/khóa học hiện trả dữ liệu mẫu. Chưa triển khai API hay cấu hình `VITE_API_URL` trên Vercel; cần kiểm thử đầu cuối bằng tài khoản thật.
2. **QA và review:** kiểm tra đăng ký hợp lệ, email trùng, dữ liệu sai, đăng nhập đúng/sai, quyền của từng vai trò và tài khoản khóa; ghi kết quả và minh chứng. Cần người khác tác giả review code. Trello: https://trello.com/c/r2o0Ve8w, https://trello.com/c/lr6LabAE, https://trello.com/c/dxwrVxop.
3. **Schema:** `nguoi_dung` còn các cột `id`, `display_name`, `avatar_url`, `role`; chưa đầy đủ/đúng tên cột theo Data Dictionary. 13 bảng mới bật RLS và chưa cho client truy cập: cần chính sách theo chức năng trước khi ứng dụng dùng trực tiếp. `users` và `__EFMigrationsHistory` là hai bảng backend riêng.
4. **Vercel:** dự án chưa kết nối được repository GitHub; cần cấp quyền repository cho Vercel và kết nối để tự deploy khi push. Cần cấu hình và triển khai API riêng nếu nhóm chọn dùng backend ASP.NET.
5. **Quản lý Sprint:** nhóm xác nhận các thẻ phân tích đang In Progress/In Review, cập nhật kết quả thực tế, link minh chứng, issue, báo cáo Sprint và đối chiếu ProjectLibre/Gantt. Trạng thái Trello tại thời điểm kiểm tra: 3/18 task WBS Done, 15 chưa Done; hai thẻ QA và review theo dõi thêm.

Các thay đổi sau commit `6707ccf`, gồm migration đổi tên, sửa mã, test và file này, hiện chỉ có trong workspace và chưa được push hoặc deploy.
