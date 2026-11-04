# PA-3 - Nền tảng học Digital Art

LINEA là nền tảng hỗ trợ học Digital Art, nơi người dùng có thể khám phá
khóa học, theo dõi tiến độ học tập, thực hành bài tập và trao đổi với cộng
đồng.

## Thành viên nhóm

| STT | Họ và tên | Tên github | MSSV | Vai trò |
| ---: | --- | --- | --- | --- |
| 1 | Trần Đại Phát | loiz123 | 31241026754 | Project Manager / Scrum Master |
| 2 | Nguyễn Huỳnh Đăng | Ddawng18 | 31241026574 | Product Owner / BA |
| 3 | Lê Công Bảo | congbao2006 | 31241027834 | Developer - Backend / QA |
| 4 | Bành Phát Thịnh | Phát Thịnh | 31241022944 | Developer -  Frontend |
| 5 | Nguyễn Lâm Sỹ Phú | Phunguyen11-02 | 31241020835 | Tech Lead / DevOps |

## Công nghệ dự kiến sử dụng

### Frontend

- **React 19**: xây dựng giao diện người dùng.
- **TypeScript**: phát triển mã nguồn có kiểu dữ liệu rõ ràng.
- **Vite**: môi trường phát triển và công cụ build frontend.
- **React Router**: quản lý điều hướng giữa các trang.
- **Lucide React**: thư viện icon cho giao diện.
- **HTML,CSS**: định dạng giao diện và responsive layout.
- **Vercel**: deploy dự án lên Internet.

### Backend

- **C# / ASP.NET Core Web API**: API xác thực, JWT, phân quyền và kết nối CSDL.

### Dữ liệu và kiểm tra

- **SupaBase**: lưu trữ database.
- **localStorage**: mô phỏng trạng thái tài khoản, tiến độ học, khóa học yêu
  thích, bài nộp và dữ liệu phân tích trong phiên bản prototype.
- **Zod**: kiểm tra và xác thực dữ liệu đầu vào.
- **Vitest**: viết và chạy unit test.
- **ESLint**: kiểm tra chất lượng và quy chuẩn mã nguồn.

> Hiện đã có đăng ký, đăng nhập qua Supabase Auth, backend kiểm tra vai trò và
> trang hồ sơ/cài đặt. Các API bài tập và khóa học vẫn trả dữ liệu mẫu; chức
> năng quản lý tài khoản Supabase của admin chưa triển khai. Danh sách bên dưới
> là chức năng dự kiến, không phải tất cả đã hoàn thành.

## Chức năng dự kiến

1. **Trang chủ và danh mục khóa học**
   - Hiển thị các khóa học Digital Art nổi bật.
   - Phân loại khóa học theo chủ đề, trình độ hoặc kỹ năng.
   - Tìm kiếm và khám phá khóa học.

2. **Chi tiết khóa học**
   - Hiển thị thông tin, nội dung, giảng viên và cấp độ khóa học.
   - Hiển thị danh sách chương/bài học và đánh giá từ học viên.

3. **Học trực tuyến**
   - Xem video bài giảng.
   - Chọn chương và bài học.
   - Làm và nộp bài tập thực hành.
   - Theo dõi tiến độ học tập và trạng thái hoàn thành.

4. **Giỏ hàng và thanh toán**
   - Thêm hoặc xóa khóa học khỏi giỏ hàng.
   - Xem tổng tiền và thông tin đơn hàng.
   - Hỗ trợ quy trình thanh toán khóa học.

5. **Tài khoản cá nhân**
   - Đăng ký, đăng nhập và quản lý thông tin cá nhân.
   - Xem khóa học đã mua, lịch sử học và tiến độ cá nhân.

6. **Lưu khóa học yêu thích**
   - Lưu hoặc bỏ lưu khóa học.
   - Xem danh sách khóa học yêu thích để học sau.

7. **Khuyến mãi**
   - Hiển thị mã giảm giá và các chương trình ưu đãi.
   - Áp dụng mã khuyến mãi trong quá trình thanh toán.

8. **Đánh giá khóa học**
   - Cho điểm và viết nhận xét sau khi học.
   - Xem đánh giá của các học viên khác.

9. **Hỏi đáp và trao đổi**
   - Đặt câu hỏi liên quan đến bài học.
   - Trao đổi giữa học viên và giảng viên/cộng đồng.

10. **Thông báo**
    - Thông báo bài học mới, cập nhật khóa học và hoạt động tài khoản.
    - Nhắc nhở tiến độ học tập hoặc bài tập cần hoàn thành.

11. **Sự kiện cộng đồng**
    - Tổ chức các hoạt động sáng tạo như Inktober hoặc thử thách vẽ theo chủ
      đề.
    - Cho phép người dùng tham gia và chia sẻ sản phẩm.


