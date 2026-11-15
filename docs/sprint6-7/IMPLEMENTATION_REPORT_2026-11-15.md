# Báo cáo triển khai Studio, trang Khách và Community demo

## Kết quả nghiệm thu mới — 15/11/2026

Mục này cập nhật các ghi chú NOT_RUN/lệnh không chạy ở bản bàn giao trước. Người dùng đã yêu cầu nghiệm thu và các kiểm tra local đã được thực hiện trên ef18bd4 (mã chức năng b8933d1).

- [x] Vitest 80/80, build và lint đạt; có log lưu kèm.
- [x] Đã chạy và lưu ảnh/trace/JSON các ca trình duyệt: tổng hợp 26 PASS local, 1 FAIL, 5 BLOCKED (gồm nhánh con; không phải 26 task đã Done).
- [x] Studio desktop: công cụ, lịch sử, PNG, guard link/Back/Forward/reload/đóng tab đã có bằng chứng.
- [x] Community: tương tác/reset/nhãn demo/360px và không request ghi đạt trong môi trường local; clipboard lỗi được giả lập rõ.
- [ ] Sửa S6-13-B01: tọa độ nét lệch ≈20.5px trên màn 360px; kiểm tra lại sau sửa.
- [ ] Nghiệm thu thiết bị cảm ứng thật; auth/catalog và dữ liệu riêng trên API thật; Đăng xác nhận duyệt nội dung.
- [ ] Reviewer xác nhận toàn DoD, tích hợp PR và xác nhận deploy; S6-13–15 vẫn REVIEW.

Xem [kết quả nghiệm thu và bằng chứng](KET_QUA_NGHIEM_THU_PR15_2026-11-15.md). Các mục NOT_RUN/REPORTED_UNVERIFIED cũ bên dưới là lịch sử nếu đã được kết quả mới thay thế; chỉ chuyển phần đã có minh chứng trong đúng phạm vi local.


