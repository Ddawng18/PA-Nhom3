using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/admin"), Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminWorkspaceController(AppDbContext db) : ControllerBase
{
    private static readonly string[] AuditTypes =
        ["NGUOI_DUNG", "HO_SO_GIAO_VIEN", "KHOA_HOC", "BAI_NOP", "DON_HANG", "CONG_DONG"];

    public sealed class OverviewCounts
    {
        public int Users { get; set; }
        public int Teachers { get; set; }
        public int PendingTeachers { get; set; }
        public int Courses { get; set; }
        public int PendingCourses { get; set; }
        public int HiddenCourses { get; set; }
        public int Posts { get; set; }
        public int HiddenPosts { get; set; }
        public int OpenReports { get; set; }
        public int Orders { get; set; }
        public long RevenueVnd { get; set; }
    }

    [HttpGet("overview")]
    public async Task<IActionResult> Overview(CancellationToken ct)
    {
        var counts = await db.Database.SqlQuery<OverviewCounts>($"""
            select
              (select count(*)::int from auth.users) AS "Users",
              (select count(*)::int from public.nguoi_dung where role::text = 'teacher') AS "Teachers",
              (select count(*)::int from public.ho_so_giao_vien where trang_thai = 'CHO_DUYET') AS "PendingTeachers",
              (select count(*)::int from public.khoa_hoc) AS "Courses",
              (select count(*)::int from public.khoa_hoc where trang_thai = 'CHO_DUYET') AS "PendingCourses",
              (select count(*)::int from public.khoa_hoc where trang_thai = 'AN') AS "HiddenCourses",
              (select count(*)::int from public.community_posts) AS "Posts",
              (select count(*)::int from public.community_posts where status = 'HIDDEN') AS "HiddenPosts",
              (select count(*)::int from public.community_post_reports where status = 'OPEN') AS "OpenReports",
              (select count(*)::int from public.don_hang_demo) AS "Orders",
              (select coalesce(sum(gia_vnd), 0)::bigint from public.don_hang_demo where trang_thai = 'SUCCEEDED') AS "RevenueVnd"
            """).SingleAsync(ct);
        var audit = await ReadAudit("", 1, 8, ct);
        var reports = await db.Database.SqlQuery<ModerationSummary>($"""
            select id AS "Id", post_id AS "PostId", reason AS "Reason", status AS "Status", created_at AS "CreatedAt"
            from public.community_post_reports where status = 'OPEN'
            order by created_at, id limit 5
            """).ToListAsync(ct);
        return Ok(new { counts, audit, reports });
    }

    public sealed class ModerationSummary
    {
        public long Id { get; set; }
        public long PostId { get; set; }
        public string Reason { get; set; } = "";
        public string Status { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    public sealed class AuditRow
    {
        public long Id { get; set; }
        public string ObjectType { get; set; } = "";
        public string ObjectId { get; set; } = "";
        public string? PreviousStatus { get; set; }
        public string Status { get; set; } = "";
        public string? Reason { get; set; }
        public string Actor { get; set; } = "";
        public DateTimeOffset OccurredAt { get; set; }
    }

    [HttpGet("audit")]
    public async Task<IActionResult> Audit([FromQuery] string? objectType, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        var type = string.IsNullOrWhiteSpace(objectType) ? "" : objectType.Trim().ToUpperInvariant();
        if (type.Length > 0 && !AuditTypes.Contains(type))
            return BadRequest(new { detail = "Loại đối tượng kiểm toán không hợp lệ." });
        page = Math.Clamp(page, 1, 10000);
        var items = await ReadAudit(type, page, 50, ct);
        var total = await db.Database.SqlQuery<int>($"""
            select count(*)::int AS "Value" from public.lich_su_trang_thai where ({type}::text = '' or loai_doi_tuong = {type}::text)
            """).SingleAsync(ct);
        return Ok(new { items, total, page });
    }

    private Task<List<AuditRow>> ReadAudit(string type, int page, int pageSize, CancellationToken ct)
    {
        var offset = (page - 1) * pageSize;
        return db.Database.SqlQuery<AuditRow>($"""
            select h.ma_lich_su AS "Id", h.loai_doi_tuong AS "ObjectType", h.ma_doi_tuong AS "ObjectId",
                   h.trang_thai_cu AS "PreviousStatus", h.trang_thai_moi AS "Status", h.ly_do AS "Reason",
                   coalesce(nullif(btrim(n.display_name), ''), 'Quản trị viên LINEA') AS "Actor",
                   h.ngay_thuc_hien AS "OccurredAt"
            from public.lich_su_trang_thai h
            left join public.nguoi_dung n on n.id = h.ma_nguoi_thuc_hien
            where ({type}::text = '' or h.loai_doi_tuong = {type}::text)
            order by h.ngay_thuc_hien desc, h.ma_lich_su desc limit {pageSize} offset {offset}
            """).ToListAsync(ct);
    }
}
