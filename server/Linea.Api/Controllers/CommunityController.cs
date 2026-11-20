using System.ComponentModel.DataAnnotations;
using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
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
        public Guid AuthorId { get; set; }
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
            SELECT p.id AS "Id", p.author_id AS "AuthorId", p.title AS "Title", p.body AS "Body",
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
            SELECT p.id AS "Id", p.author_id AS "AuthorId", p.title AS "Title", p.body AS "Body",
                   coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author",
                   p.created_at AS "CreatedAt", p.image_url AS "ImageUrl",
                   (select count(*)::int from public.community_comments c where c.post_id=p.id) AS "CommentCount"
            FROM public.community_posts p JOIN public.nguoi_dung n ON n.id = p.author_id
            WHERE p.id = {id}
            """).ToListAsync(ct);
        return rows.Count == 0 ? NotFound() : Ok(rows[0]);
    }

    [EnableRateLimiting("writes")]
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

    [EnableRateLimiting("writes")]
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
        return await UploadAndSave(image, userId, url => SavePost(title, body, url, ct), 5 * 1024 * 1024, ct);
    }

    private async Task<IActionResult> UploadAndSave(IFormFile image, Guid userId,
        Func<string, Task<IActionResult>> save, int maxBytes, CancellationToken ct)
    {
        if (image.Length <= 0 || image.Length > maxBytes)
            return BadRequest(new { detail = $"Ảnh tối đa {maxBytes / 1024 / 1024} MB." });
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
        try
        {
            var result = await save($"{url}/storage/v1/object/public/community-images/{path}");
            if (result is ObjectResult { StatusCode: >= 400 } || result is StatusCodeResult { StatusCode: >= 400 })
                await DeleteImage($"{url}/storage/v1/object/public/community-images/{path}");
            return result;
        }
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
        public string? ImageUrl { get; set; }
    }

    [HttpGet("{id:long}/comments"), AllowAnonymous]
    public async Task<IActionResult> Comments(long id, [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (!await Exists(id, ct)) return NotFound();
        var offset = (Math.Clamp(page, 1, 10000) - 1) * 20;
        return Ok(await db.Database.SqlQuery<CommentRow>($"""
            select c.id AS "Id", c.body AS "Body", c.created_at AS "CreatedAt", c.image_url AS "ImageUrl",
              coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author"
            from public.community_comments c join public.nguoi_dung n on n.id=c.author_id
            where c.post_id={id} order by c.created_at desc, c.id desc limit 20 offset {offset}
            """).ToListAsync(ct));
    }

    private async Task<bool> Exists(long id, CancellationToken ct) =>
        await db.Database.SqlQuery<int>($"select 1 AS \"Value\" from public.community_posts where id={id}").AnyAsync(ct);

    [EnableRateLimiting("writes")]
    [HttpPost("{id:long}/comments"), Authorize]
    public async Task<IActionResult> Comment(long id, CreateComment request, CancellationToken ct)
        => await SaveComment(id, request.Body, null, ct);

    private async Task<IActionResult> SaveComment(long id, string? text, string? imageUrl, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var body = text?.Trim() ?? "";
        if ((body.Length == 0 && imageUrl is null) || body.Length > 2000)
            return BadRequest(new { detail = "Bình luận cần có chữ hoặc ảnh, tối đa 2.000 ký tự." });
        if (!await Exists(id, ct)) return NotFound();
        var rows = await db.Database.SqlQuery<CommentRow>($"""
            with inserted as (
              insert into public.community_comments(post_id,author_id,body,image_url) values ({id},{userId},{body},{imageUrl}) returning *
            ) select c.id AS "Id", c.body AS "Body", c.created_at AS "CreatedAt", c.image_url AS "ImageUrl",
              coalesce(nullif(btrim(n.display_name), ''), 'Thành viên LINEA') AS "Author"
            from inserted c join public.nguoi_dung n on n.id=c.author_id
            """).ToListAsync(ct);
        return Ok(rows[0]);
    }

    [EnableRateLimiting("writes")]
    [HttpPost("{id:long}/comments/with-image"), Authorize]
    [RequestSizeLimit(2 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 2 * 1024 * 1024)]
    public async Task<IActionResult> CommentWithImage(long id, [FromForm] string? body, IFormFile? image, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if ((body?.Trim().Length ?? 0) > 2000) return BadRequest(new { detail = "Bình luận tối đa 2.000 ký tự." });
        if (!await Exists(id, ct)) return NotFound();
        return image is null ? await SaveComment(id, body, null, ct)
            : await UploadAndSave(image, userId, url => SaveComment(id, body, url, ct), 1024 * 1024, ct);
    }

    [EnableRateLimiting("writes")]
    [HttpPut("{id:long}"), Authorize]
    [RequestSizeLimit(6 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 6 * 1024 * 1024)]
    public async Task<IActionResult> Edit(long id, [FromForm] string title, [FromForm] string body,
        [FromForm] bool removeImage, IFormFile? image, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(title) || title.Trim().Length > 160 || string.IsNullOrWhiteSpace(body) || body.Trim().Length > 5000)
            return BadRequest(new { detail = "Vui lòng nhập tiêu đề tối đa 160 ký tự và nội dung tối đa 5.000 ký tự." });
        var own = await db.Database.SqlQuery<int>($"select 1 AS \"Value\" from public.community_posts where id={id} and author_id={userId}").AnyAsync(ct);
        if (!own) return NotFound();
        async Task<IActionResult> Update(string? uploaded)
        {
            await using var transaction = await db.Database.BeginTransactionAsync(ct);
            var previous = await db.Database.SqlQuery<PostImage>($"select image_url AS \"ImageUrl\" from public.community_posts where id={id} and author_id={userId} for update").ToListAsync(ct);
            if (previous.Count == 0) return NotFound();
            var nextImage = uploaded ?? (removeImage ? null : previous[0].ImageUrl);
            await db.Database.ExecuteSqlInterpolatedAsync($"update public.community_posts set title={title.Trim()}, body={body.Trim()}, image_url={nextImage} where id={id} and author_id={userId}", ct);
            var result = await Get(id, ct);
            await transaction.CommitAsync(ct);
            if (previous[0].ImageUrl != nextImage) await DeleteImage(previous[0].ImageUrl);
            return result;
        }
        return image is null ? await Update(null) : await UploadAndSave(image, userId, url => Update(url), 5 * 1024 * 1024, ct);
    }

    public sealed class PostImage { public string? ImageUrl { get; set; } }

    [EnableRateLimiting("writes")]
    [HttpDelete("{id:long}"), Authorize]
    public async Task<IActionResult> Delete(long id, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await using var transaction = await db.Database.BeginTransactionAsync(ct);
        var own = await db.Database.SqlQuery<PostImage>($"select image_url AS \"ImageUrl\" from public.community_posts where id={id} and author_id={userId} for update").ToListAsync(ct);
        if (own.Count == 0) return NotFound();
        var images = await db.Database.SqlQuery<PostImage>($"select image_url AS \"ImageUrl\" from public.community_comments where post_id={id} and image_url is not null").ToListAsync(ct);
        await db.Database.ExecuteSqlInterpolatedAsync($"delete from public.community_posts where id={id} and author_id={userId}", ct);
        await transaction.CommitAsync(ct);
        // The FK cascades comments; remove their images as well to free storage.
        await DeleteImages(own.Concat(images).Select(image => image.ImageUrl));
        return NoContent();
    }

    private Task DeleteImage(string? imageUrl) => DeleteImages(new[] { imageUrl });

    private async Task DeleteImages(IEnumerable<string?> imageUrls)
    {
        var baseUrl = config["SUPABASE_URL"]?.TrimEnd('/');
        var prefix = $"{baseUrl}/storage/v1/object/public/community-images/";
        if (baseUrl is null) return;
        var paths = imageUrls.Where(url => url is not null && url.StartsWith(prefix, StringComparison.Ordinal))
            .Select(url => url![prefix.Length..])
            .Where(path => System.Text.RegularExpressions.Regex.IsMatch(path, @"\A[0-9a-fA-F-]{36}/[0-9a-f]{32}\.(jpg|png|webp)\z"))
            .Distinct().ToArray();
        if (paths.Length == 0) return;
        try
        {
            using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            using var client = clients.CreateClient("supabase-storage");
            client.DefaultRequestHeaders.TryAddWithoutValidation("apikey", config["SUPABASE_SERVICE_ROLE_KEY"]);
            client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", config["SUPABASE_SERVICE_ROLE_KEY"]);
            foreach (var batch in paths.Chunk(100))
            {
                using var request = new HttpRequestMessage(HttpMethod.Delete, $"{baseUrl}/storage/v1/object/community-images");
                request.Content = JsonContent.Create(new { prefixes = batch });
                using var response = await client.SendAsync(request, timeout.Token);
                if (!response.IsSuccessStatusCode) logger.LogWarning("Community image cleanup failed: {Status}", response.StatusCode);
            }
        }
        catch (Exception e) { logger.LogWarning("Community image cleanup deferred: {FailureType}", e.GetType().Name); }
    }
}
