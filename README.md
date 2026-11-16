# LINEA — PA-Nhom3

Dự án chính: `D:\QLDA\PA-Nhom3`. Nhánh tích hợp: `develop`.
Các thư mục `PA-Nhom3-checklist-1115`, `PA-Nhom3-handover-1115` và
`PA-Nhom3-sprint6-review` là Git worktree phục vụ công việc riêng.

## Chạy local

Cần Node.js 20.19+ hoặc 22.12+, .NET SDK 9 và `.env` đã điền theo
[hướng dẫn môi trường](docs/development-setup.md). Giữ file `.env` đang có.

```powershell
cd D:\QLDA\PA-Nhom3
git switch develop
git pull --ff-only origin develop
npm.cmd ci
```

Mở hai terminal tại thư mục dự án, giữ cả hai chạy:

```powershell
# Terminal 1: backend
npm.cmd run dev:api
```

```powershell
# Terminal 2: frontend
npm.cmd run dev
```

Mở **http://localhost:5173**. Backend: **http://localhost:4174**.
`npm.cmd run dev` chỉ chạy frontend, không khởi động backend.

## Tạo khóa học

Đăng nhập tài khoản `teacher` có hồ sơ `DA_DUYET` → Khóa học của tôi →
Tạo khóa học. Điền tiêu đề ít nhất 5 ký tự, mô tả ít nhất 50 ký tự,
cấp độ, chủ đề và chọn ảnh bìa, rồi bấm **Lưu nháp** để lưu cùng lúc.
Sau đó thêm chương/bài học. Khi soạn bài học, chọn ảnh và tệp tham khảo trước,
rồi bấm **Lưu bài học** để lưu cùng nội dung. **Gửi duyệt** yêu cầu đủ nội dung
và ảnh bìa; khi thành công sẽ hiện thông báo khóa học đang chờ xét duyệt.

## Thư mục

| Đường dẫn | Nội dung |
| --- | --- |
| `src/`, `public/` | Frontend và tài nguyên |
| `server/` | Backend và kiểm thử API |
| `supabase/` | SQL, migration, cấu hình database |
| `tests/` | Kiểm thử trình duyệt |
| `deploy/` | Script kiểm tra và triển khai |
| `docs/` | Hướng dẫn kỹ thuật |

Báo cáo sprint và bằng chứng kiểm thử cũ đã chuyển ra ngoài repo tại
`D:\QLDA\Lưu trữ\PA-Nhom3-tai-lieu-20261116`. Mã nguồn, SQL và test được giữ lại.

## Kiểm tra

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run lint
Invoke-RestMethod http://localhost:4174/api/health/preflight
```

Test API ghi dữ liệu yêu cầu `TEST_DATABASE_URL` là PostgreSQL kiểm thử riêng.

## Thành viên nhóm

| STT | Họ và tên | Tên github | MSSV | Vai trò |
| ---: | --- | --- | --- | --- |
| 1 | Trần Đại Phát | loiz123 | 31241026754 | Project Manager / Scrum Master |
| 2 | Nguyễn Huỳnh Đăng | Ddawng18 | 31241026574 | Product Owner / BA |
| 3 | Lê Công Bảo | congbao2006 | 31241027834 | Developer - Backend / QA |
| 4 | Bành Phát Thịnh | Phát Thịnh | 31241022944 | Developer -  Frontend |
| 5 | Nguyễn Lâm Sỹ Phú | Phunguyen11-02 | 31241020835 | Tech Lead / DevOps |


Xem [API giáo viên](docs/teacher-profile-api.md), [Supabase](docs/supabase-setup.md) và [triển khai](docs/deployment.md).
