using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/courses/{courseId:long}/editor"), Authorize]
public sealed class CourseEditorController(AppDbContext db) : ControllerBase
{
    public sealed record EditorRequest(
        List<ChapterRequest> Chapters,
        List<LessonRequest> Lessons,
        List<AssignmentRequest> Assignments,
        List<AttachmentRequest> Attachments,
        List<RubricRequest> Rubrics,
        string ExpectedVersion);

    public sealed record ChapterRequest(long? Id, string Title, int Order);
    public sealed record LessonRequest(long? Id, long? ChapterId, string Title, int Order, string? TextContent,
        string? ImagePath, string? VideoUrl, bool Required);
    public sealed record AssignmentRequest(long? Id, long? LessonId, string Prompt, DateTimeOffset? Deadline, bool Required);
    public sealed record AttachmentRequest(long? Id, long? LessonId, string Name, string Path, string Type, long Size);
    public sealed record RubricRequest(long? Id, long? AssignmentId, string Name, int Weight, int Order);

    [HttpGet]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Read(long courseId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        await using var tx = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        if (!await db.LearningCourses.AnyAsync(x => x.Id == courseId && x.TeacherId == userId, ct)) return NotFound();
        var chapters = await db.CourseChapters.AsNoTracking().Where(x => x.CourseId == courseId).OrderBy(x => x.Order).ToListAsync(ct);
        var chapterIds = chapters.Select(x => x.Id).ToList();
        var lessons = await db.CourseLessons.AsNoTracking().Where(x => chapterIds.Contains(x.ChapterId)).OrderBy(x => x.Order).ToListAsync(ct);
        var lessonIds = lessons.Select(x => x.Id).ToList();
        var assignments = await db.Assignments.AsNoTracking().Where(x => lessonIds.Contains(x.LessonId)).ToListAsync(ct);
        var assignmentIds = assignments.Select(x => x.Id).ToList();
        var attachments = await db.CourseAttachments.AsNoTracking().Where(x => lessonIds.Contains(x.LessonId)).ToListAsync(ct);
        var rubrics = await db.CourseRubrics.AsNoTracking().Where(x => assignmentIds.Contains(x.AssignmentId)).OrderBy(x => x.Order).ToListAsync(ct);
        var version = await ComputeVersion(courseId, ct);
        await tx.CommitAsync(ct);
        return Ok(new {
            version,
            chapters = chapters.Select(x => new { ma_chuong = x.Id, ma_khoa_hoc = x.CourseId, tieu_de = x.Title, thu_tu = x.Order }),
            lessons = lessons.Select(x => new { ma_bai_hoc = x.Id, ma_chuong = x.ChapterId, tieu_de = x.Title, thu_tu = x.Order,
                noi_dung_van_ban = x.TextContent, duong_dan_anh = x.ImagePath, lien_ket_video = x.VideoUrl, bat_buoc = x.Required }),
            assignments = assignments.Select(x => new { ma_bai_tap = x.Id, ma_bai_hoc = x.LessonId, de_bai = x.Prompt, han_nop = x.Deadline, bat_buoc = x.Required }),
            attachments = attachments.Select(x => new { ma_tep = x.Id, ma_bai_hoc = x.LessonId, ten_tep = x.Name, duong_dan = x.Path, loai_tep = x.Type, dung_luong = x.Size }),
            rubrics = rubrics.Select(x => new { ma_tieu_chi = x.Id, ma_bai_tap = x.AssignmentId, ten_tieu_chi = x.Name, ty_trong = x.Weight, thu_tu = x.Order })
        });
    }

    [HttpGet("version")]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Version(long courseId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (!await db.LearningCourses.AnyAsync(item => item.Id == courseId &&
            item.TeacherId == userId, ct))
            return NotFound();
        return Ok(new { version = await ComputeVersion(courseId, ct) });
    }

