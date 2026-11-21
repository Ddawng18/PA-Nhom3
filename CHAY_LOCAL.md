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
