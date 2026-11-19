using Linea.Api.Services;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

public sealed partial class DemoOrdersController
{
    private async Task<string?> ZaloPayUrlAsync(OrderRow order, Guid user, CancellationToken ct)
    {
        if (!zaloPay.IsConfigured) throw new PaymentGatewayException("ZaloPay sandbox chưa được cấu hình đầy đủ.");
        if (order.CreatedAt.AddMinutes(15) <= DateTimeOffset.UtcNow)
            throw new PaymentGatewayException("Đơn ZaloPay đã quá thời gian thanh toán. Kiểm tra trạng thái đơn trước khi tạo đơn mới.");
        var transaction = ZaloPayPaymentService.TransactionId(order.Id, order.CreatedAt);
        await using (var tx = await db.Database.BeginTransactionAsync(ct))
        {
            var rows = await db.Database.SqlQuery<OrderRow>($"""
                select o.ma_don_hang as "Id", o.ma_khoa_hoc as "CourseId", k.tieu_de as "CourseTitle",
                       o.gia_vnd as "PriceVnd", o.trang_thai as "Status", o.ngay_tao as "CreatedAt",
                       o.payment_provider as "PaymentProvider", o.provider_transaction_id as "ProviderTransactionId", o.payment_url as "PaymentUrl"
                from public.don_hang_demo o join public.khoa_hoc k on k.ma_khoa_hoc=o.ma_khoa_hoc
                where o.ma_don_hang={order.Id} and o.ma_nguoi_dung={user} for update of o
                """).ToListAsync(ct);
            var stored = rows.Single();
            if (stored.PaymentProvider != "ZALOPAY_SANDBOX") throw new PaymentGatewayException("Đơn không thuộc ZaloPay sandbox.");
            if (stored.PaymentUrl is not null && ZaloPayPaymentService.IsSandboxGateway(stored.PaymentUrl)) return stored.PaymentUrl;
            // shortcut: no create-by-id URL recovery, upgrade if ZaloPay adds one.
            if (stored.ProviderTransactionId is not null) return null;
            await db.Database.ExecuteSqlInterpolatedAsync($"update public.don_hang_demo set provider_transaction_id={transaction} where ma_don_hang={order.Id} and provider_transaction_id is null", ct);
            await tx.CommitAsync(ct);
        }
        var url = await zaloPay.CreateAsync(order.Id, user, order.PriceVnd, order.CreatedAt, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"update public.don_hang_demo set payment_url={url} where ma_don_hang={order.Id} and provider_transaction_id={transaction} and payment_url is null", ct);
        return url;
    }

    public sealed record ZaloPayCallback(string Data, string Mac, int Type);

    [HttpPost("/api/payments/zalopay/callback"), AllowAnonymous, RequestSizeLimit(65536)]
    public async Task<IActionResult> ZaloPayNotify(ZaloPayCallback request, CancellationToken ct)
    {
        if (request.Type != 1 || request.Data is null || request.Mac is null)
            return Ok(new { return_code = 2, return_message = "Invalid callback" });
        var payment = zaloPay.VerifyCallback(request.Data, request.Mac);
        if (payment is null) return Ok(new { return_code = 2, return_message = "Invalid signature or app" });
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var rows = await FindZaloPayOrderAsync(payment.TransactionId, ct);
        if (rows.Count != 1 || rows[0].PriceVnd != payment.Amount || rows[0].UserId.ToString("N") != payment.User)
            return Ok(new { return_code = 2, return_message = "Order mismatch" });
        var row = rows[0];
        if (row.Status == "SUCCEEDED") return Ok(new { return_code = 1, return_message = "Success" });
        if (row.Status != "PENDING") return Ok(new { return_code = 2, return_message = "Order finalized" });
        var error = await FinalizePendingOrderAsync(tx, AsOrder(row), row.UserId, "SUCCEEDED", ct);
        return Ok(new { return_code = error is null ? 1 : 2, return_message = error is null ? "Success" : "Order unavailable" });
    }

    [HttpPost("{id:long}/refresh")]
    public async Task<IActionResult> RefreshZaloPay(long id, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var rows = await db.Database.SqlQuery<PaymentOrderRow>($"""
            select o.ma_nguoi_dung as "UserId", o.ma_don_hang as "Id", o.ma_khoa_hoc as "CourseId",
                   k.tieu_de as "CourseTitle", o.gia_vnd as "PriceVnd", o.trang_thai as "Status", o.ngay_tao as "CreatedAt",
                   o.payment_provider as "PaymentProvider", o.provider_transaction_id as "ProviderTransactionId", o.payment_url as "PaymentUrl"
            from public.don_hang_demo o join public.khoa_hoc k on k.ma_khoa_hoc=o.ma_khoa_hoc
            where o.ma_don_hang={id} and o.ma_nguoi_dung={user} for update of o
            """).ToListAsync(ct);
        if (rows.Count != 1) return NotFound();
        var row = rows[0];
        if (row.PaymentProvider != "ZALOPAY_SANDBOX") return BadRequest(new { code = "PROVIDER_MISMATCH" });
        if (row.Status != "PENDING") return Ok(AsOrder(row));
        try
        {
            var transactionId = row.ProviderTransactionId ?? ZaloPayPaymentService.TransactionId(row.Id, row.CreatedAt);
            var result = await zaloPay.QueryAsync(transactionId, ct);
            if (result.Failed)
            {
                var failed = AsOrder(row);
                await FinalizePendingOrderAsync(tx, failed, user, "FAILED", ct);
                return Ok(failed);
            }
            if (!result.Succeeded) return Ok(AsOrder(row)); // A redirect or an unknown/pending result never grants enrollment.
            if (result.Amount != row.PriceVnd) return Conflict(new { code = "PAYMENT_AMOUNT_MISMATCH" });
            var order = AsOrder(row);
            var error = await FinalizePendingOrderAsync(tx, order, user, "SUCCEEDED", ct);
            return error is null ? Ok(order) : Conflict(new { code = error });
        }
        catch (PaymentGatewayException e) { return StatusCode(502, new { code = "PAYMENT_GATEWAY_UNAVAILABLE", detail = e.Message }); }
    }

    private Task<List<PaymentOrderRow>> FindZaloPayOrderAsync(string transactionId, CancellationToken ct) =>
        db.Database.SqlQuery<PaymentOrderRow>($"""
            select o.ma_nguoi_dung as "UserId", o.ma_don_hang as "Id", o.ma_khoa_hoc as "CourseId",
                   k.tieu_de as "CourseTitle", o.gia_vnd as "PriceVnd", o.trang_thai as "Status", o.ngay_tao as "CreatedAt",
                   o.payment_provider as "PaymentProvider", o.provider_transaction_id as "ProviderTransactionId", o.payment_url as "PaymentUrl"
            from public.don_hang_demo o join public.khoa_hoc k on k.ma_khoa_hoc=o.ma_khoa_hoc
            where o.provider_transaction_id={transactionId} and o.payment_provider='ZALOPAY_SANDBOX' for update of o
            """).ToListAsync(ct);

    private static OrderRow AsOrder(PaymentOrderRow row) => new()
    {
        Id = row.Id, CourseId = row.CourseId, CourseTitle = row.CourseTitle, PriceVnd = row.PriceVnd,
        Status = row.Status, CreatedAt = row.CreatedAt, PaymentProvider = row.PaymentProvider,
        ProviderTransactionId = row.ProviderTransactionId, PaymentUrl = row.PaymentUrl,
    };
}
