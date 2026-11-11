# Thiết lập môi trường phát triển

Tài liệu dành cho thành viên mới clone repository và cần chạy frontend/backend mà
không làm lộ thông tin truy cập.

## 1. Yêu cầu

- Node.js 20+ và npm.
- .NET SDK 9.
- Git.
- Tài khoản Supabase (hoặc dùng project chung do nhóm quản lý).

## 2. Lấy code và cài dependency

```powershell
git clone https://github.com/Ddawng18/PA-Nhom3.git
cd PA-Nhom3
npm install
```

## 3. Tạo file `.env` an toàn

`.env` chứa secret, **không được commit**. Chỉ commit `.env.example` với placeholder.

```powershell
if (-not (Test-Path .env)) { Copy-Item .env.example .env }

# Sinh JWT_KEY riêng cho máy của bạn bằng CSPRNG (>= 32 byte)
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$key = [Convert]::ToBase64String($bytes)
$lines = Get-Content .env | ForEach-Object {
    if ($_ -match '^JWT_KEY=') { "JWT_KEY=$key" } else { $_ }
}
[IO.File]::WriteAllLines((Resolve-Path .env), $lines, (New-Object Text.UTF8Encoding($false)))

# Kiểm tra .env đã bị Git bỏ qua
git check-ignore -v .env
git ls-files .env   # phải rỗng
```

`VITE_SUPABASE_URL` có sẵn trong `.env.example`. Điền `VITE_SUPABASE_ANON_KEY` (khóa
public) từ **Supabase → Settings → API Keys** hoặc password manager của nhóm.
Không đưa `service_role` vào frontend.

Để dùng các chức năng quản trị cần API backend, đặt `VITE_API_URL` thành
`http://localhost:4174` khi phát triển cục bộ hoặc URL HTTPS của backend khi triển
khai. Để trống biến này thì chức năng duyệt sẽ báo máy chủ chưa được cấu hình.

## 4. Chọn CSDL cho backend

### Cách mặc định (khuyến nghị cho thành viên mới)

Để trống `SUPABASE_DB_URL`:

```dotenv
SUPABASE_DB_URL=
```

Backend dùng SQLite cục bộ `server/Linea.Api/linea-dev.db`. Cách này không cần
chia sẻ mật khẩu database, phù hợp để chạy thử và làm bài.

### Dùng Supabase Postgres

Chỉ khi cần kiểm tra trên CSDL chung:

1. Nhận `SUPABASE_DB_URL` từ **password manager của nhóm** (1Password/Bitwarden/…)
   hoặc từ người quản lý project. Không nhận qua Git, chat, issue, PR.
2. Điền vào `.env`:

   ```dotenv
   SUPABASE_DB_URL=postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres
   ```

   Có thể dùng **Session pooler** trong **Supabase → Settings → Infrastructure →
   Database** nếu mạng không hỗ trợ IPv6.
3. Chạy backend ở môi trường Development; migration sẽ tạo bảng `users`, bật RLS
   và thu hồi quyền `anon`/`authenticated`.
4. Không chạy test phá hoại trên CSDL chung. Harness luôn dùng SQLite, không đụng
   Supabase.

Nếu muốn CSDL riêng, tạo project Supabase cá nhân, chạy `supabase/schema.sql`
(từ thư mục gốc repository) cho frontend, rồi dùng connection string của project
đó cho backend.

## 5. Chạy dự án

Terminal 1 — frontend:

```powershell
npm run dev
```

Terminal 2 — backend:

```powershell
dotnet run --project server/Linea.Api
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4174`
- Health check: `http://localhost:4174/api/health`

Đăng nhập frontend qua Supabase Auth (email/password). Google cần bật provider
trong Supabase Dashboard; xem [supabase-setup.md](supabase-setup.md).

Admin backend đầu tiên (chỉ khi cần):

```dotenv
SEED_ADMIN_EMAIL=admin@linea.local
SEED_ADMIN_PASSWORD=<mật-khẩu-riêng>
```

Chạy backend một lần để seed, sau đó xóa `SEED_ADMIN_PASSWORD` khỏi `.env`.
Không dùng chung mật khẩu admin qua chat. Nếu dùng CSDL Supabase chung, **không tự
đặt `SEED_ADMIN_*`**; dùng tài khoản admin do nhóm quản lý.

## 6. Kiểm thử

```powershell
npm run test
npm run lint
npm run build
dotnet run --project server/Linea.Api.Tests
```

Backend test chạy với SQLite tạm, không ghi vào Supabase. Kỳ vọng: `20/20 PASS`.

## 7. Quy tắc bảo mật

- Không commit `.env`, `*.db`, `server/.nuget-local`, `bin/`, `obj/`.
- Không dùng `git add -f .env`.
- Không commit `SUPABASE_DB_URL`, `JWT_KEY`, `SEED_ADMIN_PASSWORD` hoặc `service_role`.
- Chia sẻ secret qua password manager; không gửi qua chat/issue/PR.
- Mỗi người dùng `JWT_KEY` riêng; không dùng lại khóa production.
- Nếu secret bị lộ: đổi ngay (Supabase DB password, JWT key, admin password), cập
  nhật `.env`, và nếu đã push thì xóa khỏi lịch sử Git.
- Khóa `VITE_SUPABASE_ANON_KEY`/publishable là public; DB URL và mật khẩu DB thì không.
- `SUPABASE_DB_URL` không được đặt tiền tố `VITE_`; Vite chỉ expose biến `VITE_*`
  cho bundle frontend.

## 8. Checklist trước khi code

- [ ] `git ls-files .env` rỗng.
- [ ] `git diff --cached --name-only | Select-String '(^|/)\.env$'` rỗng.
- [ ] `git check-ignore -v .env` khớp `.gitignore`.
- [ ] `JWT_KEY` đã đặt và dài tối thiểu 32 byte.
- [ ] `dotnet run --project server/Linea.Api` chạy, `/api/health` trả `ok`.
- [ ] `npm run dev` chạy, đăng nhập Supabase hoạt động.
- [ ] `npm run test` và backend harness cùng pass.
- [ ] `git diff --cached` không chứa secret.

## 9. Lỗi thường gặp

- **`JWT_KEY is missing`**: tạo lại theo bước 3.
- **Không kết nối được Supabase Postgres**: thử Session pooler trong
  **Settings → Infrastructure**; kiểm tra mật khẩu còn đúng sau khi reset.
- **Google báo provider chưa bật**: bật provider Google trong Supabase Dashboard
  (frontend), không liên quan backend.
- **Cổng 4174/5173 đang bận**: tắt process cũ hoặc đổi cổng.
