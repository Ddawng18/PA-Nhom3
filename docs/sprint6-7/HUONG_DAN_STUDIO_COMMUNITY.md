# Hướng dẫn Studio và Community demo

Phạm vi: mã trong PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`. Trạng thái PR/deploy có thể thay đổi; hướng dẫn này không xác nhận phiên bản đã được triển khai.

## Mở từ trang Khách

Trên trang Khách, chọn **Thử vẽ trong Studio** hoặc **Xem góc chia sẻ demo**. Điều hướng công khai cũng có các mục **Studio** và **Cộng đồng**. Catalog khóa học và đăng ký vẫn mở qua CTA tương ứng.

## Studio

1. Mở `/studio`.
2. Chọn **Bút** hoặc **Tẩy**. Chọn màu và kéo thanh **Cỡ nét** để đổi nét bút.
3. Vẽ trong vùng canvas bằng chuột hoặc cảm ứng.
4. Dùng **Hoàn tác** / **Làm lại** để điều chỉnh. Lịch sử giữ tối đa 30 snapshot; thao tác mới sau undo tạo nhánh mới và bỏ redo cũ.
5. Chọn **Xóa tranh** rồi xác nhận nếu muốn làm trắng canvas.
6. Chọn **Tải PNG** để tải tác phẩm về thiết bị.

Studio không lưu cloud và không tự upload, nộp bài, hoàn thành khóa hay đăng feed. Bản vẽ chỉ tồn tại trong bộ nhớ trang; reload hoặc rời trang sẽ làm mất tranh chưa tải PNG. Hãy tải PNG trước khi rời Studio.

Khi canvas khác snapshot PNG đã xuất, điều hướng trong website, Back/Forward, tải lại hoặc đóng tab có thể hiện xác nhận. Chọn ở lại để tiếp tục giữ tranh trong trang hiện tại; chọn rời đi sẽ bỏ tranh. Trình duyệt tự quyết định giao diện hộp thoại khi reload/đóng tab. Sau khi sửa/undo/redo, hãy tải PNG mới nếu muốn giữ đúng bản hiện tại.

Muốn nộp PNG làm bài tập, mở khóa học và dùng **form nộp bài hiện có**. Form và backend sẽ áp dụng quyền, loại file và giới hạn kích thước hiện hành. Studio không nộp bài thay người dùng.

## Community demo

1. Mở `/community` để xem feed mẫu.
2. Chọn tiêu đề bài để mở chi tiết tại `/community/:postId`.
3. **Thích**, **Thêm bình luận demo** và **Sao chép liên kết** chỉ phục vụ trải nghiệm demo. Tương tác thích/bình luận reset khi tải lại; không có lưu cloud.
4. Nội dung, tác giả, bình luận sẵn có và số tương tác đều là dữ liệu mẫu. Hình minh họa hiện là khối màu CSS.

Community không phải mạng xã hội thật: không đăng bài, gửi tin, tạo thông báo hay lưu bình luận. Không nhập thông tin cá nhân, bí mật hoặc nội dung nhạy cảm vào ô bình luận demo.

## Giới hạn nghiệm thu

Hướng dẫn này mô tả chức năng từ mã PR, không thay thế nghiệm thu. Xem trạng thái từng ca trong [evidence S6-13](evidence/S6-13/README.md), [S6-14](evidence/S6-14/README.md) và [S6-15](evidence/S6-15/README.md). Cảm ứng, responsive 360px, Network capture và tình trạng deploy chưa có evidence nghiệm thu trong bộ tài liệu này.

## Quy ước phiên bản và kết quả bổ sung khi bàn giao

SHA mã chức năng được đối chiếu: `b8933d1`. Commit tài liệu trước lần hoàn thiện này: `18a44a5`. SHA của lần bàn giao tiếp theo lấy từ lịch sử Git; không gọi SHA mã chức năng là head hiện tại. Trạng thái PR ghi kèm thời điểm là thông tin lịch sử, cần đọc lại GitHub trước khi tích hợp.

`NOT_RUN`: chưa thực hiện. `REPORTED_UNVERIFIED`: tác giả báo cáo đã thực hiện nhưng thiếu minh chứng truy vết hoặc chưa được xác minh độc lập; không tính PASS. `PASS`/`FAIL`: có kết quả thực tế và bằng chứng gắn SHA/môi trường. `BLOCKED`: có trở ngại cụ thể. Ca có nhiều nhánh phải ghi riêng trạng thái từng nhánh; không dùng kết quả một nhánh cho cả ca.

Thông số máy, giờ và kết quả chạy cũ là thông tin do tác giả ghi trong báo cáo, chưa được reviewer xác minh độc lập. Lượt hoàn thiện tài liệu này không chạy test, trình duyệt, SQL hoặc deploy. Xem [bảng bàn giao và người phụ trách](BAN_GIAO_PR15_2026-11-15.md).
