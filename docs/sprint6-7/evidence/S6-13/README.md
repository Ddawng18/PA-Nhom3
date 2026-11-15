# Hồ sơ nghiệm thu S6-13 — Studio

**Trạng thái task:** REVIEW / chưa DONE. PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`; mã này chưa được xác nhận đã tích hợp hoặc deploy.

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
| ST-01 | Vẽ chuột; thử bút, tẩy, màu và cỡ nét | Nét theo tọa độ và công cụ đã chọn | REPORTED_UNVERIFIED: vẽ chuột phục vụ guard; NOT_RUN: đủ tổ hợp bút/tẩy/màu/cỡ nét |
| ST-02 | Vẽ cảm ứng, CSS scale, vùng vẽ không cuộn trang | Tọa độ chính xác, trang không cuộn khi vẽ | NOT_RUN |
| ST-03 | Undo/redo, giới hạn 30 snapshot, vẽ mới sau undo | Redo bị bỏ khi tạo nhánh mới; lịch sử giới hạn đúng | REPORTED_UNVERIFIED: undo sau export; NOT_RUN: giới hạn lịch sử và các nhánh còn lại |
| ST-04 | Xóa, hủy xác nhận, tiếp tục vẽ | Hủy không đổi tranh; xác nhận xóa và vẽ tiếp được | NOT_RUN |
| ST-05 | Xuất PNG và so với tranh trên canvas | PNG tải được, khớp nội dung và tỷ lệ | REPORTED_UNVERIFIED: gọi tải PNG; NOT_RUN: đối chiếu file PNG với canvas |
| ST-06 | Vẽ → link nội bộ → hủy hoặc đồng ý rời | Hủy ở lại và giữ tranh; đồng ý điều hướng | REPORTED_UNVERIFIED: hai nhánh được báo cáo đã chạy, chưa có artifact |
| ST-07 | Vẽ → Back/Forward → hủy hoặc đồng ý | Hủy ở lại; đồng ý đi theo lịch sử trình duyệt | REPORTED_UNVERIFIED: Back/hủy; NOT_RUN: Forward và các nhánh chưa được báo cáo |
| ST-08 | Vẽ → xuất → sửa/undo/redo; quay lại snapshot đã xuất | Snapshot khác bị cảnh báo; snapshot đã xuất không cảnh báo thừa | REPORTED_UNVERIFIED: undo sau export tạo cảnh báo; NOT_RUN: các nhánh còn lại |
| ST-09 | Reload/đóng tab khi chưa xuất | Trình duyệt cảnh báo; lựa chọn ở lại giữ tranh | NOT_RUN — chưa thực thi |
| ST-10 | Resize/đổi hướng; viewport 360px; thao tác bàn phím | Tranh không mất nét; layout không tràn; toolbar dùng được | NOT_RUN |
| ST-11 | Theo dõi Network khi dùng Studio | Không upload/nộp/đăng ngoài chủ động tải PNG | NOT_RUN — chưa kiểm tra Network |

## Ghi nhận cần bổ sung khi nghiệm thu

Cho mỗi ca, người chạy ghi lại ngày giờ UTC+7, SHA, trình duyệt/thiết bị/viewport, vai trò, bước, kết quả thực tế và link ảnh/log đã che thông tin nhạy cảm. Chỉ ghi PASS/FAIL khi có kết quả thực tế và artifact truy vết; reviewer xác nhận riêng. REPORTED_UNVERIFIED không phải kết quả nghiệm thu.

```text
Mã ca / tiêu chí DoD:
PR / SHA FE / SHA BE nếu có:
Ngày giờ UTC+7 / người thực hiện / reviewer:
Trình duyệt / thiết bị / viewport:
Vai trò / tiền điều kiện:
Bước thực hiện:
Kết quả mong đợi / thực tế:
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

### ST-01

- Tiền điều kiện: Mở Studio mới; ghi thiết bị/viewport.
- Bước: Vẽ nét bằng bút; đổi màu/cỡ nét; dùng tẩy trên nét vừa vẽ.
- Mong đợi: Nét/cỡ/màu và vùng tẩy đúng thao tác.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-02

