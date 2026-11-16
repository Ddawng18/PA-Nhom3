using System.ComponentModel.DataAnnotations;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/demo-orders"), Authorize(Policy = AuthPolicies.LearnerAccess)]
public sealed class DemoOrdersController(AppDbContext db, LearningProgressService progress) : ControllerBase
{
    public sealed record CreateOrder(long CourseId, [Required, StringLength(100, MinimumLength = 1)] string IdempotencyKey);
    public sealed record ConfirmOrder([Required] string Result);
    public sealed class OrderRow
    {
        public long Id { get; set; }
        public long CourseId { get; set; }
        public long PriceVnd { get; set; }
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    [HttpGet]
    public async Task<IActionResult> List(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            SELECT ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", gia_vnd AS "PriceVnd",
                   trang_thai AS "Status", ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo WHERE ma_nguoi_dung = {user} ORDER BY ma_don_hang DESC LIMIT 100
            """).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateOrder request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        var key = request.IdempotencyKey?.Trim();
        if (string.IsNullOrEmpty(key) || key.Length > 100) return BadRequest(new { code = "INVALID_KEY" });
        await using var tx = await progress.BeginAsync(user, request.CourseId, ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"order:{user}:{key}"}, 0))", ct);
        var existing = await db.Database.SqlQuery<OrderRow>($"""
            SELECT ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", gia_vnd AS "PriceVnd",
                   trang_thai AS "Status", ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo WHERE ma_nguoi_dung = {user} AND idempotency_key = {key}
            """).ToListAsync(ct);
        if (existing.Count != 0)
            return existing[0].CourseId == request.CourseId ? Ok(existing[0]) : Conflict(new { code = "IDEMPOTENCY_CONFLICT" });
        await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {request.CourseId} FOR UPDATE").ToListAsync(ct);
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.CourseId && x.Status == "DA_DANG", ct);
        if (course is null) return NotFound();
        if (course.PriceVnd <= 0) return BadRequest(new { code = "FREE_COURSE" });
        var rows = await db.Database.SqlQuery<OrderRow>($"""
            INSERT INTO public.don_hang_demo (ma_nguoi_dung, ma_khoa_hoc, gia_vnd, trang_thai, idempotency_key)
            VALUES ({user}, {request.CourseId}, {course.PriceVnd}, 'PENDING', {key})
            RETURNING ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", gia_vnd AS "PriceVnd", trang_thai AS "Status", ngay_tao AS "CreatedAt"
            """).ToListAsync(ct);
        await tx.CommitAsync(ct);
        return Ok(rows[0]);
    }

    [HttpPost("{id:long}/confirm")]
    public async Task<IActionResult> Confirm(long id, ConfirmOrder request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var user)) return Unauthorized();
        if (request.Result is not ("SUCCEEDED" or "FAILED" or "CANCELLED")) return BadRequest(new { code = "INVALID_RESULT" });
        await using var tx = await db.Database.BeginTransactionAsync(ct);
        var orders = await db.Database.SqlQuery<OrderRow>($"""
            SELECT ma_don_hang AS "Id", ma_khoa_hoc AS "CourseId", gia_vnd AS "PriceVnd",
                   trang_thai AS "Status", ngay_tao AS "CreatedAt"
            FROM public.don_hang_demo WHERE ma_don_hang = {id} AND ma_nguoi_dung = {user} FOR UPDATE
            """).ToListAsync(ct);
        if (orders.Count == 0) return NotFound();
        var order = orders[0];
        if (order.Status != "PENDING") return order.Status == request.Result ? Ok(order) : Conflict(new { code = "ORDER_FINAL" });
        await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({$"learner:{user}:{order.CourseId}"}, 0))", ct);
        await db.Database.SqlQuery<long>($"SELECT ma_khoa_hoc AS \"Value\" FROM public.khoa_hoc WHERE ma_khoa_hoc = {order.CourseId} FOR UPDATE").ToListAsync(ct);
        if (request.Result == "SUCCEEDED")
        {
            if (!await db.LearningCourses.AnyAsync(c => c.Id == order.CourseId && c.Status == "DA_DANG", ct)) return Conflict(new { code = "COURSE_UNAVAILABLE" });
            var enrollment = await db.CourseEnrollments.SingleOrDefaultAsync(e => e.UserId == user && e.CourseId == order.CourseId, ct);
            if (enrollment is null) db.CourseEnrollments.Add(new CourseEnrollment { UserId = user, CourseId = order.CourseId });
            else if (enrollment.Status == "DA_HUY") { enrollment.Status = "DANG_HOC"; enrollment.CompletedAt = null; }
            await db.SaveChangesAsync(ct);
            await progress.RefreshAsync(user, order.CourseId, ct);
        }
        await db.Database.ExecuteSqlInterpolatedAsync($"UPDATE public.don_hang_demo SET trang_thai = {request.Result}, ngay_xac_nhan = now() WHERE ma_don_hang = {id}", ct);
        await tx.CommitAsync(ct);
        order.Status = request.Result;
        return Ok(order);
    }
}
