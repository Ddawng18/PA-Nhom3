# LINEA API

Backend ASP.NET Core 9, Entity Framework Core và PostgreSQL/Supabase.
Chạy từ thư mục gốc repository:

```powershell
npm.cmd run dev:api
```

API: http://localhost:4174. Kiểm tra: `GET /api/health/preflight`.
Frontend chạy riêng bằng `npm.cmd run dev` tại http://localhost:5173.

Backend tự đọc `.env` ở thư mục gốc; biến môi trường đã có được ưu tiên.
Bắt buộc có `SUPABASE_DB_URL`; không còn SQLite fallback.
Mặc định dùng Supabase Auth, quyền lấy từ database. `AUTH_MODE=legacy` chỉ dành
cho kiểm thử trong Development. Không chạy migration tự động trên database chung.

Xem [thiết lập môi trường](../docs/development-setup.md) và
[hợp đồng hồ sơ giáo viên](../docs/teacher-profile-api.md).

`Linea.Api/` chứa API; `Linea.Api.Tests/` chứa test harness có ghi dữ liệu,
bắt buộc `TEST_DATABASE_URL` là PostgreSQL kiểm thử riêng.
