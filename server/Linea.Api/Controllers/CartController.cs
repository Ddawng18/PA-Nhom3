using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/cart")]
public sealed class CartController(AppDbContext db) : ControllerBase
{
    public sealed record AddItem(long CourseId);
    public sealed record MergeCart(List<long>? CourseIds);
    public sealed record QuoteRequest(List<long>? CourseIds);
    public sealed record QuoteItem(long CourseId, string Title, long PriceVnd, string Level, string? CoverImage,
        bool Available, bool Enrolled, string? Reason);
    public sealed record QuoteResponse(IReadOnlyList<QuoteItem> Items, long TotalVnd, int PaidCount, int FreeCount, int BlockedCount);

    [HttpGet, Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var ids = await db.Database.SqlQuery<long>($"""
            select ma_khoa_hoc as "Value" from public.gio_hang
            where ma_nguoi_dung = {userId} order by ngay_them, ma_khoa_hoc
            """).ToListAsync(ct);
        return Ok(await BuildQuote(ids, userId, ct));
    }

    [HttpPost("items"), Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Add(AddItem request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (request.CourseId <= 0) return BadRequest(new { code = "INVALID_COURSE" });
        var quote = await BuildQuote([request.CourseId], userId, ct);
        var item = quote.Items.FirstOrDefault();
        if (item is null || !item.Available) return BadRequest(new { code = "COURSE_UNAVAILABLE" });
        if (item.Enrolled) return Conflict(new { code = "ALREADY_ENROLLED" });
        var count = await db.Database.SqlQuery<int>($"select count(*)::int as \"Value\" from public.gio_hang where ma_nguoi_dung = {userId}").SingleAsync(ct);
        if (count >= 20) return Conflict(new { code = "CART_LIMIT" });
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            insert into public.gio_hang(ma_nguoi_dung, ma_khoa_hoc) values ({userId}, {request.CourseId})
            on conflict do nothing
            """, ct);
        return Ok(await GetQuoteForUser(userId, ct));
    }

    [HttpDelete("items/{courseId:long}"), Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Remove(long courseId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await db.Database.ExecuteSqlInterpolatedAsync($"delete from public.gio_hang where ma_nguoi_dung = {userId} and ma_khoa_hoc = {courseId}", ct);
        return Ok(await GetQuoteForUser(userId, ct));
    }

    [HttpDelete, Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Clear(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await db.Database.ExecuteSqlInterpolatedAsync($"delete from public.gio_hang where ma_nguoi_dung = {userId}", ct);
        return NoContent();
    }

    [HttpPost("merge"), Authorize(Policy = AuthPolicies.LearnerAccess)]
    public async Task<IActionResult> Merge(MergeCart request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var ids = CleanIds(request.CourseIds);
        if (ids.Count == 0) return Ok(await GetQuoteForUser(userId, ct));
        var quote = await BuildQuote(ids, userId, ct);
        var existing = await db.Database.SqlQuery<int>($"select count(*)::int as \"Value\" from public.gio_hang where ma_nguoi_dung = {userId}").SingleAsync(ct);
        var valid = quote.Items.Where(item => item.Available && !item.Enrolled).Select(item => item.CourseId).Take(Math.Max(0, 20 - existing)).ToList();
        foreach (var id in valid)
            await db.Database.ExecuteSqlInterpolatedAsync($"""
                insert into public.gio_hang(ma_nguoi_dung, ma_khoa_hoc) values ({userId}, {id})
                on conflict do nothing
                """, ct);
        return Ok(await GetQuoteForUser(userId, ct));
    }

    [HttpPost("quote"), AllowAnonymous]
    public async Task<IActionResult> Quote(QuoteRequest request, CancellationToken ct)
    {
        var ids = CleanIds(request.CourseIds);
        var userId = User.TryGetUserId(out var id) ? id : (Guid?)null;
        return Ok(await BuildQuote(ids, userId, ct));
    }

    private async Task<QuoteResponse> GetQuoteForUser(Guid userId, CancellationToken ct)
    {
        var ids = await db.Database.SqlQuery<long>($"""
            select ma_khoa_hoc as "Value" from public.gio_hang
            where ma_nguoi_dung = {userId} order by ngay_them, ma_khoa_hoc
            """).ToListAsync(ct);
        return await BuildQuote(ids, userId, ct);
    }

    private async Task<QuoteResponse> BuildQuote(IReadOnlyList<long> ids, Guid? userId, CancellationToken ct)
    {
        if (ids.Count == 0) return new([], 0, 0, 0, 0);
        var courses = await db.LearningCourses.AsNoTracking()
            .Where(course => ids.Contains(course.Id))
            .Select(course => new { course.Id, course.Title, course.PriceVnd, course.Level, course.CoverImage, course.Status })
            .ToListAsync(ct);
        var enrolled = userId is null ? new List<long>() : await db.CourseEnrollments.AsNoTracking()
            .Where(item => item.UserId == userId && ids.Contains(item.CourseId) && item.Status != "DA_HUY")
            .Select(item => item.CourseId).ToListAsync(ct);
        var byId = courses.ToDictionary(course => course.Id);
        var items = new List<QuoteItem>();
        foreach (var id in ids)
        {
            if (!byId.TryGetValue(id, out var course) || course.Status != "DA_DANG")
            {
                items.Add(new(id, $"Khóa học #{id}", 0, "", null, false, false, "COURSE_UNAVAILABLE"));
                continue;
            }
            items.Add(new(course.Id, course.Title, course.PriceVnd, course.Level, course.CoverImage,
                true, enrolled.Contains(course.Id), enrolled.Contains(course.Id) ? "ALREADY_ENROLLED" : null));
        }
        return new(items,
            items.Where(item => item.Available && !item.Enrolled).Sum(item => item.PriceVnd),
            items.Count(item => item.Available && !item.Enrolled && item.PriceVnd > 0),
            items.Count(item => item.Available && !item.Enrolled && item.PriceVnd == 0),
            items.Count(item => !item.Available));
    }

    private static List<long> CleanIds(IReadOnlyList<long>? ids) =>
        (ids ?? []).Where(id => id > 0).Distinct().Take(20).ToList();
}
