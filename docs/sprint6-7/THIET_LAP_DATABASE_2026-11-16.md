# Thiết lập database và Storage Sprint 6–7

Ngày kiểm tra: 16/11/2026 (UTC+7). Môi trường: backend chạy local, kết nối PostgreSQL/Supabase demo bằng cấu hình `.env`. Không ghi key, token hoặc chuỗi kết nối vào tài liệu này.

## Cập nhật Storage sau khi bổ sung key

Backend local đã khởi động lại và preflight trả `database.connected=true`, `database.schema.ready=true`, `storage.configured=true`, `storage.available=true`, không thiếu biến bắt buộc. Dùng Storage API với key server thử tải một PNG 1×1 vào `assignment-submissions`: HTTP 200; truy cập đường dẫn public không kèm token trả HTTP 400; xóa object kiểm thử trả HTTP 200. Đây là smoke test Storage API, chưa phải nghiệm thu qua form và quyền xem ảnh giữa các vai trò.

## Cập nhật Supabase MCP — bảo vệ ghi danh và tiến độ

- Đã áp dụng migration `20261116092320_restrict_browser_learning_writes` trên project demo; bản SQL trong `supabase/migrations/20261116092320_restrict_browser_learning_writes.sql`.
- Hai bảng `ghi_danh` và `tien_do_bai_hoc` có policy restrictive chặn INSERT/UPDATE/DELETE từ `anon` và `authenticated`; backend giữ đường ghi qua kết nối server. SELECT của người đăng nhập còn yêu cầu tài khoản không bị khóa. Policy cũ vẫn được giữ để có thể khôi phục khi cần.
- Test với tài khoản student: đọc ghi danh và tiến độ qua Data API HTTP 200; thử INSERT trực tiếp vào mỗi bảng HTTP 403; thử UPDATE ghi danh trực tiếp không sửa dòng nào. Tám policy hiện diện trong `pg_policies`. Chưa test UPDATE/DELETE tiến độ, tài khoản bị khóa hoặc luồng ghi backend sau migration.
- Rollback: gỡ đúng tám policy có tên trong migration bằng migration mới; không xóa dữ liệu, không khôi phục quyền ghi trừ khi đã xử lý lại paid gate. Migration áp dụng từ MCP đã được đồng bộ version với tên file local.
- Security Advisor còn cảnh báo một số hàm SECURITY DEFINER thực thi được qua API và tính năng bảo vệ mật khẩu rò rỉ đang tắt. Các policy SELECT permissive khác cũng cần rà riêng; việc chặn ghi hai bảng không khẳng định toàn bộ phân quyền đã hoàn tất.

## Kết quả kiểm tra

| Hạng mục | Kết quả |
|---|---|
| Kết nối PostgreSQL | PASS; PostgreSQL 17.11 |
| Các bảng `nguoi_dung`, `khoa_hoc`, `chuong`, `bai_hoc`, `bai_tap`, `bai_nop`, `ket_qua_cham`, `ghi_danh`, `don_hang_demo`, `tep_dinh_kem_bai_hoc`, `tieu_chi_cham_diem` | Có bảng; chưa kiểm tra toàn bộ cột/ràng buộc |
| Cột `khoa_hoc.gia_vnd`, `visibility_version`; `nguoi_dung.is_locked`, `lock_version` | Có |
| RLS ở `nguoi_dung`, `khoa_hoc`, `don_hang_demo` | Đã bật; bật RLS không đồng nghĩa mọi policy đã đạt |
| `assignment-submissions` | Có, private, giới hạn 10 MiB, MIME JPEG/PNG/WEBP |
| `course-media` | Có, public; bucket chưa đặt giới hạn dung lượng hoặc MIME |
| `course-attachments` | Có, private; bucket chưa đặt giới hạn dung lượng hoặc MIME |
| Preflight backend | Schema và Storage trả ready sau khi bổ sung key; xem cập nhật phía trên |

Kiểm tra ban đầu chỉ đọc metadata; thay đổi mới nhất được ghi ở mục cập nhật phía trên. Các giới hạn file của `course-media` và `course-attachments` hiện được backend kiểm tra; chưa xác nhận mọi đường ghi khác đều bị chặn.

## Cấu hình local

Đã bổ sung các biến còn thiếu sau vào `.env` local, giữ nguyên các biến đã có:

```dotenv
ASSIGNMENT_STORAGE_BUCKET=assignment-submissions
SUPABASE_MEDIA_BUCKET=course-media
SUPABASE_ATTACHMENTS_BUCKET=course-attachments
PAYMENT_MODE=DEMO
```

`SUPABASE_SERVICE_ROLE_KEY` được cấu hình trong `.env` local. Với môi trường khác, điền key server-side hợp lệ qua secret manager và khởi động lại API. Không đưa key này vào biến `VITE_*`, Git hoặc tài liệu. Frontend chỉ dùng key công khai tương ứng.

Chạy backend với migration tắt, sau đó gọi `deploy/preflight.ps1 -ApiBase http://localhost:4174` hoặc `GET /api/health/preflight` tại địa chỉ backend thực tế. Cần kiểm tra cả `database.schema.ready` và `storage.available`: `status=ok` riêng lẻ chưa bảo đảm Storage sẵn sàng.

## Quyền và việc còn lại

- `anon` còn table-level INSERT/UPDATE trên `nguoi_dung`; đã bật RLS và trong các policy đã đọc không thấy policy INSERT cho bảng này. Không suy ra có thể ghi từ grant riêng lẻ; cần kiểm tra quyền thực tế bằng token và review trước khi thu hồi.
- `authenticated` có policy UPDATE hồ sơ của chính mình và quyền cập nhật `display_name`, `avatar_url`; cần đối chiếu luồng đang triển khai trước khi chạy `deploy/sprint6-api-write-permissions.sql`, vì script thu hồi cả quyền ghi trực tiếp và có thể ảnh hưởng frontend cũ.
- Các policy đọc `khoa_hoc` hiện có nhiều policy permissive; cần review cách chúng kết hợp với policy kiểm tra tài khoản bị khóa. Chưa xác nhận các ca khóa/ẩn bằng token thật.
- Bộ SQL `supabase/20261114110000_assignment_storage.sql`, `20261114111000_course_editor_rubrics.sql`, `20261114120000_admin_management.sql` và `20261114121000_progress_completion_rule.sql` là tài liệu triển khai; sự tồn tại của bảng/cột không chứng minh toàn bộ script đã áp dụng. Đối chiếu từng constraint, policy, function và index trước khi chạy lại; tránh chạy toàn bộ lịch sử EF lên database chung.
- Thiếu test upload/xem/thay ảnh, quyền ảnh và cleanup khi database lỗi; chưa có kết quả backup/restore trên môi trường riêng. Không coi phần này là đã nghiệm thu.
- Khi phát hành, kiểm tra và cập nhật riêng cấu hình backend thực tế, SHA và schema; thay đổi `.env` local không tự áp dụng lên Render/Vercel.

## Bằng chứng liên quan

Kiểm tra HTTP trước đó đã tạo khóa demo ID 12 và đơn demo ID 1 trong database dùng chung; chúng được gắn nhãn `TEST DEMO`. Các thay đổi code và cấu hình local chưa được triển khai từ xa.
