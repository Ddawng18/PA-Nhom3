# Checklist tiến độ Sprint 6 — 15/11/2026

Baseline rà mã S6-01–12: `develop` commit `db0d61d`; nhánh tích hợp được kiểm tra lại ở `dffe155`. Phần S6-13–15 đối chiếu mã `b8933d1` trên PR #15 và bộ tài liệu bàn giao `fa2a9de`, cùng kế hoạch Sprint6.docx và [Definition of Done](DEFINITION_OF_DONE.md). Dấu `[x]` chỉ xác nhận **bằng chứng được nêu**, không tự xác nhận nghiệm thu cả task. Không chạy lại test hoặc kiểm tra deploy trong lượt cập nhật checklist này.

## Cập nhật sau bàn giao tài liệu

- [x] Đã push bộ tài liệu hoàn thiện tại commit [fa2a9de](https://github.com/Ddawng18/PA-Nhom3/commit/fa2a9defc5e523b7997cc5a205012dfbefcaeb6e) lên nhánh PR #15; tại lượt cập nhật checklist ngày 15/11, PR vẫn OPEN, chưa merge.
- [x] Hoàn thiện báo cáo, checklist, hướng dẫn, ba hồ sơ ca và [bản bàn giao PR #15](BAN_GIAO_PR15_2026-11-15.md): tổng cộng 7 file.
- [x] Bổ sung tiền điều kiện, bước thực hiện và mong đợi cho 26 ca: Studio 11, trang Khách 7, Community 8. Đây là kế hoạch ca, không phải 26 ca đã PASS.
- [x] Tách `REPORTED_UNVERIFIED` khỏi `NOT_RUN`; kết quả chạy cũ chưa có artifact không được tính là nghiệm thu đạt.
- [x] Sửa 3 liên kết mục DoD; kiểm tra 7 file UTF-8 và 38 liên kết tương đối tại commit bàn giao không phát hiện lỗi; `git diff --check` đạt.
- [x] Có bảng người phụ trách/reviewer/hạn đề xuất cho phần nghiệm thu và bàn giao tiếp theo.
- [ ] Phát xác nhận người nhận, reviewer, năng lực và hạn thực tế; bảng phân công hiện vẫn là đề xuất.
- [ ] Có chỉ định chạy nghiệm thu trước khi thực thi các ca còn lại; giữ yêu cầu hiện hành không chạy test.
- [ ] Bổ sung kết quả thực tế và artifact theo từng nhánh ca; reviewer đối chiếu toàn bộ DoD.
- [ ] Tích hợp PR #15 và xác nhận SHA triển khai thực tế. S6-13–15 vẫn REVIEW, chưa DONE.

## Tích hợp và bằng chứng

- [x] PR #9 và PR #10 đã merge vào `develop`; PR #10 sửa router và khôi phục trang học dùng API thật (`8a54418`).
- [x] PR #12 bổ sung service/API tiến độ, quản trị, SQL và preflight (`b25d90a`, nội dung `8d0332e`).
- [x] DoD chi tiết S6-01–S6-15 đã có trong repository.
- [x] PR #15 chứa S6-13–S6-15 trên SHA mã chức năng `b8933d1f841a25be77e12d91930a5e6f8d45a304`, base `develop` (`dffe155c4f2065ddfa2d7239111f1dce872b1f7e`); GitHub xác nhận OPEN/ chưa merge lúc 12:31 UTC+7 ngày 15/11. Trạng thái cần kiểm tra lại trước bàn giao.
- [x] PR #14 cùng head đã đóng nhưng chưa merge; PR #15 là yêu cầu review đang mở. Không ghi nhận PR merge vào `develop`.
- [ ] Xác nhận SHA FE/BE đang chạy trên Vercel/Render trùng bản dự kiến; chưa kiểm tra deploy hiện tại.
- [ ] Review/kiểm chứng đầy đủ các tiêu chí DoD và lưu minh chứng tương ứng; không đánh Done cả task chỉ dựa vào PR đã merge.

## Checklist từng task

### S6-01 — Nền tích hợp

- [x] Có route Khách/catalog, trang học, tiến độ, bài tập và chấm trong mã sau PR #10.
- [ ] Đối chiếu hợp đồng API/fixture và xác minh các route trên một bản triển khai tích hợp.

### S6-02 — Storage bài tập

- [x] Có khởi tạo Storage theo nhu cầu và xử lý thiếu cấu hình; có script bucket private.
- [x] Tài liệu bàn giao ghi bucket `assignment-submissions` đã tạo private ngày 14/11; đây là bằng chứng lịch sử, chưa kiểm tra lại.
- [ ] Kiểm tra upload/xem/thay ảnh, quyền ảnh và lỗi Storage trên môi trường thật.

### S6-03 — Hồ sơ

- [x] Có API đọc/lưu tên/avatar và cập nhật header/sidebar sau lưu trong mã.
- [ ] Xác minh lưu thực tế, cách ly người dùng và chặn sửa role/trạng thái trên database; script `deploy/sprint6-api-write-permissions.sql` được bàn giao ghi là chưa áp dụng.

### S6-04 — Editor

- [x] Có API snapshot/version, ghi nội dung theo ID hiện có, transaction và API media.
- [ ] Xác minh lưu/xóa/sắp xếp, attachment, hai request đồng thời và rollback với schema/Storage thật; kiểm tra quyền ghi browser sau triển khai.

### S6-05 — Catalog, ghi danh và học

- [x] Có catalog công khai, API ghi danh và trang học trong mã tích hợp.
- [ ] Nghiệm thu toàn luồng và tìm/lọc/phân trang; paid gate phụ thuộc S6-09, không mở bán khóa có giá khi chưa hoàn tất.

### S6-06 — Nộp, chấm, xem kết quả

- [x] Có mã nộp ảnh, chấm/sửa điểm, lịch sử và giao diện liên quan.
- [ ] Chạy luồng nộp/thay/chấm/xem ảnh thật và kiểm tra quyền, hạn, conflict, thông báo.

### S6-07 — Tiến độ và hoàn thành

- [x] `LearningProgressService.EvaluateAsync` dùng số bài tập đã nộp để xác định hoàn thành, không yêu cầu đã chấm; có SQL D05 và ProgressController trong PR #12.
- [x] Bàn giao ngày 14/11 báo SQL D05 đã áp dụng và có smoke test service; chưa kiểm tra lại độc lập trong lượt này.
- [ ] Đối chiếu UI/dashboard/learning và xác minh đầy đủ ca nộp chưa chấm, dữ liệu cũ và cập nhật sau deploy.

### S6-08 — Quản trị

- [x] PR #12 bổ sung API quản lý người dùng, khóa/mở, ẩn/hiện khóa, schema/RLS và active-account handler.
- [ ] Xác minh UI quản trị tương ứng, các API với token thật, phiên cũ và lịch sử/audit. Nhánh 501 dự phòng vẫn tồn tại trong `AdminController`, cần kiểm tra điều kiện cấu hình thực tế.

### S6-09 — Thanh toán demo

- [x] Có mã admin đọc đơn và schema đơn demo trong PR #12; không đồng nghĩa checkout đã hoàn thành.
- [ ] Hoàn thiện/kiểm chứng giá, tạo đơn, checkout, confirm idempotent, paid gate, lịch sử và nhãn không thu tiền thật.

### S6-10 — Lỗi và trạng thái UI

- [x] Có xử lý lỗi conflict/Storage và một số trạng thái loading/retry trong mã.
- [ ] Đối chiếu đầy đủ lỗi/code/traceId và trạng thái loading/rỗng/retry/mất quyền cho S6-02–09.

### S6-11 — Bàn giao và vận hành

- [x] Có `deploy/preflight.ps1`, API preflight, SQL kiểm tra và tài liệu bàn giao.
- [x] Phần tài liệu riêng của PR #15 đã có hướng dẫn, 26 ca với bước tái hiện và bảng bàn giao tại `fa2a9de`; không đồng nghĩa hoàn tất ma trận hoặc vận hành toàn Sprint.
- [ ] Ghi SHA/env/schema thực tế, hoàn tất ma trận ca và hướng dẫn; backup/restore chưa có bằng chứng thực hiện theo tài liệu bàn giao.

### S6-12 — Release candidate

- [x] Các PR #9, #10, #12 đã merge vào `develop`.
- [x] Có bản bàn giao review PR #15, ghi SHA mã/tài liệu, trạng thái và việc còn lại; chưa merge, chưa chốt RC.
- [ ] Chốt RC, reviewer, SHA triển khai, lỗi tồn, điều kiện bắt buộc và điểm có minh chứng; chưa tuyên bố release hoặc phần trăm hoàn thành.

### S6-13 — Studio

- [x] Đọc mã PR #15 xác nhận route `/studio`, canvas Pointer Events, bút/tẩy/màu/cỡ nét, undo/redo giới hạn, xóa có xác nhận, PNG, snapshot đã xuất và guard nội bộ/Back-Forward/unload. Đây là xác nhận hiện diện mã, không phải nghiệm thu toàn DoD.
- [x] Đã soạn ST-01–ST-11 với tiền điều kiện/bước/mong đợi, hướng dẫn sử dụng và giới hạn lưu tranh.
- [ ] Có kết quả thao tác chuột/export/undo/điều hướng trong phiên Chrome desktop nhưng chưa có raw log/ảnh đính kèm; chưa đủ điều kiện nghiệm thu; ghi REPORTED_UNVERIFIED cho phần đã báo cáo chạy. Cảm ứng, resize, bàn phím, reload/đóng tab là `NOT_RUN`.
- [ ] Evidence theo từng ca và giới hạn: [evidence S6-13](evidence/S6-13/README.md). Task ở REVIEW, chưa DONE.

### S6-14 — Dashboard Khách

- [x] Có trang chủ Khách và catalog công khai.
- [x] Đọc mã PR #15 xác nhận CTA đăng ký/catalog cùng liên kết Studio và Community demo trên trang Khách.
- [x] Đã soạn GH-01–GH-07 với tiền điều kiện/bước/mong đợi và biểu mẫu kết quả.
- [ ] API public, anonymous/auth, dữ liệu riêng trong response/DOM, 360px, loading/empty/error/retry chưa có evidence nghiệm thu; xem [evidence S6-14](evidence/S6-14/README.md). Task ở REVIEW, chưa DONE.

### S6-15 — Xã hội demo

- [x] Đọc mã PR #15 xác nhận `/community`, `/community/:postId`, nội dung mẫu, nhãn demo, tương tác trong state trang, bài không tồn tại và ảnh minh họa CSS.
- [x] Đã soạn CM-01–CM-08 với tiền điều kiện/bước/mong đợi, gồm Network và duyệt nội dung/nguồn minh họa.
- [ ] Network, tải lại reset, responsive, nội dung được duyệt và kiểm tra bài viết/tương tác trên thiết bị chưa có evidence nghiệm thu; xem [evidence S6-15](evidence/S6-15/README.md). Task ở REVIEW, chưa DONE.

## Kết quả kiểm tra ghi nhận trước đó

Tài liệu [REVIEW_FIXES_2026-11-14.md](REVIEW_FIXES_2026-11-14.md) báo build FE/BE, lint, frontend test 78/78 và backend 37/37, cùng một số smoke test dữ liệu thật. Đó là kết quả do nhóm ghi ngày 14/11; không khẳng định đã chạy lại trên commit `db0d61d` ngày 15/11. Tài liệu cũng ghi upload/Storage, E2E có đăng nhập, một số API quản trị và restore là NOT_RUN.

**Cập nhật tài liệu theo PR #15:** bằng chứng triển khai, trạng thái PR và kết quả các lệnh đã chạy được ghi tại [báo cáo triển khai](IMPLEMENTATION_REPORT_2026-11-15.md). Ca chưa chạy giữ `NOT_RUN`; phần đã báo cáo chạy nhưng thiếu log/ảnh truy vết ghi `REPORTED_UNVERIFIED`; không suy ra nghiệm thu từ việc có mã hoặc build pass. Tài liệu này không xác nhận deploy, SQL/migration, dữ liệu production hay hoàn tất S6-13–15.

Hướng dẫn thao tác: [Studio và Community demo](HUONG_DAN_STUDIO_COMMUNITY.md). Hồ sơ ca: [S6-13](evidence/S6-13/README.md), [S6-14](evidence/S6-14/README.md), [S6-15](evidence/S6-15/README.md). Chỉ chuyển task khỏi REVIEW sau khi PR được tích hợp, các tiêu chí bắt buộc có evidence, và reviewer xác nhận.

## Quy ước phiên bản và kết quả bổ sung khi bàn giao

SHA mã chức năng được đối chiếu: `b8933d1`. Bộ tài liệu ban đầu: `18a44a5`; bộ tài liệu hoàn thiện và bàn giao: `fa2a9de`. Commit cập nhật checklist tiếp theo lấy từ lịch sử Git; không gọi SHA mã chức năng là head hiện tại. Trạng thái PR ghi kèm thời điểm là thông tin lịch sử, cần đọc lại GitHub trước khi tích hợp.

`NOT_RUN`: chưa thực hiện. `REPORTED_UNVERIFIED`: tác giả báo cáo đã thực hiện nhưng thiếu minh chứng truy vết hoặc chưa được xác minh độc lập; không tính PASS. `PASS`/`FAIL`: có kết quả thực tế và bằng chứng gắn SHA/môi trường. `BLOCKED`: có trở ngại cụ thể. Ca có nhiều nhánh phải ghi riêng trạng thái từng nhánh; không dùng kết quả một nhánh cho cả ca.

Thông số máy, giờ và kết quả chạy cũ là thông tin do tác giả ghi trong báo cáo, chưa được reviewer xác minh độc lập. Lượt hoàn thiện tài liệu này không chạy test, trình duyệt, SQL hoặc deploy. Xem [bảng bàn giao và người phụ trách](BAN_GIAO_PR15_2026-11-15.md).
