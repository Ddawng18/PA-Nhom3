# LINEA — Hướng dẫn hoàn tất các giai đoạn còn lại

Tài liệu này là checklist thao tác cho các phần chưa đóng. Mỗi mục gồm việc cần làm, lệnh/kiểm tra và điều kiện nghiệm thu.

## 0. Quy tắc chung

- Không commit/push `.env`, `docs/docs2/`, `docs/PROJECT-CHANGES-AND-PLAN.md` hoặc file local.
- Không sửa trực tiếp dữ liệu production nếu chưa có backup.
- Không bật thanh toán thật trước khi sandbox entitlement và refund test đều qua.
- Mọi demo content phải có nhãn; không tạo testimonial giả.
- Mọi thay đổi schema phải có migration và được ghi lại.

---

## 1. M0 — Vận hành nền

### 1.1. Deploy backend và frontend

1. Xác nhận commit cần deploy trên `dang/develop`.
2. Deploy backend Render service `linea-api`.
3. Deploy frontend Vercel production.
4. Kiểm tra:

```powershell
curl.exe -s https://linea-api-6pw5.onrender.com/api/health
curl.exe -s https://linea-api-6pw5.onrender.com/api/health/preflight
curl.exe -s https://linea-api-6pw5.onrender.com/api/catalog/courses/4
```

Kỳ vọng:
- `health` trả `ok`;
- `preflight.ready = true`;
- course detail có `ket_qua`, `phan_hoi_mau`, `kieu_bia`;
- frontend production tải được home, courses, lesson, orders.

### 1.2. Cấu hình email lifecycle

Thêm vào Render environment:

```text
SMTP_HOST
SMTP_PORT=587
SMTP_FROM
SMTP_USER
SMTP_PASSWORD
SMTP_ENABLE_SSL=true
```

Nếu chỉ test local, dùng `EMAIL_OUTBOX_PATH=server/.data/outbox`.

Sau deploy, kiểm tra bảng `public.lifecycle_emails` có bản ghi sau khi:
- hoàn tất onboarding;
- hoàn thành bài đầu tiên;
- chấm bài.

Nếu không có SMTP, email được bỏ qua nhưng bản ghi dedupe vẫn được tạo.

### 1.3. Backup Supabase

1. Mở Supabase Dashboard → Database → Backups.
2. Xác nhận PITR/backup gần nhất.
3. Ghi ngày, loại backup, thời điểm restore gần nhất vào `docs/operations/PHASE-0-EVIDENCE.md`.
4. Thử restore trên project staging nếu có; không restore đè production.

### 1.4. Analytics baseline

Chọn một provider (ưu tiên giải pháp không lưu PII). Cần các event:

```text
visit
course_view
signup_started
signup_completed
onboarding_completed
lesson_started
lesson_completed
assignment_submitted
assignment_graded
studio_export_png
studio_export_gif
purchase_started
purchase_succeeded
```

Mỗi event cần: `event`, `timestamp`, `path`, `userId_hash` (nếu được phép), `courseId`, `lessonId`, `metadata` tối thiểu.

Không dùng localStorage làm nguồn KPI production.

### 1.5. Rollback rehearsal

1. Ghi lại deployment ID production hiện tại (Vercel) và commit đang chạy (Render).
2. Deploy một bản staging hoặc chọn bản trước đó.
3. Promote bản trước, chạy smoke:
   ```powershell
   node deploy/smoke.mjs https://<frontend> https://<api>
   ```
4. Rollback về bản hiện tại.
5. Ghi thời gian, người thực hiện, kết quả vào evidence.

---

## 2. M1 — Public proof

### 2.1. Usability 30 giây

Cho 3–5 người chưa biết LINEA xem trang chủ trong 30 giây, sau đó hỏi:

1. LINEA dạy gì?
2. Khóa học dành cho ai?
3. Bài học/portfolio nằm ở đâu?
4. Hành động đầu tiên nên bấm là gì?

