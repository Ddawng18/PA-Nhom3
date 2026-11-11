# Phân tích PB10/PB11 — WBS 2.10.1 và 2.11.1

Ngày soạn: 11/11/2026. Đây là bản phân tích bổ sung để nhóm review, chưa ghi nhận BA/PO phê duyệt. Tài liệu không khẳng định API nộp/chấm bài đã triển khai trong Sprint 5.

## Căn cứ và phạm vi

- PB10: học viên nộp ảnh bài vẽ cho bài tập thuộc khóa đã ghi danh.
- PB11: giáo viên của khóa xem bài nộp, nhận xét và chấm điểm thủ công; không dùng AI dạy hoặc chấm vẽ.
- Cấu trúc dữ liệu theo `supabase/linea_v2_schema.sql`: `ghi_danh`, `chuong`, `bai_hoc`, `bai_tap`, `bai_nop`, `ket_qua_cham` và `nguoi_dung` (đã đổi tên từ `profiles`).
- Kế thừa phạm vi dự án trong bản nộp `Nhóm 3_tuần 4.docx` của nhóm và quy tắc phân quyền đã triển khai. Phần dưới phân biệt ràng buộc đã có trong schema với đề xuất cần BA/PO chốt.

## PB10 — Nộp ảnh bài vẽ

### Vai trò, tiền điều kiện và dữ liệu

Học viên đã đăng nhập, có ghi danh `DANG_HOC` hoặc `HOAN_THANH`, bài tập tồn tại và thuộc đúng khóa. Backend suy ra người nộp từ token, không nhận `ma_nguoi_dung` từ client.

| Trường | Ràng buộc |
| --- | --- |
| `ma_bai_tap` | Tham chiếu bài tập hiện hữu, không được tráo bài tập của khóa khác. |
| `ma_nguoi_dung` | Danh tính đã xác thực; UNIQUE ghép với `ma_bai_tap`. |
| `duong_dan_anh` | Bắt buộc, không chỉ có khoảng trắng; tối đa 500 ký tự theo schema. |
| `trang_thai` | `CHO_CHAM` khi nộp hợp lệ; chỉ workflow chấm chuyển sang `DA_CHAM`. |
| `ngay_nop`, `ngay_cap_nhat` | Thời gian máy chủ; không tin thời gian client. |

### Luồng đề xuất

1. Học viên mở bài tập, xem đề bài và hạn nộp `han_nop` (nếu có).
2. Chọn một ảnh; frontend kiểm tra định dạng/kích thước và hiển thị bản xem trước.
3. Backend kiểm tra token, ghi danh, bài tập, hạn nộp, quyền sở hữu object và magic bytes; file nằm trong kho riêng tư.
4. Lưu ảnh mới và bản ghi `bai_nop`; ràng buộc UNIQUE chống tạo hai bản ghi cho cùng học viên/bài tập. Nếu DB lưu thất bại, dọn object vừa upload.
5. Trả bài nộp vừa lưu; UI hiển thị trạng thái `CHO_CHAM` và thời gian máy chủ. Chặn nút khi đang gửi, giữ dữ liệu nhập nếu thất bại.

### Quyết định cần BA/PO xác nhận trước Sprint triển khai

- Đề xuất 1 ảnh JPG/PNG/WEBP, tối đa 10 MB; kiểm tra cả MIME và magic bytes. Schema chỉ lưu một đường dẫn, chưa quy định định dạng hay kích thước.
- Đề xuất cho thay ảnh trước hạn và trước khi chấm; cập nhật cùng bản ghi, không tạo bản thứ hai. Sau `DA_CHAM` không tự xóa điểm hoặc thay ảnh; quy trình mở lại phải được nhóm duyệt.
- Đề xuất từ chối sau hạn nộp, dùng thời gian máy chủ UTC và hiển thị UTC+7; `han_nop = null` nghĩa là không hạn. Chốt việc cho phép nộp muộn và cách gắn trạng thái nếu nhóm cần.
- Đề xuất gửi một thông báo cho giáo viên khi nộp thành công; email không phải điều kiện để nộp thành công.

### Lỗi và tiêu chí nghiệm thu