## Cài đặt và chạy dự án

Các lệnh dưới đây chạy tại thư mục gốc repository, ví dụ `D:\QLDA\PA-Nhom3`.
Cần cài **Node.js 20.19+ hoặc 22.12+** (để chạy Vite 7) và **.NET SDK 9**
kèm ASP.NET Core Runtime 9. Kiểm tra bằng `node --version`, `npm --version`
và `dotnet --list-runtimes`.

### 1. Lấy mã và cài thư viện

```powershell
git clone https://github.com/Ddawng18/PA-Nhom3.git
cd PA-Nhom3
git switch Thinh-dev
npm ci
dotnet restore server/Linea.slnx
```

Nếu đã có repository, chạy `git switch Thinh-dev` rồi `git pull --ff-only` thay
cho `git clone`. Trên PowerShell, nếu `npm` bị chặn bởi execution policy,
thay `npm` bằng `npm.cmd` trong các lệnh.

### 2. Cấu hình môi trường

Tạo `.env` từ file mẫu nếu chưa có, sau đó mở file và điền khóa công khai:

```powershell
Copy-Item .env.example .env
```

Lấy **Project URL** và **anon/publishable key** tại Supabase Dashboard →
**Project Settings → API Keys**, rồi đặt các giá trị tương ứng trong `.env`:

```dotenv
VITE_SUPABASE_URL=https://pscjbvjcprvzfkawflql.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-hoac-publishable-key>
VITE_API_URL=http://localhost:4174
SUPABASE_URL=https://pscjbvjcprvzfkawflql.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon-hoac-publishable-key>
CLIENT_ORIGIN=http://localhost:5173
SUPABASE_DB_URL=
```

`VITE_API_URL` là địa chỉ backend frontend gọi để lấy vai trò. Nếu chỉ muốn
chạy frontend, có thể để trống biến này; chức năng gọi API và hiển thị vai trò
qua backend sẽ không hoạt động. Không commit `.env` hoặc đưa `service_role`,
secret key hay mật khẩu CSDL vào biến `VITE_`.

Để `SUPABASE_DB_URL`, `SEED_ADMIN_EMAIL` và `SEED_ADMIN_PASSWORD` trống khi
chạy theo hướng dẫn này. Backend mặc định xác thực bằng Supabase Auth; không cần
`JWT_KEY` cho luồng này. Đăng nhập Google và URL callback cần được cấu hình
trong Supabase; việc gửi email xác nhận phụ thuộc cấu hình email của dự án.

### 3. Chạy backend

Mở terminal thứ nhất tại thư mục gốc:

```powershell
dotnet run --project server/Linea.Api
```

API mặc định chạy tại `http://localhost:4174`. Mở
`http://localhost:4174/api/health` để kiểm tra kết nối Supabase Auth. Khi chạy
Development, backend áp dụng EF migration cho SQLite cục bộ; không điền
`SUPABASE_DB_URL` nếu không chủ động muốn dùng database chung. Nếu dùng backend
đang deploy thay vì local, đặt `VITE_API_URL=https://linea-api-7f2q.onrender.com`
và lưu ý CORS backend hiện chỉ cho phép origin website production.

### 4. Chạy frontend

Mở terminal thứ hai tại thư mục gốc:

```powershell
npm run dev
```

Truy cập `http://localhost:5173`. Đăng ký hoặc đăng nhập bằng tài khoản thử;
sau khi đăng nhập, trang cài đặt hiển thị vai trò nếu API local đang chạy và
được cấu hình đúng. Nếu Vite chuyển sang cổng khác vì 5173 đang bận, cập nhật
`CLIENT_ORIGIN` trong `.env` theo origin thực tế rồi khởi động lại backend.

## Triển khai miễn phí

Phương án: **Vercel** (frontend) + **Render** (backend ASP.NET Core) + **Supabase**
(Postgres/Auth). Hướng dẫn chi tiết trong [`docs/deployment.md`](docs/deployment.md).
Dự án **chưa được triển khai**, nên chưa có URL thử.

## Kiểm tra dự án

```powershell
npm run build
npm run test
npm run lint
dotnet run --project server/Linea.Api.Tests
```

Test backend tạo database SQLite tạm và chạy chế độ JWT cũ để kiểm tra; không
ghi vào Supabase thật. Với máy chỉ cài .NET 10, có thể chạy thử bằng
`$env:DOTNET_ROLL_FORWARD='Major'` trước lệnh test, nhưng nên cài .NET 9 để
kiểm thử đúng runtime. Xem thêm [`server/README.md`](server/README.md) và
[`thaydoi.md`](thaydoi.md) để biết phạm vi và các phần còn thiếu.
