using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
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
public sealed partial class DemoOrdersController(
    AppDbContext db,
    LearningProgressService progress,
    VnPayPaymentService vnPay,
    ZaloPayPaymentService zaloPay,
    IConfiguration configuration) : ControllerBase
{
    public sealed record CreateOrder(long CourseId, [Required, StringLength(100, MinimumLength = 1)] string IdempotencyKey);
    public sealed record CreateCheckout(List<long>? CourseIds, [Required, StringLength(100, MinimumLength = 1)] string IdempotencyKey);
    public sealed record ConfirmOrder([Required] string Result);
    public sealed record CreateOrderResponse(long Id, long CourseId, string CourseTitle, long PriceVnd,
        string Status, DateTimeOffset CreatedAt, string? PaymentUrl, string PaymentProvider);
    public sealed class OrderRow
    {
        public long Id { get; set; }
        public long CourseId { get; set; }
        public string CourseTitle { get; set; } = "";
        public long PriceVnd { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public string PaymentProvider { get; set; } = "DEMO";
        public string? ProviderTransactionId { get; set; }
        public string? PaymentUrl { get; set; }
        [NotMapped]
        public List<OrderItemDto> Items { get; set; } = [];
    }

    public sealed class OrderItemDto
    {
        public long OrderId { get; set; }
        public long CourseId { get; set; }
        public string CourseTitle { get; set; } = "";
        public long PriceVnd { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} ORDER BY o.ma_don_hang DESC LIMIT 100
            """).ToListAsync(ct);
        if (rows.Count != 0)
        {
            var orderIds = string.Join(",", rows.Select(row => row.Id));
            var items = await db.Database.SqlQuery<OrderItemDto>($"""
                SELECT ma_don_hang AS "OrderId", ma_khoa_hoc AS "CourseId", ten_khoa_hoc AS "CourseTitle", don_gia_vnd AS "PriceVnd"
                FROM public.chi_tiet_don_hang WHERE ma_don_hang IN ({orderIds}) ORDER BY ma_don_hang, thu_tu
                """).ToListAsync(ct);
            foreach (var row in rows) row.Items = items.Where(item => item.OrderId == row.Id).ToList();
        }
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrder request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var paymentMode = PaymentMode;
        if (paymentMode is not ("DEMO" or "VNPAY_SANDBOX" or "ZALOPAY_SANDBOX"))
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new { code = "PAYMENT_MODE_UNSUPPORTED" });
        if (paymentMode == "VNPAY_SANDBOX" && !vnPay.IsConfigured)
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { code = "PAYMENT_NOT_CONFIGURED", detail = "VNPAY sandbox chưa được cấu hình đầy đủ." });
        if (paymentMode == "ZALOPAY_SANDBOX" && !zaloPay.IsConfigured)
            return StatusCode(503, new { code = "PAYMENT_NOT_CONFIGURED", detail = "ZaloPay sandbox chưa được cấu hình đầy đủ." });
        var key = request.IdempotencyKey?.Trim();
        if (string.IsNullOrEmpty(key) || key.Length > 100) return BadRequest(new { code = "INVALID_KEY" });
        await using var tx = await progress.BeginAsync(user, request.CourseId, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"order:{user}:{key}"}, 0))", ct);
        var existing = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} AND o.idempotency_key = {key}
            """).ToListAsync(ct);
        if (existing.Count != 0)
        {
            if (existing[0].CourseId != request.CourseId) return Conflict(new { code = "IDEMPOTENCY_CONFLICT" });
            await tx.CommitAsync(ct);
            return await CreateResponseAsync(existing[0], user, ct);
        }
        await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {request.CourseId} FOR UPDATE").ToListAsync(ct);
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.CourseId && x.Status == "DA_DANG", ct);
        if (course is null) return NotFound();
        if (course.PriceVnd <= 0) return BadRequest(new { code = "FREE_COURSE" });
        if (await db.CourseEnrollments.AnyAsync(e => e.UserId == user && e.CourseId == request.CourseId && e.Status != "DA_HUY", ct))
            return Conflict(new { code = "ALREADY_ENROLLED", detail = "Bạn đã ghi danh khóa học này." });
        var pending = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} AND o.ma_khoa_hoc = {request.CourseId}
              AND o.trang_thai = 'PENDING' AND o.payment_provider = {paymentMode}
              AND (o.payment_provider <> 'ZALOPAY_SANDBOX' OR o.ngay_tao > now() - interval '15 minutes')
            ORDER BY o.ma_don_hang DESC LIMIT 1
            """).ToListAsync(ct);
        if (pending.Count != 0)
        {
            await tx.CommitAsync(ct);
            return await CreateResponseAsync(pending[0], user, ct);
        }
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            INSERT INTO public.don_hang_demo (ma_nguoi_dung, ma_khoa_hoc, gia_vnd, trang_thai, idempotency_key, payment_provider)
            VALUES ({user}, {request.CourseId}, {course.PriceVnd}, 'PENDING', {key}, {paymentMode})
            RETURNING ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", {course.Title} AS "CourseTitle",
                      gia_vnd AS "PriceVnd", trang_thai AS "Status", ngay_tao AS "CreatedAt",
                      payment_provider AS "PaymentProvider", provider_transaction_id AS "ProviderTransactionId", payment_url AS "PaymentUrl"
            """).ToListAsync(ct);
        await tx.CommitAsync(ct);
        return await CreateResponseAsync(rows[0], user, ct);
    }

    [HttpPost("checkout")]
    public async Task<IActionResult> Checkout(CreateCheckout request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var courseIds = (request.CourseIds ?? []).Where(id => id > 0).Distinct().Take(20).ToList();
        if (courseIds.Count == 0) return BadRequest(new { code = "CART_EMPTY" });
        var paymentMode = PaymentMode;
        if (paymentMode is not ("DEMO" or "VNPAY_SANDBOX" or "ZALOPAY_SANDBOX"))
            return StatusCode(503, new { code = "PAYMENT_MODE_UNSUPPORTED" });
        if (paymentMode == "VNPAY_SANDBOX" && !vnPay.IsConfigured)
            return StatusCode(503, new { code = "PAYMENT_NOT_CONFIGURED" });
        if (paymentMode == "ZALOPAY_SANDBOX" && !zaloPay.IsConfigured)
            return StatusCode(503, new { code = "PAYMENT_NOT_CONFIGURED" });
        var key = request.IdempotencyKey?.Trim();
        if (string.IsNullOrEmpty(key) || key.Length > 100) return BadRequest(new { code = "INVALID_KEY" });

        await using var tx = await db.Database.BeginTransactionAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"order:{user}:{key}"}, 0))", ct);
        var existing = await db.Database.SqlQuery<OrderRow>($"""
            SELECT o.ma_don_hang AS "Id", o.ma_khoa_hoc AS "CourseId", k.tieu_de AS "CourseTitle",
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_nguoi_dung = {user} AND o.idempotency_key = {key}
            """).ToListAsync(ct);
        if (existing.Count != 0)
        {
            await tx.CommitAsync(ct);
            return await CreateResponseAsync(existing[0], user, ct);
        }

        var courses = await db.LearningCourses.AsNoTracking()
            .Where(course => courseIds.Contains(course.Id))
            .ToListAsync(ct);
        var unavailable = courseIds.Except(courses.Where(course => course.Status == "DA_DANG").Select(course => course.Id)).ToList();
        if (unavailable.Count != 0)
            return Conflict(new { code = "CART_CHANGED", unavailable });
        var enrolled = await db.CourseEnrollments.AsNoTracking()
            .Where(item => item.UserId == user && courseIds.Contains(item.CourseId) && item.Status != "DA_HUY")
            .Select(item => item.CourseId).ToListAsync(ct);
        if (enrolled.Count != 0)
            return Conflict(new { code = "ALREADY_ENROLLED", courseIds = enrolled });
        foreach (var id in courseIds)
            await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {id} FOR UPDATE").ToListAsync(ct);

        var total = courses.Sum(course => course.PriceVnd);
        var first = courses.First(course => course.Id == courseIds[0]);
        var provider = total == 0 ? "DEMO" : paymentMode;
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            INSERT INTO public.don_hang_demo (ma_nguoi_dung, ma_khoa_hoc, gia_vnd, trang_thai, idempotency_key, payment_provider)
            VALUES ({user}, {first.Id}, {total}, 'PENDING', {key}, {provider})
            RETURNING ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", {first.Title} AS "CourseTitle",
                      gia_vnd AS "PriceVnd", trang_thai AS "Status", ngay_tao AS "CreatedAt",
                      payment_provider AS "PaymentProvider", provider_transaction_id AS "ProviderTransactionId", payment_url AS "PaymentUrl"
            """).ToListAsync(ct);
        var order = rows[0];
        for (var index = 0; index < courseIds.Count; index++)
        {
            var course = courses.First(item => item.Id == courseIds[index]);
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                INSERT INTO public.chi_tiet_don_hang(ma_don_hang, ma_khoa_hoc, ten_khoa_hoc, don_gia_vnd, thu_tu)
                VALUES ({order.Id}, {course.Id}, {course.Title}, {course.PriceVnd}, {index + 1})
                """, ct);
        }
        if (total == 0)
        {
            var error = await FinalizePendingOrderAsync(tx, order, user, "SUCCEEDED", ct);
            if (error is not null) return Conflict(new { code = error });
            return Ok(new { id = order.Id, status = "SUCCEEDED", totalVnd = 0, items = courseIds });
        }
        await tx.CommitAsync(ct);
        return await CreateResponseAsync(order, user, ct);
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
                   o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_don_hang = {id} AND o.ma_nguoi_dung = {user} FOR UPDATE OF o
            """).ToListAsync(ct);
        if (orders.Count == 0) return NotFound();
        var order = orders[0];
        if (order.PaymentProvider != "DEMO") return Conflict(new { code = "SIMULATION_DISABLED" });
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
                   o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
            FROM public.don_hang_demo o
            JOIN public.khoa_hoc k ON k.ma_khoa_hoc = o.ma_khoa_hoc
            WHERE o.ma_don_hang = {id} FOR UPDATE OF o
            """).ToListAsync(ct);
        if (rows.Count == 0) return VnPayReply("01", "Order not found");
        var payment = rows[0];
        if (payment.PaymentProvider != "VNPAY_SANDBOX") return VnPayReply("01", "Order provider mismatch");
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
                       o.gia_vnd AS "PriceVnd", o.trang_thai AS "Status", o.ngay_tao AS "CreatedAt", o.payment_provider AS "PaymentProvider",
                   o.provider_transaction_id AS "ProviderTransactionId", o.payment_url AS "PaymentUrl"
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

    private async Task<IActionResult> CreateResponseAsync(OrderRow order, Guid user, CancellationToken ct)
    {
        if (order.PaymentProvider == "ZALOPAY_SANDBOX" && order.Status == "PENDING" && order.CreatedAt.AddMinutes(15) <= DateTimeOffset.UtcNow)
            return Conflict(new { code = "PAYMENT_ORDER_EXPIRED", detail = "Phiên ZaloPay đã quá 15 phút. Hãy tạo phiên thanh toán mới." });
        try
        {
            string? url = null;
            if (order.Status == "PENDING")
            {
                if (order.PaymentProvider == "VNPAY_SANDBOX")
                    url = vnPay.BuildPaymentUrl(order.Id, order.PriceVnd, GetClientIp());
                else if (order.PaymentProvider == "ZALOPAY_SANDBOX")
                    url = await ZaloPayUrlAsync(order, user, ct);
            }
            return Ok(new CreateOrderResponse(order.Id, order.CourseId, order.CourseTitle,
                order.PriceVnd, order.Status, order.CreatedAt, url, order.PaymentProvider));
        }
        catch (PaymentGatewayException e)
        {
            return StatusCode(502, new { code = e.Ambiguous ? "PAYMENT_RECONCILIATION_REQUIRED" : "PAYMENT_GATEWAY_REJECTED", detail = e.Message, orderId = order.Id });
        }
    }

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
        var items = await db.Database.SqlQuery<OrderItemRow>($"""
            SELECT ma_khoa_hoc AS "CourseId", ten_khoa_hoc AS "CourseTitle", don_gia_vnd AS "PriceVnd"
            FROM public.chi_tiet_don_hang WHERE ma_don_hang = {order.Id} ORDER BY thu_tu
            """).ToListAsync(ct);
        if (items.Count == 0)
            items = [new OrderItemRow { CourseId = order.CourseId, CourseTitle = order.CourseTitle, PriceVnd = order.PriceVnd }];
        var courseIds = items.Select(item => item.CourseId).Distinct().ToList();
        foreach (var courseId in courseIds)
        {
            await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {courseId} FOR UPDATE").ToListAsync(ct);
            await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"learner:{user}:{courseId}"}, 0))", ct);
        }
        if (result == "SUCCEEDED")
        {
            var available = await db.LearningCourses.AsNoTracking()
                .Where(course => courseIds.Contains(course.Id) && course.Status == "DA_DANG")
                .Select(course => course.Id).ToListAsync(ct);
            if (available.Count != courseIds.Count)
            {
                await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE public.don_hang_demo SET trang_thai = 'PAID_REVIEW', ngay_xac_nhan = now() WHERE ma_don_hang = {order.Id} AND trang_thai = 'PENDING'", ct);
                await tx.CommitAsync(ct);
                order.Status = "PAID_REVIEW";
                return "COURSE_UNAVAILABLE";
            }
            foreach (var courseId in courseIds)
            {
                var enrollment = await db.CourseEnrollments.SingleOrDefaultAsync(e => e.UserId == user && e.CourseId == courseId, ct);
                if (enrollment is null) db.CourseEnrollments.Add(new CourseEnrollment { UserId = user, CourseId = courseId });
                else if (enrollment.Status == "DA_HUY") { enrollment.Status = "DANG_HOC"; enrollment.CompletedAt = null; }
            }
            await db.SaveChangesAsync(ct);
            foreach (var courseId in courseIds)
                await progress.RefreshAsync(user, courseId, ct);
        }
        await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE public.don_hang_demo SET trang_thai = {result}, ngay_xac_nhan = now() WHERE ma_don_hang = {order.Id} AND trang_thai = 'PENDING'", ct);
        await tx.CommitAsync(ct);
        order.Status = result;
        return null;
    }

    private sealed class OrderItemRow
    {
        public long CourseId { get; set; }
        public string CourseTitle { get; set; } = "";
        public long PriceVnd { get; set; }
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
        public string PaymentProvider { get; set; } = "DEMO";
        public string? ProviderTransactionId { get; set; }
        public string? PaymentUrl { get; set; }
    }

    private IActionResult VnPayReply(string responseCode, string message) =>
        Ok(new { RspCode = responseCode, Message = message });
}
