# Tài liệu LINEA

Đây là chỉ mục tài liệu kỹ thuật và vận hành của LINEA.

## Bắt đầu

- [Thiết lập local](development-setup.md)
- [Triển khai](deployment.md)
- [Supabase/Auth](supabase-setup.md)
- [ZaloPay Sandbox](zalopay-sandbox.md)

## API và nghiệp vụ

- [Hồ sơ giáo viên và duyệt](teacher-profile-api.md)

## Vận hành

- [Release và rollback](operations/RELEASE-ROLLBACK.md)
- [Support và moderation](operations/SUPPORT-MODERATION-RUNBOOK.md)
- [Scale và performance](operations/SCALE-PLAN.md)

## Quy ước

- Không đưa `.env`, service role key, DB URL hoặc secret thanh toán vào Git.
- Migration phải được review trước khi áp dụng lên database dùng chung.
- Thanh toán hiện chỉ ở chế độ Sandbox/DEMO, không thu tiền thật.
- Báo cáo sprint, Gantt và tài liệu nội bộ không thuộc public product docs.
