# Bằng chứng kiểm tra

Tài liệu này dùng để đưa cho giảng viên/reviewer xem. Mọi lệnh đều chạy lại được;
không chứa token, mật khẩu hay connection string thật.

## Môi trường kiểm tra

- Nhánh: `Back-End`
- Commit gần nhất khi kiểm tra: `35a2723` (schema fix trước đó: `541c8f1`)
- Backend: .NET 9 / ASP.NET Core
- Frontend: React + TypeScript + Vite
- CSDL dev: Supabase Postgres (hoặc SQLite nếu `SUPABASE_DB_URL` trống)
- Test backend: harness tự chạy, dùng SQLite tạm để không ghi vào Supabase

## 1. Lệnh cài đặt và chạy

```powershell
npm install
Copy-Item .env.example .env
# Điền JWT_KEY, VITE_SUPABASE_ANON_KEY; SUPABASE_DB_URL có thể để trống
npm run dev
dotnet run --project server/Linea.Api
```

Chi tiết biến môi trường: `.env.example` và `docs/development-setup.md`.

## 2. Bằng chứng test tự động

```powershell
dotnet build server/Linea.slnx
dotnet run --project server/Linea.Api.Tests
npm run test
npm run lint
npm run build
```

Kết quả thực tế:

```text
Build succeeded. 0 Warning(s), 0 Error(s)
PASS ... (20 test backend)
RESULT passed=20 failed=0

Test Files  2 passed (2)
Tests       11 passed (11)
```

Các test trực tiếp cho yêu cầu:

- `register rejects invalid data` — API nhận body sai và trả `400` kèm `errors`.
- `register rejects passwords over 72 bytes` — giới hạn byte của BCrypt.
- `register rejects a duplicate email` — trùng email trả `409`.
- `register validates input, hashes password and hides it` — đọc DB thấy hash BCrypt,
  response không có `password`/hash.
- `login accepts the correct password` / `login rejects a wrong password`.
- `admin lock blocks login and invalidates existing tokens` — khóa trả `423`,
  token cũ trả `401`.
- `student is denied teacher and admin endpoints` — RBAC trả `403`.
- `protected endpoint rejects a missing token` / `... malformed token` — `401`.

File test: `server/Linea.Api.Tests/Program.cs`.

## 3. Bằng chứng API thật (Supabase Postgres)

Chạy backend với `SUPABASE_DB_URL`, sau đó gọi:

```powershell
$base = "http://localhost:4174"

# Đăng ký hợp lệ -> 201
Invoke-RestMethod -Method Post "$base/api/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"student@example.com","displayName":"Hoc vien","password":"MatKhau123!"}'

# Đăng ký trùng -> 409
Invoke-RestMethod -Method Post "$base/api/auth/register" `
  -ContentType "application/json" `
  -Body '{"email":"student@example.com","displayName":"Hoc vien","password":"MatKhau123!"}'
```

Kết quả đã chạy (không in token):

```text
register=201 leaksPassword=False
duplicate=409 detail=Email này đã được đăng ký.
login=200 role=student tokenType=Bearer
me=200 email=student-...@example.com role=student leaksPassword=False
studentAssignments=200
teacherCoursesAsStudent=403
adminUsersAsStudent=403
adminUsersWithoutToken=401
adminLogin=200 role=admin
adminUsersAsAdmin=200
promoteRole=204
reloginAfterPromote=200 role=teacher
teacherCoursesAsTeacher=200
lockUser=204
loginLocked=423 detail=Tài khoản đã bị khóa...
oldTokenAfterLock=401
```

Sau khi chụp/xuất log, tài khoản test đã được xóa; CSDL chỉ còn admin seed.
Không đưa token thật vào báo cáo.

## 4. Bằng chứng CSDL

Chạy trong Supabase SQL Editor:

```sql
-- Không hiển thị toàn bộ hash; chỉ kiểm tra đây là BCrypt và không phải plaintext
select "Email", "Role", "IsLocked",
       left("PasswordHash", 4) as hash_prefix,
       length("PasswordHash") as hash_length
from public.users;

select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'users';

select relrowsecurity
from pg_class
where relname = 'users' and relnamespace = 'public'::regnamespace;

select has_table_privilege('anon', 'public.users', 'SELECT') as anon_select,
       has_table_privilege('authenticated', 'public.users', 'SELECT') as authenticated_select;
```

Kết quả đã kiểm tra:

```text
PasswordHash: nullable=NO, hash_prefix=$2a$, hash_length=60
IX_users_Email: CREATE UNIQUE INDEX ... ("Email")
Role: NOT NULL, default 'Student'
rls_enabled=True
anon_select=False
authenticated_select=False
```

## 5. Bằng chứng không lộ secret

```powershell
git ls-files .env                 # phải rỗng
git check-ignore -v .env          # khớp .gitignore
git diff --cached --name-only | Select-String '(^|/)\.env$'
```

Đã kiểm tra remote `Back-End`: không có `.env`, `*.db`, `bin/`, `obj/`,
`server/.nuget-local`; không tìm thấy mật khẩu DB trong source. `.env.example` chỉ
chứa placeholder.

## 6. PR review

**Trạng thái: CHƯA ĐẠT** — code đã push trực tiếp lên `Back-End`, chưa có PR được
reviewer approve.

Để hoàn tất:

1. Mở PR `Back-End` → `main`:
   `https://github.com/Ddawng18/PA-Nhom3/compare/main...Back-End?expand=1`
2. Ghi mô tả gồm link tài liệu này, lệnh test và kết quả `20/20`.
3. Assign một thành viên khác review; yêu cầu họ bấm **Approve**.
4. Merge; lưu URL PR và ảnh/log approve vào tài liệu này.

Không tự approve PR của chính mình.
