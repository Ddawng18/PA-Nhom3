# Cấu hình Supabase Auth cho LINEA

## 1. Tạo project Supabase

1. Tạo project tại [supabase.com](https://supabase.com/) và chọn vùng phù hợp.
2. Trong **Project Settings → API**, lấy **Project URL** và khóa public **anon** (có thể được ghi là `publishable` trong dashboard mới).
3. Tạo file `.env` ở thư mục gốc từ `.env.example`, sau đó điền:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public-anon-key>
   ```

   Chỉ dùng anon/publishable key trong ứng dụng trình duyệt. **Không dùng `service_role` key** vì key đó có quyền quản trị và sẽ bị lộ khi đóng gói frontend. `.env` đã được Git ignore.

## 2. Bật đăng nhập Google

1. Trên Google Cloud Console, tạo OAuth Client ID loại **Web application**.
2. Trong **Authorized redirect URIs**, thêm URI callback của Supabase:

   ```text
   https://<project-ref>.supabase.co/auth/v1/callback
   ```

3. Sao chép Google Client ID và Client Secret vào **Supabase → Authentication → Sign In / Providers → Google**, bật provider và lưu.
4. Trong **Supabase → Authentication → URL Configuration**, đặt **Site URL** là URL frontend production (ví dụ `https://<your-app>.vercel.app`).
5. Thêm Redirect URLs tương ứng với các môi trường, bao gồm:

   ```text
   http://localhost:5173/auth/callback
   http://localhost:5173/reset-password
   https://<your-app>.vercel.app/auth/callback
   https://<your-app>.vercel.app/reset-password
   ```

   Thay domain Vercel mẫu bằng domain thực tế; nếu sử dụng preview deployments, chỉ thêm URL/pattern preview mà dự án thật sự cần.

## 3. Cấu hình Vercel

Trong **Project → Settings → Environment Variables**, thêm `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` cho các môi trường cần triển khai, rồi deploy lại để Vite nhận giá trị mới. Không thêm `service_role` vào Vercel frontend.

## 4. Tạo bảng hồ sơ

Chạy nội dung [`../supabase/schema.sql`](../supabase/schema.sql) trong **Supabase SQL Editor**. Schema bật RLS, cho người dùng chỉ đọc/cập nhật hồ sơ của mình và giới hạn quyền cập nhật client vào `display_name`, `avatar_url`; `role` chỉ được thiết lập bởi hệ thống.

Sau khi cấu hình, kiểm tra đăng ký email, xác nhận email, Google OAuth, đăng nhập, quên mật khẩu và đăng xuất trên cả localhost và domain production.

## 5. Trạng thái project hiện tại và kiểm tra nhanh

Các lệnh dưới đây chỉ dùng khóa public (publishable/anon), không dùng
`service_role`:

```powershell
$base = "https://pscjbvjcprvzfkawflql.supabase.co"
$key  = "<VITE_SUPABASE_ANON_KEY>"
$headers = @{ apikey = $key }

# Email/password provider: trả invalid_credentials với tài khoản sai,
# nghĩa là endpoint đăng nhập Supabase hoạt động.
Invoke-RestMethod -Method Post "$base/auth/v1/token?grant_type=password" `
  -Headers $headers -ContentType "application/json" `
  -Body '{"email":"nonexistent@example.com","password":"WrongPass123!"}'

# Google provider: nếu chưa bật sẽ trả
# "Unsupported provider: provider is not enabled".
Invoke-RestMethod "$base/auth/v1/authorize?provider=google&redirect_to=http%3A%2F%2Flocalhost%3A5173%2Fauth%2Fcallback" `
  -Headers $headers
```

Trạng thái đã kiểm tra:

- Email/password: **bật**, endpoint trả `invalid_credentials` với mật khẩu sai.
- Google: **chưa bật** (`external.google = false`). Cần làm mục 2 ở trên
  (Google Cloud OAuth Client + bật provider trong Supabase) thì nút
  "Tiếp tục với Google" mới chuyển hướng được.
- `mailer_autoconfirm = false`: sau khi đăng ký, người dùng phải mở email xác
  nhận trước khi đăng nhập.
- **Site URL** đang trống: cần đặt `http://localhost:5173` (và domain production)
  trong **Authentication → URL Configuration**, đồng thời thêm
  `http://localhost:5173/auth/callback` vào **Redirect URLs**. Nếu thiếu, OAuth
  Google sẽ báo lỗi redirect.
- Frontend kiểm tra `/auth/v1/settings` trước khi gọi Google; nếu provider chưa
  bật, giao diện hiển thị thông báo tiếng Việt thay vì chuyển hướng lỗi.