Ghi lại câu trả lời. Nếu ≥4/5 người trả lời đúng 3/4 câu, coi như đạt.

### 2.2. Public UAT

- Home, catalog, course detail, teacher profile, pricing đã bỏ, community.
- Kiểm tra 390/768/1440px, không overflow.
- Kiểm tra mọi demo label và disclaimer.
- Kiểm tra `Học thử` mở đúng bài mẫu.
- Kiểm tra social metadata bằng thẻ debug Facebook/LinkedIn.

---

## 3. M2 — Learning loop

### 3.1. Tạo tài khoản test

Tạo tối thiểu:

- 2 student;
- 2 teacher;
- 1 admin;
- 1 tài khoản dùng cho thanh toán sandbox.

Ghi email test vào secret manager, không ghi vào repo.

### 3.2. Đo funnel

Từ analytics, tính:

```text
signup → first lesson = users with lesson_completed ÷ users with signup_completed
signup → first submission = users with assignment_submitted ÷ users with signup_completed
```

Mục tiêu:
- first lesson ≥45%;
- first submission ≥30%.

Nếu chưa có analytics, không được suy ra từ database page views.

### 3.3. Kiểm tra dashboard

- Cache: tải dashboard, ngắt API, reload → vẫn thấy dữ liệu cũ và nút làm mới.
- Timeout: chặn API >8 giây → hiện thông báo chậm.
- Next action: có bài gần hạn → ưu tiên bài đó; nếu không → khóa đang học.

---

## 4. M3 — Supply, authoring, community

### 4.1. Teacher/admin UAT

Dùng tài khoản demo:

1. Teacher tạo khóa mới từ template.
2. Sửa outcomes, phản hồi mẫu, cover style.
3. Xem preview.
4. Lưu nháp, gửi duyệt.
5. Admin duyệt.
6. Teacher tạo bản sửa từ khóa đã publish.
7. Admin duyệt bản sửa; xác nhận bản cũ bị ẩn.
8. Kiểm tra audit log và queue chấm bài.

### 4.2. Community moderation

1. Tạo một report từ tài khoản student.
2. Admin mở moderation, ẩn bài.
3. Xác nhận report được đánh dấu resolved và thời gian xử lý <24h.
4. Ghi ID report, thời gian tạo/xử lý.

### 4.3. Studio export metric

Hiện chưa có tracking. Cần thêm event `studio_export_png` và `studio_export_gif`, sau đó đo:

```text
first Studio export rate = users with export ÷ users with first lesson
```

Mục tiêu ≥20%. Không dùng localStorage làm KPI.

---

## 5. P4 — Monetization

### 5.1. Refund flow

Thiết kế đề xuất:

1. Thêm trạng thái `REFUNDED` vào order model và DB constraint.
2. Thêm endpoint admin `POST /api/admin/orders/{id}/refund`.
3. Chỉ cho refund đơn `SUCCEEDED`.
4. Gọi provider refund nếu sandbox hỗ trợ; nếu không, ghi nhận refund thủ công có lý do.
5. Thu hồi entitlement:
   - chuyển enrollment sang `DA_HUY` nếu chưa học;
   - hoặc giữ quyền học nếu chính sách cho phép, nhưng ghi rõ.
6. Ghi audit: actor, order, amount, reason, provider reference.
7. Thêm test:
   - refund đơn không tồn tại;
   - refund đơn chưa thanh toán;
   - refund hai lần;
   - refund làm mất entitlement đúng cách;
   - order vẫn hiển thị lịch sử.

### 5.2. Email lifecycle còn thiếu

Đã có welcome, first lesson, feedback. Cần thêm:

- **Incomplete course**: user có enrollment nhưng không hoàn thành bài trong 7 ngày.
- **Win-back**: không đăng nhập 30 ngày.