    [HttpPut]
    [Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Replace(long courseId, EditorRequest request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (request.Chapters is null || request.Lessons is null || request.Assignments is null ||
            request.Attachments is null || request.Rubrics is null || string.IsNullOrWhiteSpace(request.ExpectedVersion))
            return BadRequest(new { detail = "Thiếu nội dung hoặc phiên bản editor." });
        if (request.Chapters.Count > 200 || request.Lessons.Count > 1000 ||
            request.Assignments.Count > 1000 || request.Attachments.Count > 2000 || request.Rubrics.Count > 5000)
            return BadRequest(new { detail = "Nội dung khóa học vượt quá giới hạn." });
        static bool ValidIds(IEnumerable<long?> ids) {
            var values = ids.ToList();
            return values.All(id => id.HasValue && id != 0) && values.Distinct().Count() == values.Count;
        }
        if (!ValidIds(request.Chapters.Select(x => x.Id)) || !ValidIds(request.Lessons.Select(x => x.Id)) ||
            !ValidIds(request.Assignments.Select(x => x.Id)) ||
            request.Attachments.Where(x => x.Id > 0).GroupBy(x => x.Id).Any(g => g.Count() > 1) ||
            request.Rubrics.Where(x => x.Id > 0).GroupBy(x => x.Id).Any(g => g.Count() > 1) ||
            request.Chapters.Any(x => string.IsNullOrWhiteSpace(x.Title) || x.Title.Trim().Length > 200 || x.Order < 1) ||
            request.Lessons.Any(x => string.IsNullOrWhiteSpace(x.Title) || x.Title.Trim().Length > 200 || x.Order < 1) ||
            request.Assignments.Any(x => string.IsNullOrWhiteSpace(x.Prompt) || x.Prompt.Trim().Length > 10000) ||
            request.Attachments.Any(x => string.IsNullOrWhiteSpace(x.Name) || x.Name.Length > 255 ||
                string.IsNullOrWhiteSpace(x.Path) || x.Path.Length > 500 || x.Size <= 0 ||
                x.Type is not ("IMAGE" or "DOCUMENT" or "REFERENCE")) ||
            request.Rubrics.Any(x => string.IsNullOrWhiteSpace(x.Name) || x.Name.Length > 255 || x.Weight is < 1 or > 100 || x.Order < 1))
            return BadRequest(new { detail = "Nội dung editor không hợp lệ." });
        var chapterIds = request.Chapters.Select(x => x.Id!.Value).ToHashSet();
        var lessonIds = request.Lessons.Select(x => x.Id!.Value).ToHashSet();
        var assignmentIds = request.Assignments.Select(x => x.Id!.Value).ToHashSet();
        if (request.Lessons.Any(x => x.ChapterId is null || !chapterIds.Contains(x.ChapterId.Value)) ||
            request.Assignments.Any(x => x.LessonId is null || !lessonIds.Contains(x.LessonId.Value)) ||
            request.Attachments.Any(x => x.LessonId is null || !lessonIds.Contains(x.LessonId.Value)) ||
            request.Rubrics.Any(x => x.AssignmentId is null || !assignmentIds.Contains(x.AssignmentId.Value)) ||
            request.Chapters.GroupBy(x => x.Order).Any(g => g.Count() > 1) ||
            request.Lessons.GroupBy(x => (x.ChapterId, x.Order)).Any(g => g.Count() > 1) ||
            request.Assignments.GroupBy(x => x.LessonId).Any(g => g.Count() > 1))
            return BadRequest(new { detail = "Quan hệ hoặc thứ tự nội dung không hợp lệ." });
        await using var transaction = await db.Database.BeginTransactionAsync(System.Data.IsolationLevel.Serializable, ct);
        // Lock the parent row so publication cannot race with an editor write.
        var course = db.Database.IsNpgsql()
            ? await db.LearningCourses.FromSqlInterpolated($"SELECT * FROM public.khoa_hoc WHERE ma_khoa_hoc = {courseId} FOR UPDATE").SingleOrDefaultAsync(ct)
            : await db.LearningCourses.SingleOrDefaultAsync(x => x.Id == courseId, ct);
        if (course is null || course.TeacherId != userId) return NotFound();
        if (course.Status != "NHAP") return Conflict(new { detail = "Chỉ có thể sửa nội dung khóa học nháp." });
        var currentVersion = await ComputeVersion(courseId, ct);
        if (!string.Equals(request.ExpectedVersion, currentVersion, StringComparison.Ordinal))
            return Conflict(new { detail = "Nội dung đã thay đổi. Tải lại trước khi lưu.", code = "EDITOR_VERSION_CONFLICT" });
        var oldChapters = await db.CourseChapters.Where(x => x.CourseId == courseId).ToListAsync(ct);
        var oldChapterIds = oldChapters.Select(x => x.Id).ToList();
        var oldLessons = await db.CourseLessons.Where(x => oldChapterIds.Contains(x.ChapterId)).ToListAsync(ct);
        var oldLessonIds = oldLessons.Select(x => x.Id).ToList();
        var oldAssignments = await db.Assignments.Where(x => oldLessonIds.Contains(x.LessonId)).ToListAsync(ct);
        var oldAssignmentIds = oldAssignments.Select(x => x.Id).ToList();
        var oldAttachments = await db.CourseAttachments.Where(x => oldLessonIds.Contains(x.LessonId)).ToListAsync(ct);
        var oldRubrics = await db.CourseRubrics.Where(x => oldAssignmentIds.Contains(x.AssignmentId)).ToListAsync(ct);
        // Reparenting is not supported by the editor; reject it before deleting any parent.
        if (request.Lessons.Any(x => oldLessons.Any(y => y.Id == x.Id && y.ChapterId != x.ChapterId)) ||
            request.Assignments.Any(x => oldAssignments.Any(y => y.Id == x.Id && y.LessonId != x.LessonId)))
            return BadRequest(new { detail = "Không thể chuyển nội dung hiện có sang chương hoặc bài học khác." });
        if (chapterIds.Any(id => id > 0 && !oldChapterIds.Contains(id)) ||
            lessonIds.Any(id => id > 0 && !oldLessonIds.Contains(id)) ||
            assignmentIds.Any(id => id > 0 && !oldAssignmentIds.Contains(id)) ||
            request.Attachments.Any(x => x.Id > 0 && !oldAttachments.Any(y => y.Id == x.Id)) ||
            request.Rubrics.Any(x => x.Id > 0 && !oldRubrics.Any(y => y.Id == x.Id)))
            return BadRequest(new { detail = "ID nội dung không thuộc khóa học." });
        if (request.Attachments.Any(x => !oldAttachments.Any(y => y.Id == x.Id && y.Path == x.Path) &&
            !CourseMediaController.IsOwnedPath(courseId, x.Path)))
            return BadRequest(new { detail = "Tệp không thuộc khóa học." });
        var removedLessons = oldLessons.Where(x => !lessonIds.Contains(x.Id)).Select(x => x.Id).ToList();
        var removedAssignments = oldAssignments.Where(x => !assignmentIds.Contains(x.Id)).Select(x => x.Id).ToList();
        if (await db.LessonProgress.AnyAsync(x => removedLessons.Contains(x.LessonId), ct) ||
            await db.Submissions.AnyAsync(x => removedAssignments.Contains(x.AssignmentId), ct))
            return Conflict(new { code = "EDITOR_CONTENT_IN_USE", detail = "Không thể xóa nội dung đã có tiến độ hoặc bài nộp." });
        db.CourseRubrics.RemoveRange(oldRubrics.Where(x => !request.Rubrics.Any(y => y.Id == x.Id)));
        db.CourseAttachments.RemoveRange(oldAttachments.Where(x => !request.Attachments.Any(y => y.Id == x.Id)));
        db.Assignments.RemoveRange(oldAssignments.Where(x => removedAssignments.Contains(x.Id)));
        await db.SaveChangesAsync(ct);
        db.CourseLessons.RemoveRange(oldLessons.Where(x => removedLessons.Contains(x.Id)));
        await db.SaveChangesAsync(ct);
        db.CourseChapters.RemoveRange(oldChapters.Where(x => !chapterIds.Contains(x.Id)));
        await db.SaveChangesAsync(ct);
        // Move existing orders above both old/new ranges before swaps (positive UNIQUE order constraints).
        var chapterOffset = Math.Max(oldChapters.Select(x => x.Order).DefaultIfEmpty().Max(), request.Chapters.Select(x => x.Order).DefaultIfEmpty().Max());
        var lessonOffset = Math.Max(oldLessons.Select(x => x.Order).DefaultIfEmpty().Max(), request.Lessons.Select(x => x.Order).DefaultIfEmpty().Max());
        if (chapterOffset > int.MaxValue - 1200 || lessonOffset > int.MaxValue - 1200)
            return BadRequest(new { detail = "Thứ tự nội dung vượt giới hạn." });
        var index = 0;
        foreach (var row in oldChapters.Where(x => chapterIds.Contains(x.Id))) row.Order = chapterOffset + ++index;
        index = 0;
        foreach (var row in oldLessons.Where(x => lessonIds.Contains(x.Id))) row.Order = lessonOffset + ++index;
        await db.SaveChangesAsync(ct);
        var chapters = new Dictionary<long, CourseChapter>();
        foreach (var item in request.Chapters) {
            var row = oldChapters.SingleOrDefault(x => x.Id == item.Id) ?? new CourseChapter { CourseId = courseId };
            if (row.Id == 0) db.CourseChapters.Add(row);
            row.Title = item.Title.Trim(); row.Order = item.Order; chapters.Add(item.Id!.Value, row);
        }
        await db.SaveChangesAsync(ct);
        var lessons = new Dictionary<long, CourseLesson>();
        foreach (var item in request.Lessons) {
            var row = oldLessons.SingleOrDefault(x => x.Id == item.Id) ?? new CourseLesson();
            if (row.Id == 0) db.CourseLessons.Add(row);
            row.ChapterId = chapters[item.ChapterId!.Value].Id; row.Title = item.Title.Trim(); row.Order = item.Order;
            row.TextContent = item.TextContent; row.ImagePath = item.ImagePath; row.VideoUrl = item.VideoUrl; row.Required = item.Required;
            lessons.Add(item.Id!.Value, row);
        }
        await db.SaveChangesAsync(ct);
        var assignments = new Dictionary<long, Assignment>();
        foreach (var item in request.Assignments) {
            var row = oldAssignments.SingleOrDefault(x => x.Id == item.Id) ?? new Assignment();
            if (row.Id == 0) db.Assignments.Add(row);
            row.LessonId = lessons[item.LessonId!.Value].Id; row.Prompt = item.Prompt.Trim(); row.Deadline = item.Deadline; row.Required = item.Required;
            assignments.Add(item.Id!.Value, row);
        }
        await db.SaveChangesAsync(ct);
        foreach (var item in request.Attachments) {
            var row = oldAttachments.SingleOrDefault(x => x.Id == item.Id) ?? new CourseAttachmentContent();
            if (row.Id == 0) db.CourseAttachments.Add(row);
            row.LessonId = lessons[item.LessonId!.Value].Id; row.Name = item.Name.Trim(); row.Path = item.Path;
            row.Type = item.Type; row.Size = item.Size;
        }
        foreach (var item in request.Rubrics) {
            var row = oldRubrics.SingleOrDefault(x => x.Id == item.Id) ?? new CourseRubricContent();
            if (row.Id == 0) db.CourseRubrics.Add(row);
            row.AssignmentId = assignments[item.AssignmentId!.Value].Id; row.Name = item.Name.Trim(); row.Weight = item.Weight; row.Order = item.Order;
        }
        await db.SaveChangesAsync(ct);
        var version = await ComputeVersion(courseId, ct);
        await transaction.CommitAsync(ct);
        return Ok(new { courseId, chapters = chapters.Count, lessons = lessons.Count,
            chapterIds = request.Chapters.Select(x => chapters[x.Id!.Value].Id).ToArray(),
            lessonIds = request.Lessons.Select(x => lessons[x.Id!.Value].Id).ToArray(),
            assignmentIds = request.Assignments.Select(x => assignments[x.Id!.Value].Id).ToArray(), version });
    }

    private async Task<string> ComputeVersion(long courseId, CancellationToken ct)
    {
        var chapters = await db.CourseChapters.AsNoTracking().Where(item => item.CourseId == courseId)
            .OrderBy(item => item.Id).Select(item => $"{item.Id}|{item.Title}|{item.Order}").ToListAsync(ct);
        var lessons = await (from lesson in db.CourseLessons.AsNoTracking()
                             join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                             where chapter.CourseId == courseId
                             orderby lesson.Id
                             select $"{lesson.Id}|{lesson.ChapterId}|{lesson.Title}|{lesson.Order}|{lesson.TextContent}|{lesson.ImagePath}|{lesson.VideoUrl}|{lesson.Required}")
            .ToListAsync(ct);
        var assignments = await (from assignment in db.Assignments.AsNoTracking()
                                 join lesson in db.CourseLessons on assignment.LessonId equals lesson.Id
                                 join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                                 where chapter.CourseId == courseId
                                 orderby assignment.Id
                                 select $"{assignment.Id}|{assignment.LessonId}|{assignment.Prompt}|{assignment.Deadline}|{assignment.Required}")
            .ToListAsync(ct);
        var attachments = await (from attachment in db.CourseAttachments.AsNoTracking()
                                 join lesson in db.CourseLessons on attachment.LessonId equals lesson.Id
                                 join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                                 where chapter.CourseId == courseId
                                 orderby attachment.Id
                                 select $"{attachment.Id}|{attachment.LessonId}|{attachment.Name}|{attachment.Path}|{attachment.Type}|{attachment.Size}")
            .ToListAsync(ct);
        var rubrics = await (from rubric in db.CourseRubrics.AsNoTracking()
                             join assignment in db.Assignments on rubric.AssignmentId equals assignment.Id
                             join lesson in db.CourseLessons on assignment.LessonId equals lesson.Id
                             join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                             where chapter.CourseId == courseId
                             orderby rubric.Id
                             select $"{rubric.Id}|{rubric.AssignmentId}|{rubric.Name}|{rubric.Weight}|{rubric.Order}")
            .ToListAsync(ct);
        var value = string.Join("\n", chapters.Concat(lessons).Concat(assignments).Concat(attachments).Concat(rubrics));
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value)));
    }
}
