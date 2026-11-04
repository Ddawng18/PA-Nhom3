# LINEA Backend API (ASP.NET Core)

Backend xác thực cho nền tảng LINEA. Project độc lập với frontend Vite và nằm trong
`server/`.

- **Runtime**: .NET 9 (ASP.NET Core Web API)
- **ORM / CSDL**: Entity Framework Core + Supabase Postgres (khi có `SUPABASE_DB_URL`) hoặc SQLite (fallback/test)
- **Mật khẩu**: BCrypt (work factor 11)
- **Phiên đăng nhập**: JWT HS256, có kiểm tra tài khoản bị khóa ở mỗi request
- **Kiểm thử**: harness integration test tự chạy, không phụ thuộc package test bên ngoài

## Cấu trúc

```text
server/
  Linea.Api/
    Controllers/      Auth, Student, Teacher, Admin
    Contracts/        DTO request/response (không lộ mật khẩu)
    Data/             DbContext, migration, seed admin
    Models/           User, UserRole
    Security/         Policy names, email normalizer, claims helper
    Services/         BCrypt, JWT
    Migrations/       EF Core migration InitialCreate
  Linea.Api.Tests/    Integration test harness (khởi động API thật, gọi HTTP)
  Linea.slnx
```

## Cấu hình

Backend đọc biến môi trường. Khi chạy local, API cũng tự đọc file `.env` ở thư mục
gốc repository (chỉ dùng nếu biến môi trường chưa được đặt). `.env` đã bị Git
ignore; **không commit giá trị thật**. Hướng dẫn onboarding đầy đủ cho thành viên
mới nằm trong [`../docs/development-setup.md`](../docs/development-setup.md).

Mặc định an toàn: để `SUPABASE_DB_URL` trống để dùng SQLite, không cần chia sẻ mật
khẩu database. Nếu dùng Supabase chung, nhận connection string qua password manager
của nhóm — không qua Git/chat/issue.

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `JWT_KEY` | Có | Khóa ký JWT, tối thiểu 32 byte. API dừng ngay nếu thiếu. |
| `JWT_ISSUER` | Không | Mặc định `linea-api`. |
| `JWT_AUDIENCE` | Không | Mặc định `linea-client`. |
| `JWT_EXPIRY_MINUTES` | Không | Mặc định `60`. |
| `SUPABASE_DB_URL` | Không | Connection string PostgreSQL của Supabase, chỉ dùng server-side. Có giá trị thì backend dùng Supabase; để trống thì dùng SQLite. Không đặt tiền tố `VITE_` và không commit. |
| `DB_CONNECTION` | Không | Chuỗi SQLite fallback, mặc định `Data Source=linea-dev.db`. |
| `RUN_MIGRATIONS` | Không | Đặt `true` trên hosting để chạy migration khi khởi động (lần deploy đầu). Development luôn chạy migration. |
| `CLIENT_ORIGIN` | Không | Origin được CORS, mặc định `http://localhost:5173`. |
| `SEED_ADMIN_EMAIL` | Không | Tạo admin đầu tiên khi CSDL chưa có tài khoản này. |
| `SEED_ADMIN_PASSWORD` | Không | Mật khẩu admin đầu tiên. Nên xóa sau lần chạy đầu. |

