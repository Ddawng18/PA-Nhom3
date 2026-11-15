# Hồ sơ nghiệm thu S6-15 — Community demo

## Cập nhật nghiệm thu có bằng chứng

CM-01–07 đạt các nhánh local đã chạy; clipboard lỗi mô phỏng Promise từ chối, Network không request ghi trong context kiểm tra. CM-08 còn BLOCKED vì chưa có PO duyệt. Chưa đạt toàn task.

Phiên bản ef18bd4, ngày 15/11/2026, Codex thực thi tự động; reviewer con người chưa xác nhận. [Báo cáo kết quả](../../KET_QUA_NGHIEM_THU_PR15_2026-11-15.md), [JSON tổng hợp](../acceptance-2026-11-15/consolidated-results.json). Không chạy trên production. Ma trận NOT_RUN bên dưới giữ làm baseline lịch sử, được kết quả mới thay thế theo từng nhánh.


**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`; chưa xác nhận tích hợp hoặc deploy.

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

## Ma trận ca gốc trước nghiệm thu (lịch sử)

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
Trạng thái: NOT_RUN | REPORTED_UNVERIFIED | PASS | FAIL | BLOCKED
Link ảnh / log / HAR đã làm sạch:
Lỗi tồn / owner / hạn đã xác nhận:
```

## Quy ước phiên bản và kết quả bổ sung khi bàn giao

SHA mã chức năng được đối chiếu: `b8933d1`. Commit tài liệu trước lần hoàn thiện này: `18a44a5`. SHA của lần bàn giao tiếp theo lấy từ lịch sử Git; không gọi SHA mã chức năng là head hiện tại. Trạng thái PR ghi kèm thời điểm là thông tin lịch sử, cần đọc lại GitHub trước khi tích hợp.

`NOT_RUN`: chưa thực hiện. `REPORTED_UNVERIFIED`: tác giả báo cáo đã thực hiện nhưng thiếu minh chứng truy vết hoặc chưa được xác minh độc lập; không tính PASS. `PASS`/`FAIL`: có kết quả thực tế và bằng chứng gắn SHA/môi trường. `BLOCKED`: có trở ngại cụ thể. Ca có nhiều nhánh phải ghi riêng trạng thái từng nhánh; không dùng kết quả một nhánh cho cả ca.

Thông số máy, giờ và kết quả chạy cũ là thông tin do tác giả ghi trong báo cáo, chưa được reviewer xác minh độc lập. Lượt hoàn thiện tài liệu này không chạy test, trình duyệt, SQL hoặc deploy. Xem [bảng bàn giao và người phụ trách](../../BAN_GIAO_PR15_2026-11-15.md).

## Hướng dẫn tái hiện từng ca (chưa thực thi trong lượt bàn giao)

Mỗi nhánh cần kết quả riêng. Nếu chưa có môi trường/dữ liệu thì ghi BLOCKED với lý do khi nhận chạy; không tự tạo kết quả.

### CM-01

- Tiền điều kiện: Phiên sạch; có postId mẫu lấy từ feed.
- Bước: Mở feed, click bài; mở URL chi tiết trực tiếp và reload.
- Mong đợi: Đúng bài; nhãn DEMO rõ trên feed/chi tiết.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-02

- Tiền điều kiện: Ghi số thích mẫu ban đầu.
- Bước: Thích, bỏ thích, thích lại rồi reload.
- Mong đợi: Số/trạng thái đổi đúng trong bộ nhớ và reset sau reload.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-03

- Tiền điều kiện: Mở chi tiết; chỉ dùng chuỗi kiểm tra không nhạy cảm.
- Bước: Gửi chuỗi rỗng/toàn khoảng trắng; gửi bình luận hợp lệ; reload.
- Mong đợi: Chặn rỗng; hiển thị hợp lệ trong phiên; reload không lưu bình luận mới.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-04

- Tiền điều kiện: Chọn postId không tồn tại.
- Bước: Mở URL rồi chọn link quay lại.
- Mong đợi: Thông báo không tìm thấy, quay lại feed được.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-05

- Tiền điều kiện: Môi trường kiểm tra cho phép kiểm soát quyền clipboard.
- Bước: Sao chép link khi được phép; thử từ chối quyền nếu browser hỗ trợ.
- Mong đợi: Copy đúng URL; khi thất bại có thông báo phù hợp; ghi hạn chế môi trường.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-06

- Tiền điều kiện: Network mở, xóa request cũ; không ghi HAR có token/cookie.
- Bước: Thích/bỏ thích, gửi bình luận, copy link, mở chi tiết; xem request theo thao tác.
- Mong đợi: Không có request ghi do Community tạo ra; lưu ảnh/log đã làm sạch.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-07

- Tiền điều kiện: Viewport 360px.
- Bước: Mở feed/chi tiết; cuộn, nhập bình luận và dùng các nút.
- Mong đợi: Không tràn ngang; nhãn demo và nhắc dữ liệu nhạy cảm rõ.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### CM-08

- Tiền điều kiện: Có bản nội dung và CSS/mã minh họa gắn SHA để review.
- Bước: Đăng đối chiếu bài/tác giả/số mẫu, cảnh báo và nguồn minh họa; ghi quyết định duyệt.
- Mong đợi: Có xác nhận thật của người duyệt; không dùng ảnh private; chưa xác nhận giữ NOT_RUN.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.
