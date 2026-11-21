# DEPLOY-01 - Release, smoke test và rollback

## 1. Trước khi deploy

- [ ] `npm run lint`, `npm test -- --run`, `npm run build` pass.
- [ ] `dotnet build server/Linea.slnx --no-restore` pass.
- [ ] Migration mới đã backup và được review:
  - `supabase/migrations/20261121090000_community_likes_moderation.sql`
  - `supabase/migrations/20261121091000_workspace_query_indexes.sql`
  - `supabase/migrations/20261121092000_course_catalog_metadata.sql`
- Lưu ý lịch sử migration: remote có các version `20261104115545`, `20261104122006`,
  `20261105100739` không có file tương ứng trong repo. Trước lần `db push` sau,
  cần `supabase db pull` hoặc tạo placeholder tạm để đồng bộ lịch sử.
- Ngày 21/11/2026: 3 migration trên đã được áp lên project `pscjbvjcprvzfkawflql`
  sau khi backup dữ liệu các bảng liên quan.
- [ ] Biến môi trường Render/Vercel không chứa secret trong repo.
- [ ] Có commit/rollback point đã ghi lại.

## 2. Thứ tự deploy

1. Backup database Supabase.
2. Áp migration Supabase (theo CLI/dashboard của team).
3. Deploy backend Render; chờ `/api/health` trả `200`.
4. Deploy frontend Vercel.
5. Chạy smoke test:
   ```powershell
   node deploy/smoke.mjs https://pa-nhom3.vercel.app https://linea-api-6pw5.onrender.com
   ```
6. Kiểm tra thủ công: guest `/`, `/courses`, `/community`, `/studio`; student dashboard;
   teacher `/teacher`; admin `/admin` và `/admin/community`.

## 3. Smoke test tự động

`deploy/smoke.mjs` chỉ đọc, không ghi dữ liệu:

- Frontend trả HTML có `id="root"`.
- `GET /api/health` trả `status` ok/degraded và không 5xx.
- `GET /api/catalog/courses?page=1&pageSize=1` trả JSON có `items`.
- `GET /api/community/posts?page=1` trả mảng JSON.

## 4. Rollback

| Lớp | Cách rollback |
|---|---|
| Vercel | Deployments → chọn bản trước → Promote to Production |
| Render | Deploys → chọn bản trước → Deploy |
| Database | Chạy phần rollback trong `DATA-CLEANUP.md` hoặc phục hồi dump |
| Migration | `drop table community_post_likes, community_post_reports;` và bỏ cột `community_posts.status` nếu chưa có dữ liệu phụ thuộc; bỏ `khoa_hoc.thoi_luong/ngay_khai_giang`; drop các index trong migration index |

Không rollback bằng cách xóa dữ liệu người dùng thật. Nếu migration đã tạo dữ liệu mới,
ưu tiên giữ bảng và tắt tính năng qua frontend/API.

## 5. Tiêu chí rollback ngay

- Không đăng nhập được hoặc Supabase Auth lỗi.
- Lộ dữ liệu/IDOR hoặc report/notification hiển thị sai người.
- Ghi danh/thanh toán/bài nộp hỏng.
- Tỷ lệ lỗi API tăng mạnh hoặc `/api/health` 5xx kéo dài.
- Migration làm API 500 hàng loạt.

## 6. Sau deploy

- Ghi lại thời điểm, commit, người deploy.
- Theo dõi log Render/Vercel ít nhất 30 phút.
- Chạy lại UAT matrix trong roadmap mục 8.2.