- Tiền điều kiện: Thiết bị cảm ứng hoặc môi trường giả lập được ghi rõ; canvas hiển thị ở ít nhất hai kích thước.
- Bước: Vẽ tại góc và giữa canvas; kéo ngón tay trong canvas rồi bên ngoài.
- Mong đợi: Tọa độ đúng; không cuộn khi vẽ trong canvas; phân biệt giả lập với thiết bị thật.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-03

- Tiền điều kiện: Canvas mới, chưa xuất.
- Bước: Tạo hơn 30 nét tách biệt; undo tới giới hạn; redo; undo một bước rồi vẽ nét mới.
- Mong đợi: Lịch sử giới hạn 30 snapshot; undo/redo đúng; nét mới bỏ redo cũ.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-04

- Tiền điều kiện: Có tranh dễ nhận diện.
- Bước: Chọn Xóa và hủy; kiểm tra tranh; chọn Xóa và đồng ý; vẽ nét mới.
- Mong đợi: Hủy giữ tranh; đồng ý xóa; vẽ tiếp được.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-05

- Tiền điều kiện: Có tranh có nét ở nhiều vị trí; cho phép download.
- Bước: Xuất PNG; lưu file làm artifact; mở ảnh và đối chiếu màu/nét/tỷ lệ với canvas.
- Mong đợi: File PNG hợp lệ, 1200×720 theo mã hiện tại, khớp tranh.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-06

- Tiền điều kiện: Có tranh chưa xuất; ghi URL hiện tại.
- Bước: Click link nội bộ rồi hủy; kiểm tra URL/tranh; lặp lại và đồng ý rời.
- Mong đợi: Hủy giữ URL/tranh; đồng ý chuyển tới đích.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-07

- Tiền điều kiện: Tạo lịch sử: trang khác → Studio → trang khác → Back về Studio; vẽ tranh chưa xuất.
- Bước: Thử Back/hủy, Forward/hủy; xác nhận tranh; lặp lại với đồng ý trên từng hướng có lịch sử.
- Mong đợi: Hủy giữ tranh/route; đồng ý đi đúng lịch sử; ghi riêng từng hướng.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-08

- Tiền điều kiện: Vẽ ít nhất hai nét tách biệt rồi xuất PNG.
- Bước: Thử rời/hủy khi không đổi tranh; undo rồi thử rời/hủy; redo về snapshot đã xuất; vẽ/xóa rồi thử lại.
- Mong đợi: Bản đã xuất không cảnh báo thừa; snapshot khác cảnh báo; quay về snapshot xuất bỏ cảnh báo.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-09

- Tiền điều kiện: Browser có tương tác người dùng; có tranh chưa xuất.
- Bước: Reload rồi chọn ở lại; kiểm tra tranh; thử đóng tab/ở lại; thử đồng ý rời trên bản tranh dùng để kiểm tra.
- Mong đợi: Cảnh báo theo browser; ở lại giữ tranh; đồng ý rời làm mất trạng thái; ghi từng nhánh và hạn chế browser.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-10

- Tiền điều kiện: Có tranh dễ nhận diện.
- Bước: Resize desktop; đổi hướng thiết bị; đặt viewport rộng 360px; dùng Tab/Enter/Space với toolbar.
- Mong đợi: Không mất nét/tràn ngang; công cụ thao tác được bằng bàn phím; ghi riêng từng nhánh.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.

### ST-11

- Tiền điều kiện: Mở Network, xóa request cũ, bật giữ log; dùng dữ liệu không nhạy cảm.
- Bước: Vẽ, undo/redo/xóa, xuất PNG; quan sát request do từng thao tác gây ra.
- Mong đợi: Không tự upload/nộp/đăng; lưu capture đã làm sạch, tách request auth nền khỏi thao tác Studio.
- Thực tế/minh chứng/người chạy: chưa bổ sung ở lượt bàn giao này; trạng thái theo ma trận trên.
