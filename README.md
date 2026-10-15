# PA6ma - Nền tảng học Digital Art

LINEA là nền tảng hỗ trợ học Digital Art, nơi người dùng có thể khám phá
khóa học, theo dõi tiến độ học tập, thực hành bài tập và trao đổi với cộng
đồng.

## Thành viên nhóm

| STT | Họ và tên | Tên github | MSSV | Vai trò |
| ---: | --- | --- | --- | --- |
| 1 | Trần Đại Phát | loiz123 | 31241026754 | Project Manager / Scrum Master |
| 2 | Nguyễn Huỳnh Đăng | Ddawng18 | 31241026574 | Product Owner / BA |
| 3 | Lê Công Bảo | congbao2006 | 31241027834 | Developer - Frontend |
| 4 | Bành Phát Thịnh | Phát Thịnh | 31241022944 | Developer - Backend / QA |
| 5 | Nguyễn Lâm Sỹ Phú | Phunguyen11-02 | 31241020835 | Tech Lead / DevOps |

## Công nghệ dự kiến sử dụng

### Frontend

- **React 19**: xây dựng giao diện người dùng.
- **TypeScript**: phát triển mã nguồn có kiểu dữ liệu rõ ràng.
- **Vite**: môi trường phát triển và công cụ build frontend.
- **React Router**: quản lý điều hướng giữa các trang.
- **Lucide React**: thư viện icon cho giao diện.
- **HTML,CSS**: định dạng giao diện và responsive layout.

### Dữ liệu và kiểm tra

- **SupaBase**: lưu trữ database.
- **localStorage**: mô phỏng trạng thái tài khoản, tiến độ học, khóa học yêu
  thích, bài nộp và dữ liệu phân tích trong phiên bản prototype.
- **Zod**: kiểm tra và xác thực dữ liệu đầu vào.
- **Vitest**: viết và chạy unit test.
- **ESLint**: kiểm tra chất lượng và quy chuẩn mã nguồn.

> Phiên bản hiện tại là prototype React/Vite chạy phía client. Các chức năng
> backend, cơ sở dữ liệu thật, thanh toán và xác thực tài khoản thực tế sẽ được
> tích hợp trong các giai đoạn tiếp theo.

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

12. **Chatbot hỗ trợ**
    - Trả lời các câu hỏi thường gặp về khóa học và nền tảng.
    - Hỗ trợ người dùng tìm kiếm nội dung học phù hợp.

## Cài đặt và chạy dự án

```bash
npm install
npm run dev
```

## Kiểm tra dự án

```bash
npm run build
npm run test
npm run lint
```
