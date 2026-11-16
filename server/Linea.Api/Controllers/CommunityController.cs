using System.ComponentModel.DataAnnotations;
using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/community/posts")]
public sealed class CommunityController(AppDbContext db) : ControllerBase
{
    public sealed record CreatePost([Required, StringLength(160)] string Title, [Required, StringLength(5000)] string Body);
    public sealed class PostRow
    {
        public long Id { get; set; }
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public string Author { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    [HttpGet, AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] int page = 1, CancellationToken ct = default)
    {
        page = Math.Clamp(page, 1, 10000);
        var offset = (page - 1) * 20;
        var rows = await db.Database.SqlQuery<PostRow>($"""
            SELECT p.id AS "Id", p.title AS "Title", p.body AS "Body",
                   coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author",
                   p.created_at AS "CreatedAt"
            FROM public.community_posts p JOIN public.nguoi_dung n ON n.id = p.author_id
            ORDER BY p.created_at DESC, p.id DESC LIMIT 20 OFFSET {offset}
            """).ToListAsync(ct);
        return Ok(rows);
    }

    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken ct)
    {
        var rows = await db.Database.SqlQuery<PostRow>($"""
            SELECT p.id AS "Id", p.title AS "Title", p.body AS "Body",
                   coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author",
                   p.created_at AS "CreatedAt"
            FROM public.community_posts p JOIN public.nguoi_dung n ON n.id = p.author_id
            WHERE p.id = {id}
            """).ToListAsync(ct);
        return rows.Count == 0 ? NotFound() : Ok(rows[0]);
    }

    [HttpPost, Authorize]
    public async Task<IActionResult> Create(CreatePost request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var title = request.Title?.Trim(); var body = request.Body?.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length > 160 || string.IsNullOrWhiteSpace(body) || body.Length > 5000)
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Tiêu đề tối đa 160 ký tự, nội dung tối đa 5.000 ký tự và không được để trống." });
        var ids = await db.Database.SqlQuery<long>($"""
            INSERT INTO public.community_posts (author_id, title, body)
            VALUES ({userId}, {title}, {body}) RETURNING id AS "Value"
            """).ToListAsync(ct);
        return await Get(ids[0], ct);
    }
}