Ngày lập/cập nhật: 15/11/2026 (UTC+7). Phạm vi báo cáo: PR [#15](https://github.com/Ddawng18/PA-Nhom3/pull/15), SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`, base `develop` tại `dffe155c4f2065ddfa2d7239111f1dce872b1f7e`. Trạng thái PR được kiểm tra lúc 12:31 UTC+7: **OPEN, chưa merge**. Trạng thái deploy không được kiểm tra.

PR #14 cùng head đã đóng nhưng chưa merge; PR #15 là PR đang mở được dùng để truy vết công việc này. Báo cáo này không xác nhận nghiệm thu Sprint 6.

## Công việc và liên kết DoD

### S6-13 — Studio (`/studio`)

- Có canvas Pointer Events, bút/tẩy, màu, cỡ nét, undo/redo giới hạn 30 snapshot, xóa có xác nhận và xuất PNG. Tham chiếu [DoD S6-13](DEFINITION_OF_DONE.md#s6-13--studio-vẽ-thịnhphú-sau-s6-01).
- Theo dõi snapshot đang hiển thị so với snapshot đã xuất. Vẽ, xóa hoặc undo/redo sang snapshot khác bản PNG sẽ đánh dấu chưa xuất; trở lại đúng snapshot đã xuất sẽ bỏ cảnh báo.
- `useBlocker` chặn điều hướng nội bộ và Back/Forward; `beforeunload` cảnh báo tải lại/đóng tab/rời website. Bản vẽ chỉ nằm trong bộ nhớ trang, không khôi phục sau khi rời trang.
- Thử tự động bằng Playwright + Chrome desktop: vẽ chuột, hủy điều hướng nội bộ để ở lại Studio, xuất rồi undo và thử điều hướng, và Back khi chưa xuất. Kết quả của lệnh Playwright được ghi ra console trong phiên làm việc nhưng **không lưu log hoặc ảnh đính kèm**; các phần đã chạy nhưng chưa đủ minh chứng lưu trữ ghi `REPORTED_UNVERIFIED`; phần chưa chạy giữ `NOT_RUN` trong [hồ sơ S6-13](evidence/S6-13/README.md).

### S6-14 — Trang Khách

- Trang Khách có CTA đăng ký, catalog, Studio và Community demo. Catalog vẫn dùng route/API hiện có; không thêm dữ liệu khóa học giả. Tham chiếu [DoD S6-14](DEFINITION_OF_DONE.md#s6-14--dashboard-khách-thịnh-sau-s6-0105).
- API công khai, auth, dữ liệu DOM, responsive 360px và lỗi/retry chưa được nghiệm thu; theo dõi trong [hồ sơ S6-14](evidence/S6-14/README.md).

### S6-15 — Community demo (`/community`, `/community/:postId`)

- Feed/chi tiết dùng nội dung và số tương tác mẫu có nhãn; thích/bình luận chỉ ở state của trang; tải lại đặt lại tương tác. Minh họa là khối màu CSS, không dùng ảnh bài nộp private. Tham chiếu [DoD S6-15](DEFINITION_OF_DONE.md#s6-15--ui-xã-hội-demo-thịnhđăng-sau-s6-01).
- Network, responsive, kiểm duyệt nội dung và tương tác trên thiết bị thật chưa được xác minh. Xem [hồ sơ S6-15](evidence/S6-15/README.md).

## Kết quả kiểm tra do tác giả báo cáo, chưa có artifact lưu kèm

Theo báo cáo cũ của tác giả, các lệnh dưới đây chạy trên working tree tương ứng mã `b8933d1`; lượt bàn giao này chưa xác minh độc lập working tree hoặc kết quả đó. Thời điểm bắt đầu Vitest hiển thị trong kết quả là 12:07:00 UTC+7 ngày 15/11/2026. Thời điểm kết thúc từng lệnh không được lưu riêng.

| Hạng mục | Kết quả được quan sát | Môi trường/thời điểm | Minh chứng lưu kèm |
|---|---|---|---|
| `npm test` | 15 files, 80/80 tests pass | Node v25.1.0, npm 11.6.2; khoảng 12:07 UTC+7, 15/11/2026 | Không; output chỉ còn trong phiên làm việc |
| `npm run build` | Thành công; có cảnh báo bundle JS >500 kB và annotation trong Zod | Cùng working tree mã chức năng theo báo cáo và môi trường trên | Không; output chỉ còn trong phiên làm việc |
| `npm run lint` | Thành công, không có lỗi/cảnh báo ở lượt cuối | Cùng working tree mã chức năng theo báo cáo và môi trường trên | Không; output chỉ còn trong phiên làm việc |
| `git diff --check` | Thành công | Cùng working tree mã chức năng theo báo cáo | Không; output chỉ còn trong phiên làm việc |
| Playwright + Google Chrome desktop | Luồng chuột, chặn/hủy điều hướng nội bộ, undo sau export và Back khi chưa xuất đã chạy; hộp thoại xuất hiện và thao tác hủy giữ trang Studio | macOS 26.6.2; Chrome 157.0.8103.51; Playwright `page` viewport mặc định 1280×720; khoảng 12:04–12:07 UTC+7, 15/11/2026 | Không có raw log hoặc ảnh đính kèm; ghi nhận này không thay thế evidence nghiệm thu |

Người chạy lệnh: thao tác được thực hiện trong phiên làm việc repository gắn với PR author `congbao2006`; không có log xác định cá nhân trực tiếp thao tác. Reviewer nghiệm thu: chưa được cung cấp/xác nhận. Phần đã được báo cáo chạy nhưng thiếu evidence lưu trữ ghi `REPORTED_UNVERIFIED`, không coi là PASS; phần chưa chạy ghi `NOT_RUN`.

## Giới hạn và trạng thái chưa xác minh

- Studio không lưu cloud, không tự upload/nộp bài/đăng feed. Người dùng cần tải PNG; sau reload/đóng tab không khôi phục được tranh. Hộp thoại rời trang phụ thuộc trình duyệt.
- Community là UI demo; dữ liệu tương tác chỉ ở bộ nhớ trang, không được trình bày như cộng đồng thật. Chưa có bằng chứng Network lưu kèm.
- Chưa nghiệm thu cảm ứng, resize/đổi hướng, 360px, bàn phím, reload/đóng tab, API catalog, luồng auth, hoặc người dùng/role khác.
- Chưa chạy SQL/migration, chưa kiểm tra deploy, SHA FE/BE đang chạy, Supabase/Storage hoặc dữ liệu production.
- Không gán PASS cho DoD chỉ từ build/lint/test hoặc từ việc có code.

## Tài liệu liên quan

- [Checklist tiến độ Sprint 6](CHECKLIST_TIENDO_2026-11-15.md)
- [Definition of Done](DEFINITION_OF_DONE.md)
- [Hướng dẫn Studio và Community](HUONG_DAN_STUDIO_COMMUNITY.md)
- [Evidence S6-13](evidence/S6-13/README.md), [S6-14](evidence/S6-14/README.md), [S6-15](evidence/S6-15/README.md)

## Quy ước phiên bản và kết quả bổ sung khi bàn giao

SHA mã chức năng được đối chiếu: `b8933d1`. Commit tài liệu trước lần hoàn thiện này: `18a44a5`. SHA của lần bàn giao tiếp theo lấy từ lịch sử Git; không gọi SHA mã chức năng là head hiện tại. Trạng thái PR ghi kèm thời điểm là thông tin lịch sử, cần đọc lại GitHub trước khi tích hợp.

`NOT_RUN`: chưa thực hiện. `REPORTED_UNVERIFIED`: tác giả báo cáo đã thực hiện nhưng thiếu minh chứng truy vết hoặc chưa được xác minh độc lập; không tính PASS. `PASS`/`FAIL`: có kết quả thực tế và bằng chứng gắn SHA/môi trường. `BLOCKED`: có trở ngại cụ thể. Ca có nhiều nhánh phải ghi riêng trạng thái từng nhánh; không dùng kết quả một nhánh cho cả ca.

Thông số máy, giờ và kết quả chạy cũ là thông tin do tác giả ghi trong báo cáo, chưa được reviewer xác minh độc lập. Lượt hoàn thiện tài liệu này không chạy test, trình duyệt, SQL hoặc deploy. Xem [bảng bàn giao và người phụ trách](BAN_GIAO_PR15_2026-11-15.md).