Cách làm:
1. Tạo endpoint nội bộ `POST /api/lifecycle/nudges` yêu cầu cron secret.
2. Query user đủ điều kiện, bỏ qua người đã nhận email cùng loại.
3. Dùng `lifecycle_emails` để dedupe theo `(user_id, kind, object_id)`.
4. Tạo Render Cron Job gọi endpoint mỗi ngày.
5. Ghi log số email gửi/bỏ qua/lỗi.

Không gửi email nếu user chưa xác nhận hoặc đã unsubscribe.

### 5.3. Paid pilot metrics

Đo:
- visitor → signup;
- signup → checkout;
- checkout → paid;
- refund rate;
- entitlement mismatch.

Mục tiêu M4:
- signup 5–7%;
- activated → paid 3–5%;
- refund <5%.

### 5.4. Creator clips / referral

Chỉ làm sau khi thanh toán và đo lường ổn định:
- Studio clip ngắn 5–10 giây;
- referral code có chống self-referral;
- showcase có moderation và consent.

---

## 6. P5 — Optimize

### 6.1. A/B test

Chỉ bắt đầu khi có analytics. Mỗi experiment cần:
- giả thuyết;
- biến thể;
- assignment ổn định theo user;
- primary metric;
- guardrail metric;
- sample size;
- thời gian dừng.

Thứ tự đề xuất:
1. Hero promise.
2. Primary CTA copy.
3. Course-card proof.
4. Checkout CTA placement trên course detail.

### 6.2. Core Web Vitals

Chạy Lighthouse trên:
- `/`;
- `/courses`;
- `/courses/4`;
- `/teachers/nmratist`;
- `/community`;
- `/login`.

Mục tiêu:
- LCP <2.5s;
- INP <200ms;
- CLS <0.1.

Ghi URL, thiết bị, mạng, thời điểm và ảnh báo cáo.

### 6.3. WCAG AA

- Chạy `npm run test:a11y` trước.
- Kiểm tra thủ công: keyboard, focus, screen reader, zoom 200%, contrast, form errors.
- Ghi lỗi critical/serious và người sửa.

### 6.4. Load test

Test tối thiểu:
- 100 concurrent catalog reads;
- 30 concurrent logins;
- 20 concurrent assignment submissions;
- 10 concurrent Studio exports (nếu có tracking).

Theo dõi p95, 5xx, CPU/RAM Render, kết nối Supabase. Không chạy load test vào production giờ cao điểm.

### 6.5. Uptime và rollback

- Bật uptime monitor cho `/api/health` và frontend.
- Ghi p95 API (loại trừ cold start).
- Thực hiện rollback rehearsal như M0.
- Ghi evidence vào `docs/operations/PHASE-5-EVIDENCE.md` nếu cần.

---

## 7. Thứ tự thực hiện đề xuất

1. Deploy backend/frontend mới.
2. Cấu hình SMTP và xác nhận lifecycle_emails.
3. Tạo tài khoản UAT + report + refund test.
4. Chốt M0/M1/M2/M3 evidence.
5. Implement refund và nudge emails.
6. Bật analytics, đo paid pilot.
7. Làm P5 A/B, CWV, WCAG, load test.
8. Chỉ mở real payment sau khi M4 đạt.

## 8. Lệnh kiểm tra nhanh

```powershell
npm run lint
npm test -- --run
npm run build
npm run test:public-proof
npm run test:learning-loop
npm run test:teacher-authoring
npm run test:a11y
dotnet build server/Linea.slnx --no-restore
dotnet test server/Linea.Api.Tests/Linea.Api.Tests.csproj --no-build
```

## 9. Điều kiện dừng

- Có ít nhất một lỗi P0/P1 chưa xử lý → không deploy tiếp.
- Entitlement hoặc refund sai → dừng thanh toán.
- Backup chưa xác nhận → không chạy migration phá hủy.
- Chưa có analytics → không kết luận KPI.
