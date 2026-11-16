using System.ComponentModel.DataAnnotations;
using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Net.Http.Headers;
using Linea.Api.Services;

namespace Linea.Api.Controllers;

[ApiController, Route("api/community/posts")]
public sealed class CommunityController(AppDbContext db, IConfiguration config, IHttpClientFactory clients,
    ILogger<CommunityController> logger) : ControllerBase
{
    public sealed record CreatePost([Required, StringLength(160)] string Title, [Required, StringLength(5000)] string Body);
    public sealed class PostRow
    {
        public long Id { get; set; }
        public string Title { get; set; } = "";
        public string Body { get; set; } = "";
        public string Author { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
        public string? ImageUrl { get; set; }
        public int CommentCount { get; set; }
    }

    [HttpGet, AllowAnonymous]
    public async Task<IActionResult> List([FromQuery] int page = 1, CancellationToken ct = default)
    {
        page = Math.Clamp(page, 1, 10000);
        var offset = (page - 1) * 20;
        var rows = await db.Database.SqlQuery<PostRow>($"""
            SELECT p.id AS "Id", p.title AS "Title", p.body AS "Body",
                   coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author",
                   p.created_at AS "CreatedAt", p.image_url AS "ImageUrl",
                   (select count(*)::int from public.community_comments c where c.post_id=p.id) AS "CommentCount"
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
                   p.created_at AS "CreatedAt", p.image_url AS "ImageUrl",
                   (select count(*)::int from public.community_comments c where c.post_id=p.id) AS "CommentCount"
            FROM public.community_posts p JOIN public.nguoi_dung n ON n.id = p.author_id
            WHERE p.id = {id}
            """).ToListAsync(ct);
        return rows.Count == 0 ? NotFound() : Ok(rows[0]);
    }

    [HttpPost, Authorize]
    public async Task<IActionResult> Create(CreatePost request, CancellationToken ct)
        => await SavePost(request.Title, request.Body, null, ct);

    private async Task<IActionResult> SavePost(string titleValue, string bodyValue, string? imageUrl, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var title = titleValue?.Trim(); var body = bodyValue?.Trim();
        if (string.IsNullOrWhiteSpace(title) || title.Length > 160 || string.IsNullOrWhiteSpace(body) || body.Length > 5000)
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Tiêu đề tối đa 160 ký tự, nội dung tối đa 5.000 ký tự và không được để trống." });
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var ids = await db.Database.SqlQuery<long>($"""
            INSERT INTO public.community_posts (author_id, title, body, image_url)
            VALUES ({userId}, {title}, {body}, {imageUrl}) RETURNING id AS "Value"
            """).ToListAsync(ct);
        var result = await Get(ids[0], ct);
        await transaction.CommitAsync(ct);
        return result;
    }

    [HttpPost("with-image"), Authorize]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    public async Task<IActionResult> CreateWithImage([FromForm] string title, [FromForm] string body,
        IFormFile? image, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 160 ||
            string.IsNullOrWhiteSpace(body) || body.Trim().Length > 5000)
            return BadRequest(new { detail = "Vui lòng nhập tiêu đề tối đa 160 ký tự và nội dung tối đa 5.000 ký tự." });
        if (image is null) return await SavePost(title, body, null, ct);
        if (image.Length is <= 0 or > 5 * 1024 * 1024)
            return BadRequest(new { detail = "Ảnh phải nhỏ hơn hoặc bằng 5 MB." });
        await using var input = image.OpenReadStream();
        var header = new byte[12];
        var count = await input.ReadAtLeastAsync(header, 12, false, ct);
        var extension = PortfolioFileTypes.DetectExtension(header, count);
        var mime = extension switch { "jpg" => "image/jpeg", "png" => "image/png", "webp" => "image/webp", _ => null };
        if (mime is null || !string.Equals(mime, image.ContentType, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { detail = "Chỉ nhận ảnh JPG, PNG hoặc WEBP có nội dung hợp lệ." });
        var url = config["SUPABASE_URL"]?.TrimEnd('/');
        var key = config["SUPABASE_SERVICE_ROLE_KEY"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key))
            return StatusCode(503, new { detail = "Chưa cấu hình tải ảnh cộng đồng. Nội dung của bạn chưa được đăng." });
        var path = $"{userId}/{Guid.NewGuid():N}.{extension}";
        var objectUrl = $"{url}/storage/v1/object/community-images/{path}";
        using var client = clients.CreateClient("supabase-storage");
        client.DefaultRequestHeaders.TryAddWithoutValidation("apikey", key);
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", key);
        await using var stream = image.OpenReadStream();
        using var content = new StreamContent(stream);
        content.Headers.ContentType = new MediaTypeHeaderValue(mime);
        using var response = await client.PostAsync(objectUrl, content, ct);
        if (!response.IsSuccessStatusCode)
            return StatusCode(502, new { detail = "Chưa tải được ảnh. Vui lòng thử đăng lại." });
        try { return await SavePost(title, body, $"{url}/storage/v1/object/public/community-images/{path}", ct); }
        catch
        {
            try
            {
                using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
                using var cleanup = await client.DeleteAsync(objectUrl, timeout.Token);
            }
            catch (Exception e) { logger.LogWarning("Community image cleanup deferred: {FailureType}", e.GetType().Name); }
            throw;
        }
    }

    public sealed record CreateComment([Required, StringLength(2000)] string Body);
    public sealed class CommentRow
    {
        public long Id { get; set; }
        public string Body { get; set; } = "";
        public string Author { get; set; } = "";
        public DateTimeOffset CreatedAt { get; set; }
    }

    [HttpGet("{id:long}/comments"), AllowAnonymous]
    public async Task<IActionResult> Comments(long id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (!await Exists(id, ct)) return NotFound();
        var offset = (Math.Clamp(page, 1, 10000) - 1) * 20;
        return Ok(await db.Database.SqlQuery<CommentRow>($"""
            select c.id AS "Id", c.body AS "Body", c.created_at AS "CreatedAt",
              coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author"
            from public.community_comments c join public.nguoi_dung n on n.id=c.author_id
            where c.post_id={id} order by c.created_at desc, c.id desc limit 20 offset {offset}
            """).ToListAsync(ct));
    }

    private async Task<bool> Exists(long id, CancellationToken ct) =>
        await db.Database.SqlQuery<int>($"select 1 AS \"Value\" from public.community_posts where id={id}").AnyAsync(ct);

    [HttpPost("{id:long}/comments"), Authorize]
    public async Task<IActionResult> Comment(long id, CreateComment request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var body = request.Body?.Trim();
        if (string.IsNullOrWhiteSpace(body) || body.Length > 2000)
            return BadRequest(new { detail = "Bình luận cần có nội dung, tối đa 2.000 ký tự." });
        if (!await Exists(id, ct)) return NotFound();
        var rows = await db.Database.SqlQuery<CommentRow>($"""
            with inserted as (
              insert into public.community_comments(post_id,author_id,body) values ({id},{userId},{body}) returning *
            ) select c.id AS "Id", c.body AS "Body", c.created_at AS "CreatedAt",
              coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author"
            from inserted c join public.nguoi_dung n on n.id=c.author_id
            """).ToListAsync(ct);
        return Ok(rows[0]);
    }
}