Sinh `JWT_KEY` bằng PowerShell:

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
$key = [Convert]::ToBase64String($bytes)
$lines = Get-Content .env | ForEach-Object {
    if ($_ -match '^JWT_KEY=') { "JWT_KEY=$key" } else { $_ }
}
[IO.File]::WriteAllLines((Resolve-Path .env), $lines, (New-Object Text.UTF8Encoding($false)))
```

Frontend hiện tại đăng nhập qua Supabase Auth. Backend này là API độc lập; nếu
client chuyển sang dùng backend, gọi `/api/auth/*` và gửi
`Authorization: Bearer <JWT>`.

## Chạy backend

Phương án hosting miễn phí (Vercel + Render + Supabase) và các biến môi trường
production nằm trong [`../docs/deployment.md`](../docs/deployment.md).

```powershell
dotnet run --project server/Linea.Api
```

- Địa chỉ mặc định: `http://localhost:4174` (khớp proxy `/api` trong `vite.config.ts`).
- Khi `SUPABASE_DB_URL` có giá trị, lần chạy đầu ở Development sẽ áp dụng migration
  lên Supabase (bảng `users`, bật RLS và thu hồi quyền `anon`/`authenticated`).
- Khi `SUPABASE_DB_URL` để trống, backend dùng SQLite tại
  `server/Linea.Api/linea-dev.db`.
- Health check: `GET http://localhost:4174/api/health`.
- Connection string lấy tại **Supabase → Settings → Infrastructure → Database**.
  Dùng direct connection `postgresql://postgres:<password>@db.<ref>.supabase.co:5432/postgres`
  hoặc session pooler nếu mạng không hỗ trợ IPv6.

Kiểm tra CSDL đọc/ghi thủ công:

```powershell
# Đăng ký (ghi)
Invoke-RestMethod -Method Post http://localhost:4174/api/auth/register `
  -ContentType "application/json" `
  -Body '{"email":"student@example.com","displayName":"Hoc vien","password":"MatKhau123!"}'

# Đăng nhập (đọc + kiểm tra hash)
$login = Invoke-RestMethod -Method Post http://localhost:4174/api/auth/login `
  -ContentType "application/json" `
  -Body '{"email":"student@example.com","password":"MatKhau123!"}'

# Hồ sơ (đọc)
Invoke-RestMethod http://localhost:4174/api/auth/me `
  -Headers @{ Authorization = "Bearer $($login.accessToken)" }
```

## API

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| `GET` | `/api/health` | Công khai | Kiểm tra kết nối CSDL. |
| `POST` | `/api/auth/register` | Công khai | Validate, chống trùng email, băm mật khẩu, trả hồ sơ đã lọc. |
| `POST` | `/api/auth/login` | Công khai | Kiểm tra hash + khóa tài khoản, trả JWT. |
| `GET` | `/api/auth/me` | Đã đăng nhập | Hồ sơ hiện tại. |
| `GET` | `/api/student/assignments` | `student` | Dữ liệu học viên. |
| `GET` | `/api/teacher/courses`, `/api/teacher/dashboard` | `teacher`, `admin` | Dữ liệu giảng viên. |
| `GET` | `/api/admin/users` | `admin` | Danh sách tài khoản (đã lọc mật khẩu). |
| `PATCH` | `/api/admin/users/{id}/lock` | `admin` | Khóa/mở khóa tài khoản. Không cho tự khóa. |
| `PATCH` | `/api/admin/users/{id}/role` | `admin` | Đổi vai trò. Không cho tự hạ quyền. |

Quy ước lỗi:

- `400`: dữ liệu không hợp lệ (ProblemDetails + `errors` theo từng trường).
- `401`: sai email/mật khẩu (thông báo chung), thiếu/sai/hết hạn JWT, tài khoản bị khóa khi dùng token cũ.
- `403`: sai vai trò (RBAC).
- `409`: email đã tồn tại.
- `423`: tài khoản bị khóa khi đăng nhập.

Không endpoint nào trả `password` hay `passwordHash`.

## Đối chiếu yêu cầu

| Yêu cầu | Bằng chứng trong code |
| --- | --- |
| API nhận và kiểm tra dữ liệu đầu vào | DTO trong `Contracts/AuthContracts.cs` dùng DataAnnotations; `AuthController` kiểm tra thêm độ dài byte của mật khẩu; test `register rejects invalid data`. |
| Xử lý tài khoản trùng, băm mật khẩu, không trả mật khẩu | `AuthController.Register` kiểm tra email chuẩn hóa; unique index `Email` trong `AppDbContext`; `BcryptPasswordHasher`; response dùng `UserResponse`/`AuthResponse`; test đăng ký, trùng email và kiểm tra response không có hash. |
| Kiểm thử thành công/thất bại, thông báo lỗi phù hợp | Harness trong `server/Linea.Api.Tests` kiểm tra status code, `detail` lỗi trùng/sai mật khẩu/khóa và `errors` khi validate. |
| API xác thực tài khoản, kiểm tra hash và tài khoản khóa | `AuthController.Login` xác thực BCrypt, trả `401` chung khi sai, `423` khi khóa; `Program.OnTokenValidated` kiểm tra lại tài khoản mỗi request. |
| Phân quyền server cho student/teacher/admin, từ chối trái quyền | Policy trong `AuthPolicies` và `Program`; `[Authorize(Policy = ...)]` trên các controller; test `403` cho student/teacher. |
| Test đúng/sai mật khẩu, khóa, thiếu token, trái quyền | Các test `login accepts/rejects`, `locked account`, `missing/malformed token`, `student cannot change roles or lock accounts`, RBAC. |
| Schema/migration cho tài khoản và vai trò ban đầu | `Migrations/20261104000000_InitialCreate.cs` tạo bảng `users` với `Role`, `IsLocked`, unique `Email`; migration `20261104010000_MakePasswordHashRequired` bắt buộc `PasswordHash`; `UserRole` mặc định `Student`; admin seed qua biến môi trường. |
| Backend kết nối CSDL và đọc/ghi trong dev | `Program` dùng Supabase Postgres khi có `SUPABASE_DB_URL`, SQLite khi để trống; migration chạy khi Development; đã kiểm tra đăng ký/đọc/đổi role/khóa thật trên Supabase. |
| Cấu hình qua biến môi trường, hướng dẫn, bằng chứng, không lộ thông tin | `.env.example` chỉ chứa placeholder; `server/README.md` có hướng dẫn chạy/kiểm thử; `.gitignore` chặn `.env`, `*.db`, `bin/obj`; không có khóa thật trong source. |

## Kiểm thử

Harness tự build API, chạy API trên cổng tạm với CSDL SQLite tạm, gọi HTTP thật,
kiểm tra response và đọc lại bảng `users`, sau đó dọn process/CSDL. Harness luôn
đặt `SUPABASE_DB_URL` rỗng để không ghi vào Supabase thật. Không cần package test
bên ngoài nên chạy được cả khi mạng chậm.

```powershell
dotnet run --project server/Linea.Api.Tests
```

Các nhóm test chính (20 test):

- Health check báo CSDL đã kết nối; tài khoản admin seed đăng nhập được.
- Đăng ký thành công: `201`, hash BCrypt trong CSDL, response không có mật khẩu/hash.
- Client gửi `role: admin` vẫn bị ép về `student`.
- Email trùng: `409`; dữ liệu sai: `400` kèm lỗi trường; mật khẩu vượt 72 byte: `400`.
- Đăng nhập đúng: `200` + JWT; sai mật khẩu/email không tồn tại: `401` cùng thông báo.
- Thiếu token / token sai: `401`; hồ sơ trả về đã lọc dữ liệu nhạy cảm.
- RBAC: student bị `403` ở teacher/admin; teacher bị `403` ở admin; admin quản lý user.
- Student không thể tự đổi role hoặc tự khóa tài khoản qua endpoint admin (`403`).
- Admin đổi vai trò, vai trò mới có hiệu lực sau khi đăng nhập lại.
- Admin khóa tài khoản: đăng nhập `423`, token cũ bị từ chối `401`; không cho tự khóa.

Kết quả chạy thực tế:

```text
PASS health reports database connected
PASS seeded admin can sign in
PASS register validates input, hashes password and hides it
PASS register forces the student role
PASS register rejects a duplicate email
PASS register rejects invalid data
PASS register rejects passwords over 72 bytes
PASS login accepts the correct password
PASS login rejects a wrong password
PASS login rejects an unknown email
PASS protected endpoint rejects a missing token
PASS protected endpoint rejects a malformed token
PASS current profile returns sanitized data
PASS student is denied teacher and admin endpoints
PASS student cannot change roles or lock accounts
PASS admin lists accounts without leaking secrets
PASS teacher role is enforced immediately after re-login
PASS admin can access admin and teacher endpoints
PASS admin lock blocks login and invalidates existing tokens
PASS admin cannot lock their own account
RESULT passed=20 failed=0
```

## Bằng chứng chạy thủ công (Development)

Chạy API thật với `SUPABASE_DB_URL` cho thấy backend đọc/ghi Supabase Postgres:

```text
GET /api/health                  -> {"status":"ok","database":"connected"}
POST /api/auth/register          -> 201 (response không có "password" hoặc hash)
POST /api/auth/register (trùng)  -> 409 Email này đã được đăng ký.
POST /api/auth/login             -> 200 Bearer, role=student
GET  /api/auth/me                -> 200, không lộ mật khẩu/hash
GET  /api/student/assignments    -> 200
GET  /api/teacher/courses        -> 403 (student)
GET  /api/admin/users            -> 403 (student)
GET  /api/admin/users (không token) -> 401
POST /api/auth/login (admin seed)-> 200, role=admin
GET  /api/admin/users (admin)    -> 200, đọc được danh sách từ CSDL
PATCH /api/admin/users/{id}/role -> 204, đăng nhập lại thấy role=teacher
GET  /api/teacher/courses (teacher) -> 200
PATCH /api/admin/users/{id}/lock -> 204, đăng nhập lại -> 423
GET  /api/auth/me (token cũ)     -> 401
```

Kiểm tra trực tiếp trên Supabase sau khi chạy:

```text
database=postgres user=postgres
users_count=2 (admin seed + tài khoản test)
row=admin@linea.local|Admin|False
row=student-...@example.com|Teacher|True
rls_enabled=True
anon_select=False authenticated_select=False
```

Tài khoản test đã được xóa sau khi kiểm tra; CSDL còn lại tài khoản admin seed.
Cột `PasswordHash` không được trả qua API và bảng `users` không cho `anon`/
`authenticated` đọc trực tiếp.

## Bảo mật

- Mật khẩu chỉ lưu dạng BCrypt hash; không log hoặc trả về mật khẩu.
- Đăng nhập sai trả cùng một thông báo để hạn chế dò email; có kiểm tra hash giả
  để giảm lệch thời gian.
- JWT ký HS256, kiểm tra issuer/audience/lifetime, thời gian lệch 30 giây.
- Mỗi request có JWT đều kiểm tra lại tài khoản trong CSDL: user bị xóa hoặc bị
  khóa sẽ bị từ chối ngay, không chờ token hết hạn.
- Vai trò lấy từ token do server ký; client không thể tự gửi role khi đăng ký.
- Trên Supabase, migration bật RLS cho bảng `users` và thu hồi quyền
  `SELECT` của `anon`/`authenticated`; chỉ role backend (`postgres`) truy cập được.
- `SUPABASE_DB_URL`, `JWT_KEY`, mật khẩu seed và file `.env` không được commit;
  `.gitignore` đã chặn. Không dùng tiền tố `VITE_` cho `SUPABASE_DB_URL`.

## Ghi chú tích hợp

- Backend dùng Supabase Postgres khi `SUPABASE_DB_URL` có giá trị; nếu để trống
  thì dùng SQLite để dev/test nhanh. Migration provider-neutral tạo bảng `users`
  với unique index cho `Email`, `Role` mặc định `Student`, `PasswordHash` bắt buộc
  và `IsLocked`.
- Bảng `users` của backend tách biệt với `profiles` mà frontend dùng qua Supabase
  Auth; migration backend không sửa schema `profiles`.
- Frontend hiện dùng Supabase Auth trực tiếp; backend này là API độc lập, sẵn sàng
  để frontend chuyển sang gọi `/api/auth/*` và gửi `Authorization: Bearer <JWT>`.
