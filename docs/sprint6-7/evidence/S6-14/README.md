# Hồ sơ nghiệm thu S6-14 — Trang Khách

**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), head `b8933d1f841a25be77e12d91930a5e6f8d45a304`; chưa xác nhận tích hợp hoặc deploy.

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

## Ma trận ca

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
Trạng thái: NOT_RUN | PASS | FAIL | BLOCKED
Link ảnh / log:
Lỗi tồn / owner / hạn đã xác nhận:
```
