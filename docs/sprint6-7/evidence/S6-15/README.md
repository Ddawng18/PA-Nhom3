# Hồ sơ nghiệm thu S6-15 — Community demo

**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), head `b8933d1f841a25be77e12d91930a5e6f8d45a304`; chưa xác nhận tích hợp hoặc deploy.

## Thông tin môi trường

- SHA FE: `b8933d1f841a25be77e12d91930a5e6f8d45a304` (mã nguồn được kiểm tra).
- SHA BE/schema: không áp dụng cho tương tác demo hiện tại.
- Ngày ghi hồ sơ: 15/11/2026 UTC+7.
- Trình duyệt/thiết bị/viewport cho các ca Community: chưa chạy; không có ảnh/log/Network capture.
- Người thực hiện/reviewer duyệt nội dung: chưa được chỉ định/xác nhận.

## Đã xác nhận từ đọc mã

- Routes `/community` và `/community/:postId` có trong router.
- Feed và chi tiết hiện nhãn dữ liệu demo; tác giả, nội dung, bình luận ban đầu và số tương tác đều là dữ liệu mẫu.
- Thích/bình luận được lưu trong React state của trang; không có lời gọi API ghi trong component hiện tại.
- Hình minh họa là các khối màu CSS có chữ LINEA; không dùng ảnh bài nộp private.
- Có xử lý bài không tồn tại, nội dung bình luận rỗng và nhắc không nhập nội dung nhạy cảm.

Đây là kết quả đọc mã, không phải bằng chứng Network rằng trình duyệt không tạo request ghi.

## Ma trận ca

| Mã | Tiêu chí / bước chính | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| CM-01 | Mở `/community` và `/community/:postId` | Route đúng, nhãn demo luôn thấy được | NOT_RUN |
| CM-02 | Thích/bỏ thích và tải lại | Chỉ đổi trong phiên; tải lại reset | NOT_RUN |
| CM-03 | Gửi bình luận hợp lệ, để trống, tải lại | Nội dung trống bị chặn; bình luận demo không lưu | NOT_RUN |
| CM-04 | Mở post ID không tồn tại | Hiện trạng thái không tìm thấy và link quay lại | NOT_RUN |
| CM-05 | Sao chép liên kết | Clipboard thành công hoặc báo lỗi phù hợp | NOT_RUN |
| CM-06 | Theo dõi Network trong mọi tương tác | Không có request ghi do Community tạo ra | NOT_RUN |
| CM-07 | Kiểm tra 360px và cảnh báo dữ liệu nhạy cảm | Layout dùng được; cảnh báo rõ ở feed/chi tiết | NOT_RUN |
| CM-08 | Duyệt nội dung/kịch bản và nguồn hình minh họa | Có người duyệt xác nhận; asset có nguồn rõ | NOT_RUN — hình hiện tại là CSS, người duyệt chưa xác nhận |

## Ghi nhận khi chạy

```text
Mã ca / tiêu chí DoD:
PR / SHA FE / SHA BE nếu có:
Ngày giờ UTC+7 / môi trường / người thực hiện / reviewer:
Trình duyệt / thiết bị / viewport / vai trò:
Tiền điều kiện / dữ liệu:
Bước thực hiện / kết quả mong đợi / kết quả thực tế:
Network: request quan sát được (nếu có), đã loại bỏ dữ liệu nhạy cảm:
Trạng thái: NOT_RUN | PASS | FAIL | BLOCKED
Link ảnh / log / HAR đã làm sạch:
Lỗi tồn / owner / hạn đã xác nhận:
```
