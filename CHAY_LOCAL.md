# Chạy LINEA trên máy local

Hướng dẫn dùng PowerShell trên Windows. Cần Node.js 22.12+ và .NET SDK 9.

## 1. Chuẩn bị lần đầu

```powershell
Set-Location D:\QLDA\PA-Nhom3
npm.cmd ci
dotnet restore server/Linea.slnx

if (-not (Test-Path .env)) {
    Copy-Item .env.example .env
}
```

Nếu máy đã có `.env` đang chạy được, dùng lại tệp đó. Nếu vừa tạo, điền cấu hình môi trường được nhóm cấp. URL Supabase, publishable key và kết nối database phải thuộc cùng một project.

```dotenv
VITE_API_URL=http://localhost:4174
LOCAL_API_PROXY_TARGET=http://localhost:4174
CLIENT_ORIGIN=http://localhost:5173
RUN_MIGRATIONS=false
```

Để đăng nhập, cần `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` và `SUPABASE_DB_URL`. Nếu thử nộp ảnh, đặt thêm `SUPABASE_SERVICE_ROLE_KEY` cho backend và kiểm tra bucket riêng `assignment-submissions`. Dùng project QA khi thử các thao tác ghi dữ liệu. Giữ mật khẩu, kết nối database và key server trong cấu hình local, ngoài Git.

## 2. Bật hai terminal

Terminal 1 chạy backend:

```powershell
Set-Location D:\QLDA\PA-Nhom3
npm.cmd run dev:api
```

Terminal 2 chạy frontend:

```powershell
Set-Location D:\QLDA\PA-Nhom3
npm.cmd run dev -- --port 5173 --strictPort
```

Mở [trang đăng nhập](http://localhost:5173/login). Đăng nhập bằng tài khoản học viên thuộc project đã cấu hình rồi mở [dashboard Sổ học tập](http://localhost:5173/dashboard).

## 3. Kiểm tra nhanh

```powershell
Invoke-RestMethod http://localhost:4174/api/health
Invoke-RestMethod http://localhost:5173/api/health
```

Cả hai lệnh nên trả `status: ok`. Lệnh thứ hai kiểm tra frontend chuyển được yêu cầu sang backend. Nếu web mở được nhưng dữ liệu không tải, kiểm tra log terminal backend và các URL trong `.env`. Nếu cổng 5173 hoặc 4174 đang bận, kiểm tra tiến trình đang chạy trước khi bật thêm bản mới. Nhấn `Ctrl+C` trong mỗi terminal để dừng.

## 4. Đăng ký và cấu hình Brevo thủ công

LINEA dùng Supabase Auth để đăng ký bằng email và mật khẩu. Trong đúng project mà bản web đang kết nối, vào **Authentication → Sign In / Providers → Email**. Giữ đăng ký email bật, bật **Confirm email** và lưu. Người dùng đăng ký, mở liên kết trong email rồi mới vào được LINEA. Xem [cấu hình Supabase Auth](https://supabase.com/docs/guides/auth/general-configuration).

### Chuẩn bị Brevo

1. Trong Brevo, vào **Settings → Senders, Domains & Dedicated IPs**. Xác thực tên miền nhóm sở hữu theo các bản ghi DNS Brevo cung cấp, rồi thêm địa chỉ gửi trên tên miền đó.
2. Vào **Settings → SMTP & API → SMTP**. Sao chép **SMTP login** và tạo một **SMTP key** dành cho LINEA. Lưu key trong trình quản lý bí mật hoặc dashboard. Không dùng API key thay SMTP key. Xem [hướng dẫn Brevo SMTP](https://help.brevo.com/hc/en-us/articles/7924908994450-Send-transactional-emails-using-Brevo-SMTP).

### Email xác thực do Supabase gửi

1. Mở **Authentication → Emails → SMTP Settings** trong Supabase và bật **Custom SMTP**. Tham khảo [cấu hình SMTP của Supabase](https://supabase.com/docs/guides/auth/auth-smtp).
2. Điền **Sender email** bằng địa chỉ đã xác minh tại Brevo, **Sender name** bằng `LINEA`, **Host** bằng `smtp-relay.brevo.com`, **Port** bằng `587`, **Username** bằng SMTP login và **Password** bằng SMTP key. Lưu cấu hình.
3. Trong **Authentication → URL Configuration**, giữ **Site URL** là địa chỉ web chính. Thêm `http://localhost:5178/auth/callback` để xác nhận đăng ký và `http://localhost:5178/reset-password` để đổi mật khẩu. Thêm hai đường dẫn tương ứng của web online. Với template **Confirm signup**, giữ liên kết `{{ .ConfirmationURL }}`. Xem [cấu hình Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls).
4. Nếu Brevo bật theo dõi lượt bấm, tắt cho email xác thực để giữ nguyên liên kết Supabase. Thử đăng ký bằng hộp thư bạn quản lý và kiểm tra đăng nhập bị từ chối trước khi xác nhận. Mở liên kết trên cùng trình duyệt đã đăng ký. Sau đó thử riêng **Quên mật khẩu** để kiểm tra đường dẫn đổi mật khẩu. Có thể đối chiếu nhật ký gửi trong **Brevo → Transactional → Logs**.

### Email nghiệp vụ do API LINEA gửi

Supabase SMTP chỉ phục vụ Supabase Auth. Nếu cần gửi email thông báo xét duyệt hồ sơ hoặc email nghiệp vụ khác, đặt riêng các biến môi trường trên API .NET hoặc trong `.env` local:

```dotenv
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<brevo-smtp-login>
SMTP_PASSWORD=<brevo-smtp-key>
SMTP_FROM=<sender-da-xac-minh>
SMTP_ENABLE_SSL=true
EMAIL_OUTBOX_PATH=
```

Khởi động lại API sau khi sửa biến môi trường. `EMAIL_OUTBOX_PATH` có giá trị sẽ ghi email ra tệp thay cho SMTP. Nếu API chạy trên Render Free, cổng ra 587 bị chặn. Brevo hỗ trợ 2525, có thể đặt `SMTP_PORT=2525` và kiểm tra gửi từ môi trường đó. Xem [giới hạn Render Free](https://render.com/docs/free) và [cổng SMTP của Brevo](https://help.brevo.com/hc/en-us/articles/115000188150-Troubleshooting-Issues-with-Brevo-SMTP).
