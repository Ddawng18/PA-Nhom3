# Cấu hình Supabase Auth cho LINEA

## 1. Tạo project Supabase

1. Tạo project tại [supabase.com](https://supabase.com/) và chọn vùng phù hợp.
2. Trong **Project Settings → API**, lấy **Project URL** và khóa public **anon** (có thể được ghi là `publishable` trong dashboard mới).
3. Tạo file `.env.local` ở thư mục gốc từ `.env.example`, sau đó điền:

   ```dotenv
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<public-anon-key>
   ```

   Chỉ dùng anon/publishable key trong ứng dụng trình duyệt. **Không dùng `service_role` key** vì key đó có quyền quản trị và sẽ bị lộ khi đóng gói frontend. `.env.local` đã được Git ignore.

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
