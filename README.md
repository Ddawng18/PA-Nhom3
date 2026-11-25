# LINEA

**Nền tảng học vẽ kỹ thuật số trực tuyến** — khóa học có lộ trình, bài luyện, bài nộp, phản hồi và quản trị chất lượng trong một hệ thống duy nhất.

LINEA là đồ án nhóm 03 (PA-Nhom3) được xây dựng theo kiến trúc web hiện đại: React + TypeScript ở frontend, ASP.NET Core ở backend, Supabase cho dữ liệu và xác thực, Vercel/Render cho triển khai.

[![Frontend](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Vite-61DAFB?logo=react&logoColor=white)](#công-nghệ)
[![Backend](https://img.shields.io/badge/Backend-ASP.NET%20Core%209-512BD4?logo=dotnet&logoColor=white)](#công-nghệ)
[![Database](https://img.shields.io/badge/Database-Supabase-3FCF8E?logo=supabase&logoColor=white)](#công-nghệ)
[![Payment](https://img.shields.io/badge/Payment-ZaloPay%20Sandbox-0068FF)](#thanh-toán)

---

## Tổng quan

LINEA giải quyết bài toán học vẽ bị phân mảnh giữa video, tài liệu, nhóm chat và công cụ chấm bài. Nền tảng gom bốn vai trò vào cùng một quy trình:

| Actor | Có thể làm gì |
|---|---|
| **Guest** | Xem trang chủ, catalog, chi tiết khóa học, cộng đồng; dùng Studio cục bộ |
| **Student** | Đăng ký/đăng nhập, onboarding, giỏ hàng, thanh toán sandbox, học bài, nộp ảnh, xem điểm/tiến độ, cộng đồng |
| **Teacher** | Nộp hồ sơ/CV/tác phẩm, được duyệt, tạo/sửa khóa học, preview, tạo bản sửa, chấm bài |
| **Admin** | Duyệt giáo viên/khóa học, quản lý người dùng/khóa học, kiểm duyệt cộng đồng, audit |

## Tính năng chính

- **Khám phá công khai:** trang chủ, catalog, tìm kiếm/lọc, chi tiết khóa học, gallery tác phẩm, cộng đồng.
- **Tài khoản và phân quyền:** Supabase Auth, route guard theo vai trò, policy API, RLS.
- **Mua khóa học:** giỏ hàng nhiều khóa, quote giá ở server, ZaloPay Sandbox, order, hóa đơn.
- **Học tập:** bài học, tiến độ, bài tập, nộp ảnh, điểm và nhận xét.
- **Giảng dạy:** hồ sơ năng lực, CV, portfolio, template khóa học, editor chương/bài, preview, checklist, revision.
- **Quản trị:** duyệt hồ sơ, duyệt/xuất bản khóa học, quản lý người dùng, moderation, audit.
- **Studio:** vẽ trên trình duyệt, lưu cục bộ, xuất PNG/GIF.

## Công nghệ

| Lớp | Công nghệ |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Lucide, Zod |
| Backend | ASP.NET Core 9, Entity Framework Core, REST API |
| Dữ liệu | Supabase PostgreSQL, Supabase Auth, Supabase Storage, RLS |
| Thanh toán | ZaloPay Sandbox (không dùng tiền thật) |
| Kiểm thử | Vitest, Playwright, .NET test harness |
| Triển khai | Vercel (frontend), Render (API), Supabase (dữ liệu) |

## Kiến trúc

```text
Browser
  │
  ├── React + TypeScript + Vite (Vercel)
  │        │
  │        └── /api proxy hoặc VITE_API_URL
  │
  └── ASP.NET Core 9 API (Render)
           │
           ├── Supabase PostgreSQL + RLS
           ├── Supabase Auth
           ├── Supabase Storage
           └── ZaloPay Sandbox
```

## Cấu trúc repository

```text
.
├── src/                    # Frontend React/TypeScript
│   ├── auth/               # Auth, role, policy
│   ├── components/         # UI components
│   ├── context/            # Cart, auth contexts
│   ├── data/               # Static editor options/templates
│   ├── hooks/              # Data hooks
│   ├── lib/                # API clients, schemas, storage
│   ├── logic/              # Pure business logic
│   ├── pages/              # Route pages
│   └── styles/             # CSS theo miền
├── server/
│   ├── Linea.Api/          # ASP.NET Core API
│   └── Linea.Api.Tests/    # Backend test harness
├── supabase/               # Migration/seed/schema
├── tests/                  # Playwright browser tests
├── deploy/                 # Smoke/build/preflight scripts
├── docs/                   # Tài liệu kỹ thuật và vận hành
├── public/                 # Static assets
├── Dockerfile
├── render.yaml
└── package.json
```

## Yêu cầu môi trường

- Node.js **20.19+** hoặc **22.12+**
- .NET SDK **9**
- Tài khoản Supabase project của nhóm
- PowerShell/terminal có quyền chạy local server

## Chạy local

```powershell
git clone https://github.com/Ddawng18/PA-Nhom3.git
cd PA-Nhom3
npm ci
dotnet restore server/Linea.slnx
Copy-Item .env.example .env
```

Điền `.env` theo hướng dẫn tại [docs/development-setup.md](docs/development-setup.md). Không commit `.env` hoặc service key.

Chạy hai terminal:

```powershell
# Terminal 1 — API
npm run dev:api
```

```powershell
# Terminal 2 — Frontend
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:4174
- Preflight: http://localhost:4174/api/health/preflight

Nếu API báo lỗi kết nối, kiểm tra `VITE_API_URL`, `LOCAL_API_PROXY_TARGET` và `CLIENT_ORIGIN` trong `.env`.

## Biến môi trường

Các nhóm chính:

- **Frontend public:** `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`
- **Backend auth:** `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `AUTH_MODE`
- **Backend database:** `SUPABASE_DB_URL`, `RUN_MIGRATIONS=false`
- **Storage:** `SUPABASE_SERVICE_ROLE_KEY`, bucket variables
- **Payment:** `PAYMENT_MODE`, ZaloPay/VNPAY sandbox variables
- **Email:** `SMTP_*`, `EMAIL_OUTBOX_PATH`

Không đặt service role key, DB URL hoặc provider secret trong biến `VITE_*`.

## Scripts

| Lệnh | Mục đích |
|---|---|
| `npm run dev` | Frontend Vite |
| `npm run dev:api` | Backend ASP.NET Core |
| `npm run build` | Type-check và build frontend |
| `npm run build:deploy` | Build frontend cho deploy |
| `npm run lint` | ESLint toàn repo |
| `npm test` | Unit test Vitest |
| `npm run test:public-proof` | Public pages/scroll/SEO |
| `npm run test:cart` | Guest cart flow |
| `npm run test:learning-loop` | Onboarding → lesson → submission |
| `npm run test:teacher-authoring` | Template, preview, artwork |
| `npm run test:a11y` | Accessibility smoke |
| `dotnet test server/Linea.Api.Tests/Linea.Api.Tests.csproj` | Backend tests |

Một số browser test dùng Supabase/API thật và cần cấu hình tài khoản test; xem [docs/development-setup.md](docs/development-setup.md).

## Database và migration

- Schema nguồn nằm trong `supabase/` và `server/Linea.Api/Migrations/`.
- Trên database dùng chung, giữ `RUN_MIGRATIONS=false`; migration phải được review và áp dụng có kiểm soát.
- Trước khi deploy backend mới, kiểm tra schema production và chạy preflight.
- Không chạy migration phá hủy dữ liệu nếu chưa có backup.

Xem [docs/supabase-setup.md](docs/supabase-setup.md).

## Thanh toán

LINEA hiện hỗ trợ **ZaloPay Sandbox** và chế độ demo. Đây không phải thanh toán tiền thật:

- Không nhập thông tin thẻ/ngân hàng thật.
- Không kết luận thanh toán thành công chỉ từ redirect; phải xác minh callback/query.
- Order và entitlement được kiểm tra ở server.
- Trường hợp item không còn khả dụng sau thanh toán được đưa vào `PAID_REVIEW`.

Xem [docs/zalopay-sandbox.md](docs/zalopay-sandbox.md).

## Triển khai

- Frontend: Vercel, cấu hình `VITE_API_URL` trỏ API Render.
- Backend: Render, cấu hình DB/Supabase/payment theo `.env.example`.
- Database: Supabase project của nhóm.
- Smoke: `node deploy/smoke.mjs <frontend-url> <api-url>`.

Xem [docs/deployment.md](docs/deployment.md) và [docs/operations/RELEASE-ROLLBACK.md](docs/operations/RELEASE-ROLLBACK.md).

## Tài liệu

- [Thiết lập local](docs/development-setup.md)
- [Deployment](docs/deployment.md)
- [Supabase/Auth](docs/supabase-setup.md)
- [ZaloPay Sandbox](docs/zalopay-sandbox.md)
- [Teacher Profile API](docs/teacher-profile-api.md)
- [Release & Rollback](docs/operations/RELEASE-ROLLBACK.md)
- [Support & Moderation](docs/operations/SUPPORT-MODERATION-RUNBOOK.md)
- [Scale Plan](docs/operations/SCALE-PLAN.md)
- [Backend README](server/README.md)

## Nhóm thực hiện

| STT | Họ và tên | GitHub | MSSV | Vai trò |
|---:|---|---|---|---|
| 1 | Trần Đại Phát | loiz123 | 31241026754 | PM / Scrum Master |
| 2 | Nguyễn Huỳnh Đăng | Ddawng18 | 31241026574 | PO / BA |
| 3 | Lê Công Bảo | congbao2006 | 31241027834 | Backend / QA |
| 4 | Bành Phát Thịnh | Phát Thịnh | 31241022944 | Frontend |
| 5 | Nguyễn Lâm Sỹ Phú | Phunguyen11-02 | 31241020835 | Tech Lead / DevOps |

## Phạm vi và giới hạn

Đây là đồ án học tập. Những mục chưa nằm trong phạm vi MVP gồm thanh toán thật, chứng chỉ PDF tự động, kiểm thử tải quy mô lớn, ứng dụng native và đồng bộ Studio đám mây. Repoy này không dùng để thu tiền thật hoặc lưu dữ liệu người dùng thật.
