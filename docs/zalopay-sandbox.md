# ZaloPay sandbox

Luồng dùng API ZaloPay v2 sandbox: tạo đơn ở backend → chuyển sang cổng ZaloPay
(có lựa chọn quét QR) → callback hoặc truy vấn trạng thái → cấp quyền học trong
cùng giao dịch cập nhật đơn. Không thu tiền thật. Chỉ hỗ trợ sandbox.

## Chuẩn bị

Cần **app sandbox riêng** với App ID, Key1 và Key2. Đăng ký qua hướng dẫn chính thức
tại https://developers.zalopay.vn/v2/start/ và quản lý app tại https://sbmc.zalopay.vn.
Thông tin dùng chung trong tài liệu chỉ để thử cục bộ, không bật cho website công khai:
người khác cũng biết các khóa này và có thể ký callback giả.

## Schema trước khi triển khai backend

Áp dụng migration `supabase/migrations/20261119031331_payment_sandbox_provider.sql`
trên đúng database của API. Đây là thay đổi bổ sung ba cột và chỉ mục, giữ nguyên
đơn cũ với provider `DEMO`, giữ RLS và thu hồi quyền Data API. **Cần migration cả
khi giữ DEMO**, vì bản backend mới đọc provider của đơn. Không bật toàn bộ
`RUN_MIGRATIONS` trên database chung chỉ để chạy thay đổi này.

Khi dựng database mới, SQL admin được backend nhúng cũng tạo các cột tương ứng.

## Biến môi trường

Điền trong `.env` khi chạy local, hoặc Environment của service Render khi triển khai:

```dotenv
PAYMENT_MODE=ZALOPAY_SANDBOX
ZALOPAY_APP_ID=<appid-sandbox-rieng>
ZALOPAY_KEY1=<mac-key>
ZALOPAY_KEY2=<callback-key>
ZALOPAY_CALLBACK_URL=https://linea-api-6pw5.onrender.com/api/payments/zalopay/callback
ZALOPAY_RETURN_PAGE_URL=https://pa-nhom3.vercel.app/orders
```

Local có thể dùng `ZALOPAY_RETURN_PAGE_URL=http://localhost:5173/orders`; callback
vẫn cần HTTPS truy cập được từ bên ngoài và trỏ tới **đúng backend** xử lý đơn.
Đăng ký callback/redirect trong app sandbox; nếu dùng tunnel local, cập nhật callback
và cấu hình app theo URL tunnel. Không đặt key trong Vercel hoặc biến `VITE_*`.

`render.yaml` giữ `PAYMENT_MODE=DEMO` để app chưa có khóa riêng tiếp tục hoạt động.
Sau khi điền đủ khóa riêng, đổi mode trong Render, redeploy và kiểm tra:

```powershell
Invoke-RestMethod https://linea-api-6pw5.onrender.com/api/health/preflight
```

Cần `payment.mode=ZALOPAY_SANDBOX`, `zalopaySandboxConfigured=true` và `ready=true`.
Đây chỉ là kiểm tra cấu hình; vẫn cần chạy luồng thanh toán sandbox bên dưới.

## Kiểm tra

1. Chọn khóa có giá mà tài khoản thử chưa ghi danh. Tạo đơn và tới cổng ZaloPay sandbox.
2. Thanh toán bằng phương thức thử theo hướng dẫn của ZaloPay; không dùng ví/tiền thật.
3. Khi quay về lịch sử đơn, frontend yêu cầu backend truy vấn trạng thái; nếu còn chờ,
   bấm **Kiểm tra trạng thái**. Chỉ `SUCCEEDED` sau callback hợp lệ hoặc query thành công
   với số tiền đúng mới cấp quyền học.
4. Gửi lại callback: không tạo ghi danh trùng. Chữ ký sai, app sai, user hoặc số tiền sai
   không được cấp quyền; query trả `3` giữ chờ, `2` ghi thất bại.
5. Đơn gắn provider từ lúc tạo; `/confirm` DEMO không xác nhận đơn ZaloPay, kể cả đổi mode.
6. Phiên quá 15 phút tạo phiên mới khi người dùng mua lại; đơn cũ được giữ để đối chiếu,
   không coi redirect hoặc đồng hồ frontend là bằng chứng đã thanh toán.

Kiểm tra chữ ký và giao thức không cần database:

```powershell
dotnet run --project server/Linea.Api.Tests -- --payment-unit
```

API tạo/query cố định ở `https://sb-openapi.zalopay.vn/v2/create` và `/v2/query`.
Nguồn: https://developers.zalopay.vn/v2/general/overview.html và
https://docs.zalopay.vn/docs/specs/callback-api/.

## Vận hành

Không thay bộ App ID/khóa khi còn đơn chờ của app cũ; đối chiếu các đơn đó trước
khi đổi cấu hình. Không tự xác nhận thành công để xử lý lỗi cổng thanh toán.
Nếu tạo đơn bị timeout, xem lịch sử/kiểm tra trạng thái trước khi thử lại.
Rollback ứng dụng giữ schema và dữ liệu; không drop các cột hoặc xóa đơn.

Đợt kiểm tra 19/11/2026: app thử công khai hiện hành tạo đơn và query được (query
trả trạng thái chờ); trang checkout sandbox hiển thị bảo trì. Chưa xác minh thanh
toán ví thật trên sandbox. Test callback thành công là mô phỏng có ký khóa thử ở
backend local, không phải giao dịch do ví ZaloPay xác nhận.
