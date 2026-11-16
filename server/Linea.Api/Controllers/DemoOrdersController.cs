using System.ComponentModel.DataAnnotations;
using System.Globalization;
using System.Net;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/demo-orders"), Authorize(Policy = AuthPolicies.LearnerAccess)]
public sealed class DemoOrdersController(
    AppDbContext db,
    LearningProgressService progress,
    VnPayPaymentService vnPay,
    IConfiguration configuration) : ControllerBase
{
    public sealed record CreateOrder(long CourseId, [Required, StringLength(100, MinimumLength = 1)] string IdempotencyKey);
    public sealed record ConfirmOrder([Required] string Result);
    public sealed record CreateOrderResponse(long Id, long CourseId, string CourseTitle, long PriceVnd,
        string Status, DateTimeOffset CreatedAt, string? PaymentUrl);
    public sealed class OrderRow
    {
        public long Id { get; set; }
        public long CourseId { get; set; }
        public string CourseTitle { get; set; } = "";
        public long PriceVnd { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} ORDER BY o.ma_don_hang DESC LIMIT 100
            """).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrder request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var paymentMode = PaymentMode;
        if (paymentMode is not ("DEMO" or "VNPAY_SANDBOX"))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "PAYMENT_MODE_UNSUPPORTED" });
        if (paymentMode == "VNPAY_SANDBOX" && !vnPay.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { code = "PAYMENT_NOT_CONFIGURED", detail = "VNPAY sandbox chưa được cấu hình đầy đủ." });
        var key = request.IdempotencyKey?.Trim();
        if (string.IsNullOrEmpty(key) || key.Length > 100) return BadRequest(new { code = "INVALID_KEY" });
        await using var tx = await progress.BeginAsync(user, request.CourseId, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"order:{user}:{key}"}, 0))", ct);
        var existing = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} AND o.idempotency_key = {key}
            """).ToListAsync(ct);
        if (existing.Count != 0)
            return existing[0].CourseId == request.CourseId ? Ok(ToCreateResponse(existing[0], paymentMode)) : Conflict(new { code = "IDEMPOTENCY_CONFLICT" });
        await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {request.CourseId} FOR UPDATE").ToListAsync(ct);
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.CourseId && x.Status == "DA_DANG", ct);
        if (course is null) return NotFound();
        if (course.PriceVnd <= 0) return BadRequest(new { code = "FREE_COURSE" });
        if (await db.CourseEnrollments.AnyAsync(e => e.UserId == user && e.CourseId == request.CourseId && e.Status != "DA_HUY", ct))
            return Conflict(new { code = "ALREADY_ENROLLED", detail = "Bạn đã ghi danh khóa học này." });
        var pending = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} AND o.ma_khoa_hoc = {request.CourseId}
              AND o.trang_thai = 'PENDING'
            ORDER BY o.ma_don_hang DESC LIMIT 1
            """).ToListAsync(ct);
        if (pending.Count != 0) return Ok(ToCreateResponse(pending[0], paymentMode));
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            INSERT INTO public.don_hang_demo (ma_nguoi_dung, ma_khoa_hoc, gia_vnd, trang_thai, idempotency_key)
            VALUES ({user}, {request.CourseId}, {course.PriceVnd}, 'PENDING', {key})
            RETURNING ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", {course.Title} AS "CourseTitle",
                      gia_vnd AS "PriceVnd", trang_thai AS "Status", ngay_tao AS "CreatedAt"
            """).ToListAsync(ct);
        await tx.CommitAsync(ct);
        return Ok(ToCreateResponse(rows[0], paymentMode));
    }

    [HttpPost("{id:long}/confirm")]
    public async Task<IActionResult> Confirm(long id, ConfirmOrder request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        if (PaymentMode != "DEMO") return Conflict(new { code = "SIMULATION_DISABLED" });
        if (request.Result is not ("SUCCEEDED" or "FAILED" or "CANCELLED")) return BadRequest(new { code = "INVALID_RESULT" });
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var orders = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_don_hang = {id} AND o.ma_nguoi_dung = {user} FOR UPDATE OF o
            """).ToListAsync(ct);
        if (orders.Count == 0) return NotFound();
        var order = orders[0];
        if (order.Status != "PENDING") return order.Status == request.Result ? Ok(order) : Conflict(new { code = "ORDER_FINAL" });
        var error = await FinalizePendingOrderAsync(tx, order, user, request.Result, ct);
        if (error is not null) return Conflict(new { code = error });
        return Ok(order);
    }

    [HttpGet("/api/payments/vnpay/ipn"), AllowAnonymous]
    public async Task<IActionResult> VnPayIpn(CancellationToken ct)
    {
        if (!vnPay.IsConfigured) return VnPayReply("99", "VNPAY is not configured");
        if (!vnPay.HasValidSignature(Request.Query) ||
            !vnPay.HasMatchingTerminal(Request.Query["vnp_TmnCode"].ToString()))
            return VnPayReply("97", "Invalid signature");
        if (!long.TryParse(Request.Query["vnp_TxnRef"], NumberStyles.None, CultureInfo.InvariantCulture, out var id))
            return VnPayReply("01", "Order not found");

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var rows = await db.Database.SqlQuery<PaymentOrderRow>($"""
            SELECT o.ma_nguoi_dung AS "UserId", o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId",
                   k.tieu_de AS "CourseTitle", o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status",
                   o.ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_don_hang = {id} FOR UPDATE OF o
            """).ToListAsync(ct);
        if (rows.Count == 0) return VnPayReply("01", "Order not found");
        var payment = rows[0];
        if (!long.TryParse(Request.Query["vnp_Amount"], NumberStyles.None, CultureInfo.InvariantCulture, out var amount) ||
            amount != checked(payment.PriceVnd * 100))
            return VnPayReply("04", "Invalid amount");

        var result = Request.Query["vnp_ResponseCode"] == "00" && Request.Query["vnp_TransactionStatus"] == "00"
            ? "SUCCEEDED"
            : Request.Query["vnp_ResponseCode"] == "24" ? "CANCELLED" : "FAILED";
        if (payment.Status != "PENDING")
            return payment.Status == result ? VnPayReply("00", "Confirm Success") : VnPayReply("02", "Order already confirmed");

        var order = new OrderRow
        {
            Id = payment.Id, CourseId = payment.CourseId, CourseTitle = payment.CourseTitle,
            PriceVnd = payment.PriceVnd, Status = payment.Status, CreatedAt = payment.CreatedAt,
        };
        var error = await FinalizePendingOrderAsync(tx, order, payment.UserId, result, ct);
        return error is null ? VnPayReply("00", "Confirm Success") : VnPayReply("01", "Order cannot be completed");
    }

    [HttpGet("/api/payments/vnpay/return"), AllowAnonymous]
    public async Task<IActionResult> VnPayReturn(CancellationToken ct)
    {
        long? orderId = null;
        var parsedId = 0L;
        var valid = vnPay.IsConfigured && vnPay.HasValidSignature(Request.Query) &&
            vnPay.HasMatchingTerminal(Request.Query["vnp_TmnCode"].ToString()) &&
            long.TryParse(Request.Query["vnp_TxnRef"], NumberStyles.None, CultureInfo.InvariantCulture, out parsedId);
        if (valid)
        {
            orderId = parsedId;
            var order = await db.Database.SqlQuery<OrderRow>($"""
                SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                       o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt"
                FROM public.don_hang_demo o
                JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
                WHERE o.ma_don_hang = {orderId.Value}
                """).ToListAsync(ct);
            valid = order.Count != 0 &&
                long.TryParse(Request.Query["vnp_Amount"], NumberStyles.None, CultureInfo.InvariantCulture, out var amount) &&
                amount == checked(order[0].PriceVnd * 100);
        }
        var result = !valid ? "vnpay_invalid" : "vnpay_return";
        return Redirect(vnPay.ReturnPageUrl(valid ? orderId : null, result));
    }

    private string PaymentMode => (configuration["PAYMENT_MODE"] ?? "DEMO").Trim().ToUpperInvariant();

    private CreateOrderResponse ToCreateResponse(OrderRow order, string paymentMode) => new(
        order.Id, order.CourseId, order.CourseTitle, order.PriceVnd, order.Status, order.CreatedAt,
        paymentMode == "VNPAY_SANDBOX" && order.Status == "PENDING"
            ? vnPay.BuildPaymentUrl(order.Id, order.PriceVnd, GetClientIp())
            : null);

    private string GetClientIp()
    {
        var address = HttpContext.Connection.RemoteIpAddress;
        if (address is null || IPAddress.IsLoopback(address)) return "127.0.0.1";
        return address.IsIPv4MappedToIPv6 ? address.MapToIPv4().ToString() : address.ToString();
    }

    private async Task<string?> FinalizePendingOrderAsync(
        Microsoft.EntityFrameworkCore.Storage.IDbContextTransaction tx,
        OrderRow order,
        Guid user,
        string result,
        CancellationToken ct)
    {
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"learner:{user}:{order.CourseId}"}, 0))", ct);
        await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {order.CourseId} FOR UPDATE").ToListAsync(ct);
        if (result == "SUCCEEDED")
        {
            if (!await db.LearningCourses.AnyAsync(c => c.Id == order.CourseId && c.Status == "DA_DANG", ct)) return "COURSE_UNAVAILABLE";
            var enrollment = await db.CourseEnrollments.SingleOrDefaultAsync(e => e.UserId == user && e.CourseId == order.CourseId, ct);
            if (enrollment is null) db.CourseEnrollments.Add(new CourseEnrollment { UserId = user, CourseId = order.CourseId });
            else if (enrollment.Status == "DA_HUY") { enrollment.Status = "DANG_HOC"; enrollment.CompletedAt = null; }
            await db.SaveChangesAsync(ct);
            await progress.RefreshAsync(user, order.CourseId, ct);
        }
        await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE public.don_hang_demo SET trang_thai = {result}, ngay_xac_nhan = now() WHERE ma_don_hang = {order.Id} AND trang_thai = 'PENDING'", ct);
        await tx.CommitAsync(ct);
        order.Status = result;
        return null;
    }

    private sealed class PaymentOrderRow
    {
        public Guid UserId { get; set; }
        public long Id { get; set; }
        public long CourseId { get; set; }
        public string CourseTitle { get; set; } = "";
        public long PriceVnd { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    private IActionResult VnPayReply(string responseCode, string message) =>
        Ok(new { RspCode = responseCode, Message = message });
}
