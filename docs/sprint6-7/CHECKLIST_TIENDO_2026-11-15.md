# Checklist tiến độ Sprint 6 — 15/11/2026

Đối chiếu mã `develop` commit `db0d61d`, kế hoạch Sprint6.docx và [Definition of Done](DEFINITION_OF_DONE.md). Dấu `[x]` chỉ xác nhận **bằng chứng được nêu**, không tự xác nhận nghiệm thu cả task. Các báo cáo test/deploy bên dưới là kết quả được ghi trong tài liệu bàn giao, không được chạy lại trong lượt này.

## Tích hợp và bằng chứng

- [x] PR #9 và PR #10 đã merge vào `develop`; PR #10 sửa router và khôi phục trang học dùng API thật (`8a54418`).
- [x] PR #12 bổ sung service/API tiến độ, quản trị, SQL và preflight (`b25d90a`, nội dung `8d0332e`).
- [x] DoD chi tiết S6-01–S6-15 đã có trong repository.
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
- [ ] Ghi SHA/env/schema thực tế, hoàn tất ma trận ca và hướng dẫn; backup/restore chưa có bằng chứng thực hiện theo tài liệu bàn giao.

### S6-12 — Release candidate

- [x] Các PR #9, #10, #12 đã merge vào `develop`.
- [ ] Chốt RC, reviewer, SHA triển khai, lỗi tồn, điều kiện bắt buộc và điểm có minh chứng; chưa tuyên bố release hoặc phần trăm hoàn thành.

### S6-13 — Studio

- [ ] Chưa thấy trang Studio thực trong các route đã rà; nút Studio ở dashboard đang disabled. Cần triển khai và nghiệm thu vẽ, tẩy, undo/redo, PNG và cảm ứng.

### S6-14 — Dashboard Khách

- [x] Có trang chủ Khách và catalog công khai.
- [ ] Đối chiếu đủ phạm vi dashboard Khách, CTA và liên kết Studio/xã hội demo, kiểm tra dữ liệu công khai và responsive.

### S6-15 — Xã hội demo

- [ ] Chưa thấy trang community trong các route đã rà; cần giao diện demo, nhãn dữ liệu mẫu, tương tác không lưu và bằng chứng không có request ghi.

## Kết quả kiểm tra ghi nhận trước đó

Tài liệu [REVIEW_FIXES_2026-11-14.md](REVIEW_FIXES_2026-11-14.md) báo build FE/BE, lint, frontend test 78/78 và backend 37/37, cùng một số smoke test dữ liệu thật. Đó là kết quả do nhóm ghi ngày 14/11; không khẳng định đã chạy lại trên commit `db0d61d` ngày 15/11. Tài liệu cũng ghi upload/Storage, E2E có đăng nhập, một số API quản trị và restore là NOT_RUN.

**Lượt rà soát này:** chỉ đọc mã, lịch sử Git và tài liệu; test, SQL, deployment và dữ liệu production không được thực thi/kiểm tra lại. Các ô chưa đủ bằng chứng tiếp tục để trống.
