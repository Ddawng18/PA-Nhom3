# Hồ sơ nghiệm thu S6-13 — Studio

**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), head `b8933d1f841a25be77e12d91930a5e6f8d45a304`; head này chưa được xác nhận đã tích hợp hoặc deploy.

## Thông tin môi trường

- SHA FE: `b8933d1f841a25be77e12d91930a5e6f8d45a304` (mã nguồn được kiểm tra).
- SHA BE/schema: không áp dụng cho Studio.
- Ngày ghi hồ sơ: 15/11/2026 UTC+7.
- Môi trường từng dùng cho thao tác tự động: macOS 26.6.2, Google Chrome 157.0.8103.51, Playwright, viewport 1280×720.
- Người thực hiện/reviewer nghiệm thu: chưa có danh tính được xác nhận độc lập.
- Ảnh/log lưu kèm: chưa có. Kết quả console từng xuất hiện trong phiên làm việc nhưng raw log không được lưu thành artifact; không dùng làm PASS có thể truy vết.

## Ma trận ca

| Mã | Tiêu chí / bước chính | Kết quả mong đợi | Trạng thái hiện tại |
|---|---|---|---|
| ST-01 | Vẽ chuột; thử bút, tẩy, màu và cỡ nét | Nét theo tọa độ và công cụ đã chọn | NOT_RUN — chỉ có lần vẽ chuột phục vụ ca guard, không có evidence riêng |
| ST-02 | Vẽ cảm ứng, CSS scale, vùng vẽ không cuộn trang | Tọa độ chính xác, trang không cuộn khi vẽ | NOT_RUN |
| ST-03 | Undo/redo, giới hạn 30 snapshot, vẽ mới sau undo | Redo bị bỏ khi tạo nhánh mới; lịch sử giới hạn đúng | NOT_RUN — ca undo sau export chưa có log/ảnh đính kèm |
| ST-04 | Xóa, hủy xác nhận, tiếp tục vẽ | Hủy không đổi tranh; xác nhận xóa và vẽ tiếp được | NOT_RUN |
| ST-05 | Xuất PNG và so với tranh trên canvas | PNG tải được, khớp nội dung và tỷ lệ | NOT_RUN — thao tác tải được gọi trong phiên, chưa lưu file đối chiếu |
| ST-06 | Vẽ → link nội bộ → hủy hoặc đồng ý rời | Hủy ở lại và giữ tranh; đồng ý điều hướng | NOT_RUN — hai nhánh đã chạy tự động trong phiên, không có raw log/ảnh đính kèm |
| ST-07 | Vẽ → Back/Forward → hủy hoặc đồng ý | Hủy ở lại; đồng ý đi theo lịch sử trình duyệt | NOT_RUN — Back/hủy đã chạy trong phiên, chưa có artifact; Forward chưa chạy |
| ST-08 | Vẽ → xuất → sửa/undo/redo; quay lại snapshot đã xuất | Snapshot khác bị cảnh báo; snapshot đã xuất không cảnh báo thừa | NOT_RUN — undo sau export đã tạo cảnh báo trong phiên; các nhánh đầy đủ chưa có minh chứng lưu |
| ST-09 | Reload/đóng tab khi chưa xuất | Trình duyệt cảnh báo; lựa chọn ở lại giữ tranh | NOT_RUN — chưa thực thi |
| ST-10 | Resize/đổi hướng; viewport 360px; thao tác bàn phím | Tranh không mất nét; layout không tràn; toolbar dùng được | NOT_RUN |
| ST-11 | Theo dõi Network khi dùng Studio | Không upload/nộp/đăng ngoài chủ động tải PNG | NOT_RUN — chưa kiểm tra Network |

## Ghi nhận cần bổ sung khi nghiệm thu

Cho mỗi ca, người chạy ghi lại ngày giờ UTC+7, SHA, trình duyệt/thiết bị/viewport, vai trò, bước, kết quả thực tế và link ảnh/log đã che thông tin nhạy cảm. Chỉ chuyển khỏi `NOT_RUN` sau khi có kết quả và artifact lưu được; reviewer xác nhận riêng.

```text
Mã ca / tiêu chí DoD:
PR / SHA FE / SHA BE nếu có:
Ngày giờ UTC+7 / người thực hiện / reviewer:
Trình duyệt / thiết bị / viewport:
Vai trò / tiền điều kiện:
Bước thực hiện:
Kết quả mong đợi / thực tế:
Trạng thái: NOT_RUN | PASS | FAIL | BLOCKED
Link ảnh / log:
Lỗi tồn / owner / hạn đã xác nhận:
```
