using System.ComponentModel.DataAnnotations;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/admin/community"), Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class CommunityModerationController(AppDbContext db) : ControllerBase
{
    private static readonly string[] ReportStatuses = ["OPEN", "RESOLVED", "DISMISSED"];
    private static readonly string[] PostStatuses = ["VISIBLE", "HIDDEN"];

    public sealed class ReportRow
    {
        public long Id { get; set; }
        public long PostId { get; set; }
        public string PostTitle { get; set; } = "";
        public string PostBody { get; set; } = "";
        public string PostStatus { get; set; } = "";
        public string Author { get; set; } = "";
        public string Reporter { get; set; } = "";
        public string Reason { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public DateTimeOffset? ReviewedAt { get; set; }
        public string? Note { get; set; }
    }

    [HttpGet("reports")]
    public async Task<IActionResult> Reports([FromQuery] string? status, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var filter = string.IsNullOrWhiteSpace(status) ? "" : status.Trim().ToUpperInvariant();
        if (filter.Length > 0 && !ReportStatuses.Contains(filter))
            return BadRequest(new { detail = "Trạng thái báo cáo phải là OPEN, RESOLVED hoặc DISMISSED." });
        page = Math.Clamp(page, 1, 10000);
        var offset = (page - 1) * 50;
        var rows = await db.Database.SqlQuery<ReportRow>($"""
            select r.id AS "Id", r.post_id AS "PostId", p.title AS "PostTitle", p.body AS "PostBody",
                   p.status AS "PostStatus",
                   coalesce(nullif(btrim(a.display_name), ''), 'Thành viên LINEA') AS "Author",
                   coalesce(nullif(btrim(rn.display_name), ''), 'Thành viên LINEA') AS "Reporter",
                   r.reason AS "Reason", r.status AS "Status", r.created_at AS "CreatedAt",
                   r.reviewed_at AS "ReviewedAt", r.note AS "Note"
            from public.community_post_reports r
            join public.community_posts p on p.id = r.post_id
            left join public.nguoi_dung a on a.id = p.author_id
            left join public.nguoi_dung rn on rn.id = r.reporter_id
            where ({filter}::text = '' or r.status = {filter}::text)
            order by case when r.status = 'OPEN' then 0 else 1 end, r.created_at desc, r.id desc
            limit 50 offset {offset}
            """).ToListAsync(ct);
        return Ok(rows);
    }

    public sealed class ReportState
    {
        public long PostId { get; set; }
        public string Status { get; set; } = "";
        public Guid? AuthorId { get; set; }
    }

    public sealed record ResolveReport([Required, StringLength(20)] string Action, [StringLength(1000)] string? Note);

    [HttpPost("reports/{id:long}/resolve")]
    public async Task<IActionResult> Resolve(long id, ResolveReport request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var reviewerId)) return Unauthorized();
        var action = request.Action?.Trim().ToUpperInvariant();
        if (action is not ("HIDE" or "KEEP"))
            return BadRequest(new { detail = "Hành động phải là HIDE hoặc KEEP." });
        var note = request.Note?.Trim();
        if (note is { Length: > 1000 })
            return BadRequest(new { detail = "Ghi chú tối đa 1.000 ký tự." });
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var state = await db.Database.SqlQuery<ReportState>($"""
            select r.post_id AS "PostId", r.status AS "Status", p.author_id AS "AuthorId"
            from public.community_post_reports r
            join public.community_posts p on p.id = r.post_id
            where r.id = {id} for update of r
            """).ToListAsync(ct);
        if (state.Count == 0) return NotFound();
        if (state[0].Status != "OPEN")
            return Conflict(new { detail = "Báo cáo này đã được xử lý." });
        var previous = await db.Database.SqlQuery<string>($"""
            select status AS "Value" from public.community_posts where id = {state[0].PostId} for update
            """).SingleAsync(ct);
        var next = action == "HIDE" ? "HIDDEN" : previous;
        if (action == "HIDE")
            await db.Database.ExecuteSqlInterpolatedAsync(
                $"update public.community_posts set status = 'HIDDEN' where id = {state[0].PostId}", ct);
        var now = DateTimeOffset.UtcNow;
        await db.Database.ExecuteSqlInterpolatedAsync($"""
            update public.community_post_reports
            set status = {(action == "HIDE" ? "RESOLVED" : "DISMISSED")}, reviewed_at = {now},
                reviewer_id = {reviewerId}, note = {note}
            where id = {id}
            """, ct);
        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = "CONG_DONG", ObjectId = state[0].PostId.ToString(), PreviousStatus = previous,
            Status = next, ActorId = reviewerId, Reason = note ?? action, OccurredAt = now
        });
        if (action == "HIDE" && state[0].AuthorId is { } author && author != reviewerId)
            db.Notifications.Add(new NotificationMessage
            {
                UserId = author, Type = "cong_dong", Content = "Bài viết của bạn đã bị ẩn sau khi được kiểm duyệt.",
                Link = $"/community/{state[0].PostId}", CreatedAt = now
            });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { id, action, postStatus = next });
    }

    public sealed record PostStatusRequest([Required, StringLength(16)] string Status);

    [HttpPost("posts/{id:long}/status")]
    public async Task<IActionResult> SetPostStatus(long id, PostStatusRequest request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var actorId)) return Unauthorized();
        var status = request.Status?.Trim().ToUpperInvariant();
        if (status is null || !PostStatuses.Contains(status))
            return BadRequest(new { detail = "Trạng thái bài viết phải là VISIBLE hoặc HIDDEN." });
        var previous = await db.Database.SqlQuery<string>($"""
            select status AS "Value" from public.community_posts where id = {id}
            """).ToListAsync(ct);
        if (previous.Count == 0) return NotFound();
        if (previous[0] == status) return Ok(new { id, status });
        await db.Database.ExecuteSqlInterpolatedAsync(
            $"update public.community_posts set status = {status} where id = {id}", ct);
        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = "CONG_DONG", ObjectId = id.ToString(), PreviousStatus = previous[0], Status = status,
            ActorId = actorId, Reason = "Quản trị viên đổi trạng thái hiển thị.", OccurredAt = DateTimeOffset.UtcNow
        });
        await db.SaveChangesAsync(ct);
        return Ok(new { id, status });
    }
}
