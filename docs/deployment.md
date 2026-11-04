# Triển khai miễn phí

**Trạng thái hiện tại:** dự án chưa được triển khai, nên chưa có URL thử. Kế hoạch
dưới đây dùng các gói miễn phí và có thể thực hiện lại khi cần.

## Kiến trúc

| Thành phần | Dịch vụ miễn phí | Ghi chú |
| --- | --- | --- |
| Frontend (Vite/React) | Vercel Hobby | Build tĩnh, SPA rewrite bằng `vercel.json` |
| Backend (ASP.NET Core) | Render Free Web Service | Có thể ngủ khi không dùng; dùng Supabase Postgres, không dùng SQLite |
| Database/Auth | Supabase Free | Postgres + Supabase Auth cho frontend |

Phương án thay thế cho backend: Fly.io free allowance hoặc Azure App Service F1.
Không dùng SQLite trên hosting vì filesystem thường tạm thời.

## 1. Frontend trên Vercel

1. Import repository vào Vercel, chọn framework **Vite**.
2. Build command: `npm run build`; Output directory: `dist`.
3. Thêm Environment Variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY` (khóa public, lấy từ Supabase → Settings → API Keys)

   Không đặt `SUPABASE_DB_URL`, `JWT_KEY`, `SEED_ADMIN_PASSWORD` hoặc `service_role`
   trong Vercel.
4. `vercel.json` ở thư mục gốc đã cấu hình rewrite SPA để các route như `/login`,
   `/settings` không bị 404 khi refresh.
5. Trong Supabase → Authentication → URL Configuration, đặt **Site URL** là domain
   Vercel và thêm Redirect URLs:
   - `https://<app>.vercel.app/auth/callback`
   - `https://<app>.vercel.app/reset-password`

   Nếu dùng Google, thêm domain Vercel vào redirect URI của Google/Supabase.

## 2. Backend trên Render

1. Tạo **Web Service**, chọn repository.
2. Root Directory: `server`; Runtime: .NET 9 (nếu chưa có, dùng Docker image
   `mcr.microsoft.com/dotnet/aspnet:9.0`).
3. Build command:
   ```text
   dotnet publish Linea.Api/Linea.Api.csproj -c Release -o out
   ```
4. Start command:
   ```text
   dotnet out/Linea.Api.dll --urls http://0.0.0.0:$PORT
   ```
5. Environment Variables:
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `RUN_MIGRATIONS=true` (lần deploy đầu để tạo bảng; sau đó có thể để `false`)
   - `JWT_KEY` (chuỗi ngẫu nhiên >= 32 byte, tạo bằng CSPRNG)
   - `SUPABASE_DB_URL` (connection string Postgres, lấy qua password manager)
   - `CLIENT_ORIGIN=https://<app>.vercel.app`
   - `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (chỉ lần đầu, sau đó xóa mật khẩu)

6. Health check: `/api/health`.
7. Render Free có thể ngủ sau một thời gian không hoạt động; request đầu tiên sẽ
   chậm hơn. Không dựa vào filesystem của Render để lưu dữ liệu.

Nếu Render chưa hỗ trợ .NET 9, dùng Docker image
`mcr.microsoft.com/dotnet/aspnet:9.0`, copy thư mục publish vào image và chạy
`dotnet Linea.Api.dll --urls http://0.0.0.0:$PORT`.

## 3. Supabase

- Dùng project Free; lấy `SUPABASE_DB_URL` tại **Settings → Infrastructure → Database**
  (direct connection hoặc session pooler nếu mạng không hỗ trợ IPv6).
- Backend tự tạo bảng `users` bằng migration; migration bật RLS và thu hồi quyền
  `anon`/`authenticated`.
- Frontend dùng `VITE_SUPABASE_URL` + anon/publishable key và `supabase/schema.sql`.
- Bảng `users` của backend tách biệt với `profiles`/`auth.users` của frontend.

## 4. Kiểm tra sau khi deploy

```powershell
Invoke-RestMethod https://<backend>.onrender.com/api/health
# {"status":"ok","database":"connected"}

# Đăng ký/đăng nhập thử
Invoke-RestMethod -Method Post https://<backend>.onrender.com/api/auth/register `
  -ContentType "application/json" `
  -Body '{"email":"deploy-test@example.com","displayName":"Deploy Test","password":"MatKhau123!"}'
```

Sau khi đăng nhập, kiểm tra `/api/auth/me`, RBAC và đăng xuất. Không dùng tài khoản
test trên production lâu dài.

## 5. Bảo mật khi triển khai

- Secret chỉ đặt trong dashboard của Render/Supabase, không commit và không đưa vào
  Vercel frontend.
- `VITE_SUPABASE_ANON_KEY` là public; `SUPABASE_DB_URL`, `JWT_KEY`, `SEED_ADMIN_PASSWORD`
  và `service_role` là secret.
- Xóa `SEED_ADMIN_PASSWORD` khỏi Render sau lần seed đầu.
- Nếu secret bị lộ: đổi DB password/JWT key/admin password, cập nhật dashboard và
  xóa khỏi lịch sử Git nếu đã push.
- Ghi URL thử vào đây sau khi deploy (hiện chưa có):
  - Frontend: _chưa triển khai_
  - Backend: _chưa triển khai_
