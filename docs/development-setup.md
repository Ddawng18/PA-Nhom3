# Thiết lập và xử lý lỗi local

Thư mục chính: `D:\QLDA\PA-Nhom3`, nhánh `develop`.

## Cấu hình

Nếu chưa có `.env`, sao chép `.env.example` rồi điền thông tin của nhóm.
Không ghi đè `.env` đang dùng. Không commit secret.

```dotenv
VITE_API_URL=http://localhost:4174
CLIENT_ORIGIN=http://localhost:5173
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-key>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<public-key>
SUPABASE_DB_URL=<postgresql-url-server-only>
RUN_MIGRATIONS=false
```

Frontend và backend phải dùng cùng Supabase project. Backend bắt buộc dùng
PostgreSQL, không còn SQLite fallback. Với database chung, giữ migration tự động
tắt; chỉ chạy migration đã review. Các biến Storage server nằm trong `.env.example`.
Không đặt secret vào biến `VITE_*`.

## Khởi động

Cài dependency bằng `npm.cmd ci` và `dotnet restore server/Linea.slnx` khi cần.
Mở hai terminal ở thư mục chính:

```powershell
# Terminal 1
npm.cmd run dev:api
```

```powershell
# Terminal 2
npm.cmd run dev
```

Mở http://localhost:5173. Nếu cổng đã có tiến trình, kiểm tra trước khi mở thêm
instance; Vite có thể chuyển sang cổng khác.

## Failed to fetch

1. Kiểm tra URL trình duyệt và terminal frontend: mở đúng cổng Vite đang chạy.
2. Mở http://localhost:4174/api/health/preflight. Nếu không kết nối được, kiểm tra
   terminal backend. `npm.cmd run dev` chỉ chạy frontend.
3. Kiểm tra `database.connected`, `database.schema.ready` và `storage.available`;
   HTTP 200 riêng lẻ chưa đủ.
4. Khi chạy Vite, URL API loopback (`localhost`, `127.0.0.1`, `::1`) được gọi
   qua proxy `/api` cùng origin với frontend. Proxy hiện trỏ tới backend cổng 4174.
   Cách này dùng được khi mở trang bằng IP LAN/VPN, tránh trình duyệt chặn request
   từ origin HTTP qua localhost. Nếu đổi cổng backend, cập nhật proxy trong
   `vite.config.ts` tương ứng.
5. Nếu cấu hình frontend gọi trực tiếp một backend khác, cần URL truy cập được
   từ máy người xem và `CLIENT_ORIGIN` đúng. Không dùng URL localhost trên Vercel.
6. Nếu lỗi ở đăng nhập hoặc tải vai trò, kiểm tra request tới Supabase trong
   Network: URL/key, kết nối mạng và trạng thái phiên đăng nhập.

Sau khi thay `.env`, khởi động lại frontend/backend tương ứng. Xem status và
response của request lỗi trước khi kết luận là lỗi quyền hoặc database.

## Tạo khóa học

Form yêu cầu role `teacher` và hồ sơ `DA_DUYET`. Điền thông tin cơ bản,
chọn ảnh bìa rồi thêm chương và bài học ngay trong bản soạn. Mỗi chương mới có
thể thêm nhiều bài học mà không cần lưu trước. Bấm **Lưu toàn bộ** để lưu thông
tin khóa, cấu trúc, bài học và tệp đã chọn. Chương/bài học mới được gán ID riêng
khi lưu; dữ liệu nội dung được cập nhật trong một giao dịch backend.

Tên khóa không trùng trong cùng giáo viên; tên chương không trùng trong cùng
khóa; tên bài học không trùng trong cùng chương. Quy tắc bỏ qua hoa/thường và
khoảng trắng đầu/cuối. Database áp dụng migration
`supabase/migrations/20261116151449_enforce_course_content_unique_titles.sql`.
Không tự đổi tên hoặc xóa dữ liệu cũ nếu migration phát hiện tên trùng.

Bấm Gửi duyệt sẽ kiểm tra và lưu toàn bộ bản soạn trước khi gửi, kể cả khóa học
mới. Nếu lưu hoặc tải tệp lỗi, hệ thống giữ nội dung để thử lại và không gửi duyệt.
Gửi xét duyệt thành công sẽ hiện thông báo chờ duyệt, kể cả sau khi tải lại trang.
Không đổi role hoặc trạng thái hồ sơ để bỏ qua lỗi chưa xác định.
