using System.Net.Http.Headers;
using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Linea.Api.Services;

namespace Linea.Api.Controllers;

[ApiController, Route("api/courses/{courseId:long}/media"), Authorize(Policy = AuthPolicies.TeacherAccess)]
public sealed class CourseMediaController(
    AppDbContext db,
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<CourseMediaController> logger) : ControllerBase
{
    private const long MaxFileBytes = 10 * 1024 * 1024;
    public sealed record AttachmentRequest(long LessonId, string Name, string Path, string Type, long Size);

    [HttpPost("{bucketKind}")]
    [RequestSizeLimit(21 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 21 * 1024 * 1024)]
    public async Task<IActionResult> Upload(long courseId, string bucketKind, IFormFile file, CancellationToken ct)
    {
        if (!await OwnsDraft(courseId, ct)) return NotFound();
        var maxBytes = bucketKind == "attachments" ? 20 * 1024 * 1024 : MaxFileBytes;
        if (file is null || file.Length <= 0 || file.Length > maxBytes)
            return BadRequest(new { code = "UPLOAD_TOO_LARGE", detail = "Ảnh tối đa 10 MB, tài liệu đính kèm tối đa 20 MB." });
        if (bucketKind is not ("media" or "attachments") ||
            !AllowedContentTypes(bucketKind).Contains(file.ContentType, StringComparer.OrdinalIgnoreCase))
            return BadRequest(new { code = "UPLOAD_INVALID_TYPE", detail = "Loại tệp không được hỗ trợ." });
        if (!TryGetStorage(bucketKind, out var baseUrl, out var key, out var bucket))
            return StatusCode(503, new { code = "STORAGE_NOT_CONFIGURED", detail = "Chưa cấu hình lưu trữ khóa học." });

        await using var stream = file.OpenReadStream();
        var header = new byte[12];
        var count = await stream.ReadAtLeastAsync(header, header.Length, throwOnEndOfStream: false, cancellationToken: ct);
        var detected = PortfolioFileTypes.DetectExtension(header, count);
        if (detected is null && bucketKind == "attachments")
        {
            if (count >= 5 && header.AsSpan(0, 5).SequenceEqual("%PDF-"u8)) detected = "pdf";
            else if (count >= 4 && header[0] == 0x50 && header[1] == 0x4b &&
                ((header[2] == 3 && header[3] == 4) || (header[2] == 5 && header[3] == 6))) detected = "zip";
        }
        var extension = ExtensionFor(file.ContentType.ToLowerInvariant());
        if (detected is null || extension != $".{detected}")
            return BadRequest(new { code = "UPLOAD_INVALID_TYPE", detail = "Nội dung tệp không khớp loại tệp." });
        // Open a fresh stream: IFormFile streams need not support seeking.
        await using var uploadStream = file.OpenReadStream();
        var path = $"{courseId}/{Guid.NewGuid():N}{extension}";
        using var request = new HttpRequestMessage(HttpMethod.Post, ObjectUrl(baseUrl, bucket, path));
        request.Headers.TryAddWithoutValidation("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        request.Headers.TryAddWithoutValidation("x-upsert", "false");
        request.Content = new StreamContent(uploadStream);
        request.Content.Headers.ContentType = new MediaTypeHeaderValue(file.ContentType);
        request.Content.Headers.ContentLength = file.Length;
        using var response = await clients.CreateClient("supabase-storage").SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            logger.LogWarning("Course media upload failed with status {Status}", response.StatusCode);
            return StatusCode(502, new { code = "STORAGE_ERROR", detail = "Không thể lưu tệp lúc này." });
        }

        var publicUrl = bucketKind == "media" ? $"{baseUrl.TrimEnd('/')}/storage/v1/object/public/{bucket}/{path}" : null;
        return Ok(new { path, publicUrl });
    }

    [HttpDelete("{bucketKind}")]
    public async Task<IActionResult> Delete(long courseId, string bucketKind, [FromQuery] string path, CancellationToken ct)
    {
        if (!await OwnsDraft(courseId, ct)) return NotFound();
        if (bucketKind is not ("media" or "attachments") || string.IsNullOrWhiteSpace(path) ||
            !IsOwnedPath(courseId, path))
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Đường dẫn tệp không hợp lệ." });
        if (!TryGetStorage(bucketKind, out var baseUrl, out var key, out var bucket))
            return StatusCode(503, new { code = "STORAGE_NOT_CONFIGURED", detail = "Chưa cấu hình lưu trữ khóa học." });

        var publicUrl = $"{baseUrl.TrimEnd('/')}/storage/v1/object/public/{bucket}/{path}";
        if (await db.CourseAttachments.AnyAsync(x => x.Path == path, ct) ||
            (bucketKind == "media" && (await db.LearningCourses.AnyAsync(x => x.CoverImage == publicUrl, ct) ||
                await db.CourseLessons.AnyAsync(x => x.ImagePath == publicUrl || x.ImagePath == path, ct))))
            return Conflict(new { code = "MEDIA_IN_USE", detail = "Tệp vẫn đang được sử dụng. Tải lại nội dung trước khi xóa." });
        using var request = new HttpRequestMessage(HttpMethod.Delete, $"{baseUrl}/storage/v1/object/{Uri.EscapeDataString(bucket)}");
        request.Content = JsonContent.Create(new { prefixes = new[] { path } });
        request.Headers.TryAddWithoutValidation("apikey", key);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        using var response = await clients.CreateClient("supabase-storage").SendAsync(request, ct);
        if (!response.IsSuccessStatusCode && response.StatusCode != System.Net.HttpStatusCode.NotFound)
            return StatusCode(502, new { code = "STORAGE_ERROR", detail = "Không thể xóa tệp lúc này." });
        return NoContent();
    }

    [HttpPost("~/api/courses/{courseId:long}/attachments")]
    public async Task<IActionResult> AddAttachment(long courseId, AttachmentRequest request, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        if (!await OwnsDraft(courseId, ct)) return NotFound();
        if (request.Type is not ("IMAGE" or "DOCUMENT" or "REFERENCE") ||
            string.IsNullOrWhiteSpace(request.Name) || request.Name.Trim().Length > 255 ||
            string.IsNullOrWhiteSpace(request.Path) || request.Path.Trim().Length > 500 ||
            request.Size <= 0 || request.Size > 20 * 1024 * 1024 || !IsOwnedPath(courseId, request.Path))
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Thông tin tệp đính kèm không hợp lệ." });

        var lessonExists = await (from lesson in db.CourseLessons
                                  join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                                  where lesson.Id == request.LessonId && chapter.CourseId == courseId
                                  select lesson.Id).AnyAsync(ct);
        if (!lessonExists) return BadRequest(new { code = "VALIDATION_ERROR", detail = "Bài học không thuộc khóa học." });
        var attachment = new Models.CourseAttachmentContent {
            LessonId = request.LessonId, Name = request.Name.Trim(), Path = request.Path.Trim(),
            Type = request.Type, Size = request.Size
        };
        db.CourseAttachments.Add(attachment);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return Ok(new { ma_tep = attachment.Id, ma_bai_hoc = attachment.LessonId,
            ten_tep = attachment.Name, duong_dan = attachment.Path, loai_tep = attachment.Type,
            dung_luong = attachment.Size });
    }

    [HttpDelete("~/api/courses/{courseId:long}/attachments/{attachmentId:long}")]
    public async Task<IActionResult> RemoveAttachment(long courseId, long attachmentId, CancellationToken ct)
    {
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        if (!await OwnsDraft(courseId, ct)) return NotFound();
        var attachment = await (from item in db.CourseAttachments
                                join lesson in db.CourseLessons on item.LessonId equals lesson.Id
                                join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                                where item.Id == attachmentId && chapter.CourseId == courseId
                                select item).SingleOrDefaultAsync(ct);
        if (attachment is null) return NotFound();
        db.CourseAttachments.Remove(attachment);
        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        return NoContent();
    }

    private async Task<bool> OwnsDraft(long courseId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return false;
        var query = db.Database.IsNpgsql() && db.Database.CurrentTransaction is not null
            ? db.LearningCourses.FromSqlInterpolated($"SELECT * FROM public.khoa_hoc WHERE ma_khoa_hoc = {courseId} FOR UPDATE")
            : db.LearningCourses.AsQueryable();
        return await query.AnyAsync(item => item.Id == courseId && item.TeacherId == userId && item.Status == "NHAP", ct);
    }

    private bool TryGetStorage(string bucketKind, out string baseUrl, out string key, out string bucket)
    {
        baseUrl = configuration["SUPABASE_URL"]?.TrimEnd('/') ?? "";
        key = configuration["SUPABASE_SERVICE_ROLE_KEY"] ?? "";
        bucket = bucketKind == "attachments"
            ? configuration["SUPABASE_ATTACHMENTS_BUCKET"] ?? ""
            : configuration["SUPABASE_MEDIA_BUCKET"] ?? "";
        return !string.IsNullOrWhiteSpace(baseUrl) &&
            !string.IsNullOrWhiteSpace(key) &&
            !string.IsNullOrWhiteSpace(bucket);
    }

    private static string ObjectUrl(string baseUrl, string bucket, string path) =>
        $"{baseUrl}/storage/v1/object/{Uri.EscapeDataString(bucket)}/{string.Join("/", path.Split('/').Select(Uri.EscapeDataString))}";

    public static bool IsOwnedPath(long courseId, string path) =>
        !string.IsNullOrWhiteSpace(path) &&
        (System.Text.RegularExpressions.Regex.IsMatch(path,
            $@"\A{courseId}/[0-9a-f]{{32}}\.(jpg|png|webp|pdf|zip)\z") ||
        System.Text.RegularExpressions.Regex.IsMatch(path,
            $@"\Acourses/{courseId}/(cover|lessons/[0-9]+|attachments/[0-9]+)/[0-9a-f-]{{36}}\.(jpg|png|webp|pdf|zip)\z"));

    private static string[] AllowedContentTypes(string bucketKind) =>
        bucketKind == "media"
            ? ["image/jpeg", "image/png", "image/webp"]
            : ["image/jpeg", "image/png", "image/webp", "application/pdf", "application/zip"];

    private static string ExtensionFor(string contentType) => contentType.ToLowerInvariant() switch
    {
        "image/jpeg" => ".jpg",
        "image/png" => ".png",
        "image/webp" => ".webp",
        "application/pdf" => ".pdf",
        "application/zip" => ".zip",
        _ => ".bin"
    };
}
