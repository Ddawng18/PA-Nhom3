# Checklist DoD và bàn giao Sprint 6 — 16/11/2026

Baseline `develop`: `b8f160f` (PR #16). Tài liệu này ghi phạm vi và kết quả tại máy local, không coi việc có code hoặc PR là nghiệm thu hoàn tất. Các thay đổi trong PR cần review, kiểm thử trên bản tích hợp và xác nhận triển khai. Các kết quả có vai trò làm bằng chứng được ghi trong [nghiệm thu local](NGHIEM_THU_LOCAL_2026-11-16.md) và [thiết lập database](THIET_LAP_DATABASE_2026-11-16.md).

## Đối chiếu DoD

| Mã | Hiện trạng | Còn lại trước khi Done |
|---|---|---|
| S6-01 | Route học, catalog mới và điều hướng thành viên có trên working tree; tab Khám phá dùng `/courses`. | Chốt hợp đồng API, route trực tiếp, role, SHA và kiểm thử trên bản tích hợp. |
| S6-02 | Bucket bài nộp private; local đã nộp/xem ảnh qua backend và kiểm tra quyền. | Thay ảnh, quá hạn, lỗi Storage/DB, object tồn và xác nhận môi trường deploy. |
| S6-03 | API hồ sơ và chặn tự đổi role có mã/ca kiểm tra local. | Kiểm thử lưu/tải lại tên/avatar, lỗi lưu, đổi người dùng và quyền database trên bản tích hợp. |
| S6-04 | Lưu snapshot chương/bài/bài tập qua API đã chạy local. | Kiểm thử hai phiên đồng thời, attachment/media, rollback và rà quyền ghi cũ. |
| S6-05 | Danh mục mới dùng API, free enroll, học và paid gate có mã; admin có quyền học. | Kiểm tra context đăng nhập, filter/pagination, nội dung thật và tất cả ca từ chối trên bản tích hợp. |
| S6-06 | Luồng demo nộp/xem/chấm/sửa điểm đạt; đã sửa version timestamp và chặn ảnh học viên khi khóa bị ẩn. | Kiểm thử nộp/thay trước hạn, lỗi file/Storage, hai tab, thông báo và rollback đầy đủ. |
| S6-07 | D05 tính theo bài bắt buộc đã hoàn thành và bài tập bắt buộc đã nộp, không chờ chấm; UI tách % bài học và số bài tập. | Nghiệm thu riêng thời điểm nộp chưa chấm, bài tùy chọn, dữ liệu cũ và đồng bộ mọi màn. |
| S6-08 | Có API và trang quản lý cơ bản; test khóa/mở, ẩn/hiện và một số vai trò local. | Đối chiếu toàn bộ RLS, filter, conflict, lịch sử, review quyền/schema và giao diện. |
| S6-09 | Có phần code thanh toán mô phỏng từ giai đoạn trước; một số ca thành công/thất bại/hủy và idempotency đã chạy demo. | Người dùng đã ưu tiên phần ngoài thanh toán; chưa đủ nghiệm thu, còn UI đặt giá, kiểm tra đơn người khác, lỗi giao dịch và review bảo mật. Không coi là sẵn sàng bán khóa có phí. |
| S6-10 | Có một số trạng thái lỗi/loading/retry và kiểm tra quyền. | Rà code/traceId, timeout, mất phiên/quyền và lỗi mạng trên từng luồng. |
| S6-11 | Có preflight, ghi chú env và schema. | Ma trận yêu cầu–ca–evidence, hướng dẫn các vai trò, SHA/env/bucket triển khai và backup/restore thử riêng. |
| S6-12 | Các thay đổi trong PR, có kết quả build/test local. | Reviewer duyệt, tích hợp, chốt RC, SHA FE/BE/schema, lỗi tồn và quyết định phát hành. |
| S6-13 | 13 nhánh Studio browser local đạt, gồm PNG và touch giả lập. | Nghiệm thu cảm ứng trên thiết bị thật và reviewer xác nhận. |
| S6-14 | Catalog/chi tiết mới đã kiểm tra local với API demo thật. | Kiểm tra auth/CTA, privacy, lỗi/retry và responsive đầy đủ sau tích hợp. |
| S6-15 | Theo yêu cầu mới của người dùng, bài đăng Community lưu database thật; đọc công khai, đăng yêu cầu đăng nhập. | Chốt và review thay đổi phạm vi so với DoD cũ chỉ demo; kiểm thử quyền, nội dung công khai, lỗi và vận hành trước phát hành. Chưa có ảnh, sửa/xóa hoặc kiểm duyệt. |

## Kiểm tra đã chạy

- Backend `dotnet build server/Linea.slnx --no-restore`: PASS.
- Frontend `npm run lint`, `npm test` (86/86) và `npm run build`: PASS; build cảnh báo bundle lớn.
- Browser local: student chọn Khám phá từ Khóa học của tôi đi tới catalog mới; sidebar vẫn hiện.
- Những ca mạng khác là kết quả ghi trong [biên bản local](NGHIEM_THU_LOCAL_2026-11-16.md), trên working tree và môi trường demo tại thời điểm kiểm tra, không thay thế CI hay UAT.
- Bộ integration backend cần PostgreSQL test riêng có khả năng ghi/xóa dữ liệu; chưa chạy trên database demo chung.

## Database và rollout

- Hai migration `20261116092320_restrict_browser_learning_writes` và `20261116100757_community_posts` đã áp dụng trên project demo theo thông tin tại thời điểm kiểm tra. Trước khi chạy trên môi trường khác cần đối chiếu lịch sử migration/schema và backup; không chạy lại mù quáng.
- Bảng Community chỉ backend được ghi/đọc trực tiếp; endpoint backend cho phép khách đọc và người đã đăng nhập đăng. Cần quy trình xử lý nội dung vì đây là chức năng công khai có lưu thật.
- Backend phụ thuộc cột `khoa_hoc.gia_vnd` và bảng đơn demo từ SQL admin Sprint 6; xác nhận schema trước rollout. `SUPABASE_SERVICE_ROLE_KEY` chỉ cấu hình phía server, không ghi trong PR.
- Triển khai database/schema tương thích → backend → frontend → xác minh phiên bản và luồng; rollback ứng dụng giữ schema/dữ liệu, không xóa bảng hoặc dữ liệu cộng đồng.

## Tiếp nhận và điểm cần chốt

- Người thực hiện/reviewer cho từng mục, hạn xử lý và kết quả UAT cần nhóm xác nhận; các vai trò trong DoD là phân công kế hoạch, không phải xác nhận nghiệm thu.
- Review các kết quả quyền `SECURITY DEFINER`, RLS và hạn chế URL ảnh đã ký; restore thử database/Storage chỉ trên môi trường riêng.
- Xác nhận trạng thái các khóa và bài demo ID 12–15, bài đăng thử; không xóa hoặc chỉnh dữ liệu dùng chung tự động khi chưa đối chiếu.
- DoD gốc S6-15 và yêu cầu Community mới mâu thuẫn; cập nhật quyết định phạm vi chính thức trước khi chấm Done. Các chức năng ngoài thanh toán được ưu tiên; phần thanh toán chưa được chốt phát hành.