| Tình huống | HTTP/thông báo đề xuất | Tiêu chí |
| --- | --- | --- |
| Chưa xác thực | 401 — Phiên đăng nhập đã hết hạn. | Không lưu file hoặc bản ghi. |
| Chưa ghi danh/khác khóa | 403 hoặc 404 — Bạn không có quyền nộp bài tập này. | Không lộ bài nộp người khác. |
| File sai/thiếu/quá lớn | 400/413/415 — Vui lòng chọn ảnh hợp lệ theo giới hạn. | Không còn object rác sau lỗi. |
| Quá hạn/đã chấm/gửi đồng thời | 409 — Bài tập không còn cho phép thay đổi bài nộp. | Không ghi đè kết quả chấm. |
| Mạng/Storage/DB lỗi | 503 — Chưa thể nộp bài. Vui lòng thử lại. | UI giữ dữ liệu; retry không tạo bản ghi trùng. |

Các test cần có khi triển khai: nộp đúng quyền; người khác không đọc/sửa được; file giả MIME bị từ chối; hạn tại đúng thời điểm ranh giới; hai request đồng thời chỉ còn một bản ghi; lỗi DB dọn ảnh; gửi lại tuân theo quy tắc đã chốt.

## PB11 — Xem bài nộp, nhận xét và chấm điểm

### Quyền và ràng buộc

- Giáo viên chỉ xem/chấm bài của khóa mình phụ trách; truy ngược bài nộp → bài tập → bài học → chương → khóa để kiểm tra quyền tại server.
- Học viên chỉ xem kết quả bài của mình; không xem danh sách bài nộp của lớp.
- Admin không mặc định được ghi điểm thay giáo viên; nếu cần quyền ngoại lệ phải được nhóm xác nhận.
- Schema `ket_qua_cham`: một kết quả cho mỗi `ma_bai_nop` (UNIQUE), `diem` từ 0 đến 10, `nhan_xet` bắt buộc và không trắng, `ma_nguoi_cham` từ token.
- Kiểu `numeric(4,2)` cho phép hai chữ số thập phân. Đề xuất API nhận tối đa hai chữ số thập phân; không tự làm tròn âm thầm.

### Luồng đề xuất

1. Giáo viên chọn khóa/bài tập, lọc `CHO_CHAM` hoặc `DA_CHAM`; danh sách phân trang, không tải toàn bộ ảnh gốc.
2. Mở bài nộp; API xác minh quyền rồi cấp signed URL ngắn hạn cho ảnh riêng tư.
3. Nhập điểm và nhận xét; frontend kiểm tra dữ liệu, server kiểm tra lại.
4. Trong cùng transaction: lưu `ket_qua_cham`, đặt `bai_nop.trang_thai = DA_CHAM`, ghi thông báo cho học viên. Nếu một bước lỗi thì rollback toàn bộ.
5. Trả kết quả; giáo viên thấy trạng thái mới, học viên xem điểm/nhận xét của chính mình.

### Quyết định cần BA/PO xác nhận

- Đề xuất giới hạn nhận xét 10–2.000 ký tự sau trim; schema hiện chỉ bắt buộc không trắng.
- Đề xuất cho giáo viên sửa kết quả sau chấm nhưng phải lưu lịch sử người sửa, thời điểm và giá trị trước/sau; schema hiện chưa có bảng audit điểm. Chưa triển khai sửa điểm cho tới khi chốt thiết kế này.
- Rubric/tiêu chí có trọng số là phần mở rộng đã có trong UI editor; schema gốc chưa có `tieu_chi_cham_diem`. Nhóm cần chốt có dùng rubric trong Sprint triển khai hay dùng điểm tổng 0–10.
- Đề xuất signed URL 5 phút và thông báo trong ứng dụng, kế thừa cách xử lý ảnh hồ sơ; không đưa `internalNote` hoặc tài liệu riêng của người khác ra client.

### Lỗi và test nghiệm thu

- 401 khi token hết hạn; 403/404 khi chấm khóa người khác; 400 khi điểm ngoài 0–10 hoặc nhận xét không hợp lệ; 409 khi có xung đột phiên chấm.
- Test điểm 0, 10, số âm, >10, quá hai số thập phân; nhận xét chỉ khoảng trắng; giáo viên khóa khác; học viên giả role; hai giáo viên/request đồng thời; transaction lỗi không để bài `DA_CHAM` thiếu kết quả.
- Chỉ xác nhận hoàn tất PB10/PB11 sau khi BA/PO review các quyết định còn mở, API/UI được triển khai ở Sprint tương ứng và có minh chứng kiểm thử. Không tự chuyển hai thẻ sang Done.
