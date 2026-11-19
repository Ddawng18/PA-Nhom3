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
6. Backend lưu `app_trans_id` trước khi gọi API tạo đơn. Nếu request timeout hoặc mất
   phản hồi, lần thử sau không gửi `create` lần nữa: đơn vẫn chờ đối soát và người dùng
   có thể truy vấn trạng thái. Log chỉ ghi action và mã đơn giao dịch, không ghi khóa hay
   payload thanh toán. Một mã giao dịch đã được lưu nhưng chưa có URL là dấu hiệu phiên
   có thể đã được ZaloPay tạo.
7. Hết 15 phút, frontend chỉ hiển thị “Quá hạn · chờ đối soát”; backend không kết luận
   thất bại chỉ dựa vào đồng hồ. Nút kiểm tra vẫn truy vấn ZaloPay để xử lý callback muộn.
   Tạo đơn mới sau khi hết hạn giữ nguyên đơn cũ để đối chiếu. Redirect không phải bằng
   chứng thanh toán.

Kiểm tra chữ ký và giao thức không cần database:

```powershell
dotnet run --project server/Linea.Api.Tests -- --payment-unit
```

API tạo/query cố định ở `https://sb-openapi.zalopay.vn/v2/create` và `/v2/query`.
Nguồn: https://developers.zalopay.vn/v2/general/overview.html và
https://docs.zalopay.vn/docs/specs/callback-api/.

## Bảo đảm và giới hạn

- Create và query ký HMAC-SHA256 theo canonical input ZaloPay; callback dùng Key2.
- Callback/query cập nhật trạng thái đơn và ghi danh trong cùng transaction DB, với
  khóa đơn và khóa người học/khóa học để chống cập nhật đồng thời. Chỉ backend xác nhận
  thành công mới cấp quyền học.
- Query `1` chỉ hoàn tất khi số tiền khớp; `3` giữ trạng thái chờ; `2` ghi thất bại.
- Sau timeout tạo phiên, không thể khôi phục URL cổng nếu phản hồi bị mất. Hệ thống giữ
  transaction ID và cho phép query/đối soát, tránh tạo phiên thứ hai. Nếu ZaloPay chưa
  nhận request thì đơn có thể tiếp tục chờ; xử lý thủ công cần tra soát theo mã này.
- Đơn quá 15 phút vẫn có thể được xác nhận nếu callback hợp lệ hoặc query xác nhận đã
  thanh toán; redirect và thời gian ở trình duyệt không làm thay đổi trạng thái.
- Migration cần áp dụng thủ công đúng database backend trước khi chạy bản mới:
  `supabase/migrations/20261119031331_payment_sandbox_provider.sql`. Không bật toàn bộ
  migration để áp dụng riêng thay đổi này. Schema giữ đơn cũ provider `DEMO`, RLS và
  quyền Data API bị thu hồi.
- Chạy kiểm tra giao thức bằng `dotnet run --project server/Linea.Api.Tests -- --payment-unit`.
  Các callback thành công được ký/mô phỏng trong test không chứng minh ví ZaloPay thật
  đã thanh toán. Sandbox có thể không ổn định và không hỗ trợ kết luận về giao dịch thật.

## Vận hành

Không thay bộ App ID/khóa khi còn đơn chờ của app cũ; đối chiếu các đơn đó trước
khi đổi cấu hình. Không tự xác nhận thành công để xử lý lỗi cổng thanh toán.
Nếu tạo đơn bị timeout, xem lịch sử/kiểm tra trạng thái trước khi thử lại.
Rollback ứng dụng giữ schema và dữ liệu; không drop các cột hoặc xóa đơn.

Đợt kiểm tra 19/11/2026: app thử công khai hiện hành tạo đơn và query được (query
trả trạng thái chờ); trang checkout sandbox hiển thị bảo trì. Chưa xác minh thanh
toán ví thật trên sandbox. Test callback thành công là mô phỏng có ký khóa thử ở
backend local, không phải giao dịch do ví ZaloPay xác nhận.
