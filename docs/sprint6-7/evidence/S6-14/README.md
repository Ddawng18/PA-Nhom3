# Hồ sơ nghiệm thu S6-14 — Trang Khách

## Cập nhật nghiệm thu có bằng chứng

GH-01/06/07 đạt local. GH-03/04 chỉ đạt UI với fixture; GH-05 chỉ kiểm tra DOM anonymous local. GH-02 và API/dữ liệu riêng thực tế BLOCKED do chưa có môi trường/identity tích hợp. Chưa đạt toàn task.

Phiên bản ef18bd4, ngày 15/11/2026, Codex thực thi tự động; reviewer con người chưa xác nhận. [Báo cáo kết quả](../../KET_QUA_NGHIEM_THU_PR15_2026-11-15.md), [JSON tổng hợp](../acceptance-2026-11-15/consolidated-results.json). Không chạy trên production. Ma trận NOT_RUN bên dưới giữ làm baseline lịch sử, được kết quả mới thay thế theo từng nhánh.


**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`; chưa xác nhận tích hợp hoặc deploy.

## Thông tin môi trường

- SHA FE: `b8933d1f841a25be77e12d91930a5e6f8d45a304` (mã nguồn được kiểm tra).
- SHA BE/schema: phụ thuộc API catalog hiện hành; SHA môi trường không được kiểm tra.
- Ngày ghi hồ sơ: 15/11/2026 UTC+7.
- Trình duyệt/thiết bị/viewport cho các ca S6-14: chưa chạy; không có ảnh/log evidence.
- Người thực hiện/reviewer nghiệm thu: chưa được chỉ định/xác nhận.

## Đã xác nhận từ đọc mã

- Trang Khách có CTA đăng ký và khám phá catalog.
- Trang Khách có liên kết tới `/studio` và `/community`.
- Catalog dùng route/API hiện hành; không thêm danh sách khóa giả trên trang Khách.

Đây là ghi nhận về mã, không xác nhận trải nghiệm trên môi trường tích hợp.

## Ma trận ca gốc trước nghiệm thu (lịch sử)

| Mã | Tiêu chí / bước chính | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| GH-01 | Anonymous mới mở trang Khách và các liên kết | Trang mở trực tiếp, CTA đi đúng route | NOT_RUN |
| GH-02 | CTA đăng ký; kiểm tra đăng nhập/đăng xuất | Phiên và ngữ cảnh được xử lý đúng | NOT_RUN |
| GH-03 | Mở catalog; kiểm tra khóa công khai/nháp/ẩn | Chỉ nội dung công khai được hiển thị | NOT_RUN |
| GH-04 | API catalog loading, empty, error và retry | Mỗi trạng thái phân biệt đúng, retry an toàn | NOT_RUN |
| GH-05 | Kiểm tra response và DOM khi anonymous | Không có dữ liệu cá nhân, điểm hoặc tiến độ | NOT_RUN |
| GH-06 | Kiểm tra 360px | Không tràn ngang; CTA/link sử dụng được | NOT_RUN |
| GH-07 | Mở Studio/Community từ trang Khách | Điều hướng đúng; nhãn demo/giới hạn rõ ràng | NOT_RUN |

## Ghi nhận khi chạy

Chưa có log/ảnh, môi trường deploy, kết quả API hoặc reviewer được xác nhận. Không đánh dấu PASS từ việc đọc route hay build.

```text
Mã ca / tiêu chí DoD:
PR / SHA FE / SHA BE / schema:
Ngày giờ UTC+7 / môi trường / người thực hiện / reviewer:
Trình duyệt / thiết bị / viewport / vai trò:
Tiền điều kiện / dữ liệu:
Bước thực hiện / kết quả mong đợi / kết quả thực tế:
Trạng thái: NOT_RUN | REPORTED_UNVERIFIED | PASS | FAIL | BLOCKED
Link ảnh / log:
Lỗi tồn / owner / hạn đã xác nhận:
```

## Quy ước phiên bản và kết quả bổ sung khi bàn giao

SHA mã chức năng được đối chiếu: `b8933d1`. Commit tài liệu trước lần hoàn thiện này: `18a44a5`. SHA của lần bàn giao tiếp theo lấy từ lịch sử Git; không gọi SHA mã chức năng là head hiện tại. Trạng thái PR ghi kèm thời điểm là thông tin lịch sử, cần đọc lại GitHub trước khi tích hợp.

`NOT_RUN`: chưa thực hiện. `REPORTED_UNVERIFIED`: tác giả báo cáo đã thực hiện nhưng thiếu minh chứng truy vết hoặc chưa được xác minh độc lập; không tính PASS. `PASS`/`FAIL`: có kết quả thực tế và bằng chứng gắn SHA/môi trường. `BLOCKED`: có trở ngại cụ thể. Ca có nhiều nhánh phải ghi riêng trạng thái từng nhánh; không dùng kết quả một nhánh cho cả ca.

Thông số máy, giờ và kết quả chạy cũ là thông tin do tác giả ghi trong báo cáo, chưa được reviewer xác minh độc lập. Lượt hoàn thiện tài liệu này không chạy test, trình duyệt, SQL hoặc deploy. Xem [bảng bàn giao và người phụ trách](../../BAN_GIAO_PR15_2026-11-15.md).

## Hướng dẫn tái hiện từng ca (chưa thực thi trong lượt bàn giao)

Mỗi nhánh cần kết quả riêng. Nếu chưa có môi trường/dữ liệu thì ghi BLOCKED với lý do khi nhận chạy; không tự tạo kết quả.

### GH-01

- Tiền điều kiện: Phiên mới không đăng nhập; ghi URL và SHA FE.
- Bước: Mở trực tiếp trang Khách, reload; mở từng CTA/link.
- Mong đợi: Trang và đích đúng, không yêu cầu role học viên cho trang công khai.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-02

- Tiền điều kiện: Có tài khoản kiểm tra; ghi khóa đích nếu CTA xuất phát từ khóa.
- Bước: Đi theo CTA đăng ký/đăng nhập; thử hủy; đăng nhập rồi đăng xuất.
- Mong đợi: Header/phiên đúng; giữ ngữ cảnh khi có; hủy không tạo ghi danh.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-03

- Tiền điều kiện: Môi trường riêng có khóa công khai, nháp, ẩn được chuẩn bị hợp lệ.
- Bước: Mở catalog anonymous; đối chiếu API và UI với trạng thái các khóa.
- Mong đợi: Chỉ khóa được phép công khai xuất hiện; ghi SHA BE/schema.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-04

- Tiền điều kiện: Có cách kiểm soát mạng/response trên môi trường kiểm tra, không thay production.
- Bước: Lần lượt tạo chậm mạng, dữ liệu rỗng hợp lệ, lỗi API; phục hồi và Retry.
- Mong đợi: Loading/empty/error phân biệt; retry hồi phục; không dùng response lỗi làm empty.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-05

- Tiền điều kiện: Phiên anonymous sạch; Network/DOM inspector mở.
- Bước: Đọc response API dùng trên trang và DOM sau tải; đối chiếu nhóm trường riêng.
- Mong đợi: Không có dữ liệu cá nhân/điểm/tiến độ; artifact được che dữ liệu nhạy cảm.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-06

- Tiền điều kiện: Viewport 360px.
- Bước: Cuộn hết trang, thao tác menu/CTA/link và kiểm tra chiều rộng.
- Mong đợi: Không tràn ngang; văn bản/CTA dùng được.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### GH-07

- Tiền điều kiện: Trang Khách đang mở.
- Bước: Chọn Studio rồi quay lại; chọn Community và mở bài chi tiết.
- Mong đợi: Route đúng; giới hạn Studio và nhãn demo rõ.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.
