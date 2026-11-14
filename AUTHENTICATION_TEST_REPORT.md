# Authentication Test Report

## 1. Thông tin chung

- **Ngày kiểm thử:** 2026-11-05
- **Bộ kiểm thử:** `server/Linea.Api.Tests`
- **File thực thi:** `server/Linea.Api.Tests/Program.cs`
- **Lệnh chạy:**

  ```bash
  dotnet run --project server/Linea.Api.Tests/Linea.Api.Tests.csproj
  ```

## 2. Kết quả tổng quan

| Chỉ số | Kết quả |
|---|---:|
| Tổng số kiểm thử | 24 |
| Thành công | 24 |
| Thất bại | 0 |
| Tỷ lệ thành công | 100% |

**Kết luận:** Đạt. Toàn bộ kiểm thử xác thực và phân quyền đã hoàn thành thành công.

## 3. Chi tiết kiểm thử

| # | Nội dung kiểm thử | Kết quả |
|---:|---|---|
| 1 | Health check xác nhận cơ sở dữ liệu kết nối | PASS |
| 2 | Tài khoản admin khởi tạo đăng nhập thành công | PASS |
| 3 | Đăng ký kiểm tra dữ liệu, mã hóa mật khẩu và ẩn thông tin nhạy cảm | PASS |
| 4 | Đăng ký luôn gán vai trò student | PASS |
| 5 | Từ chối email đăng ký trùng lặp | PASS |
| 6 | Từ chối dữ liệu đăng ký không hợp lệ | PASS |
| 7 | Từ chối mật khẩu vượt quá 72 byte | PASS |
| 8 | Đăng nhập bằng mật khẩu đúng | PASS |
| 9 | Từ chối mật khẩu đăng nhập sai | PASS |
| 10 | Từ chối email không tồn tại | PASS |
| 11 | Từ chối truy cập endpoint bảo vệ khi thiếu token | PASS |
| 12 | Từ chối endpoint tài khoản Supabase khi thiếu token | PASS |
| 13 | Từ chối token không hợp lệ | PASS |
| 14 | Trả về hồ sơ hiện tại đã loại bỏ dữ liệu nhạy cảm | PASS |
| 15 | Từ chối student truy cập endpoint teacher và admin | PASS |
| 16 | Từ chối student thay đổi vai trò hoặc khóa tài khoản | PASS |
| 17 | Admin liệt kê tài khoản mà không làm lộ thông tin nhạy cảm | PASS |
| 18 | Admin từ chối vai trò không hợp lệ hoặc dạng số | PASS |
| 19 | Supabase sử dụng danh tính đã xác minh và hồ sơ tương ứng | PASS |
| 20 | Supabase áp dụng đúng vai trò trong hồ sơ | PASS |
| 21 | Vai trò teacher được áp dụng ngay sau khi đăng nhập lại | PASS |
| 22 | Admin truy cập được endpoint admin và teacher | PASS |
| 23 | Khóa tài khoản ngăn đăng nhập và vô hiệu hóa token hiện tại | PASS |
| 24 | Admin không thể tự khóa tài khoản của mình | PASS |

## 4. Kết quả đầu ra

```text
RESULT passed=24 failed=0
```
