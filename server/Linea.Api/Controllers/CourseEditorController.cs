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
        var course = await db.LearningCourses.SingleOrDefaultAsync(
            item => item.Id == courseId && item.TeacherId == userId, ct);
        if (course is null) return NotFound();
        if (course.Status != "NHAP") return Conflict(new { detail = "Chỉ có thể sửa nội dung khóa học nháp." });
        if (request.Chapters.Count > 200 || request.Lessons.Count > 1000 ||
            request.Assignments.Count > 1000 || request.Attachments.Count > 2000 || request.Rubrics.Count > 5000)
            return BadRequest(new { detail = "Nội dung khóa học vượt quá giới hạn." });

        var chapterIds = request.Chapters.Select(item => item.Id).Where(item => item.HasValue).Select(item => item!.Value).ToHashSet();
        var lessonIds = request.Lessons.Select(item => item.Id).Where(item => item.HasValue).Select(item => item!.Value).ToHashSet();
        var assignmentIds = request.Assignments.Select(item => item.Id).Where(item => item.HasValue).Select(item => item!.Value).ToHashSet();
        if (request.Lessons.Any(item => item.ChapterId is not null && !chapterIds.Contains(item.ChapterId.Value)) ||
            request.Assignments.Any(item => item.LessonId is not null && !lessonIds.Contains(item.LessonId.Value)) ||
            request.Attachments.Any(item => item.LessonId is not null && !lessonIds.Contains(item.LessonId.Value)) ||
            request.Rubrics.Any(item => item.AssignmentId is not null && !assignmentIds.Contains(item.AssignmentId.Value)))
            return BadRequest(new { detail = "Quan hệ nội dung không hợp lệ." });

        await using var transaction = await db.Database.BeginTransactionAsync(
            System.Data.IsolationLevel.Serializable, ct);
        var currentVersion = await ComputeVersion(courseId, ct);
        if (!string.Equals(request.ExpectedVersion, currentVersion, StringComparison.Ordinal))
            return Conflict(new { detail = "Nội dung đã thay đổi. Tải lại trước khi lưu.", code = "EDITOR_VERSION_CONFLICT" });
        db.CourseAttachments.RemoveRange(await db.CourseAttachments.Where(item =>
            db.CourseLessons.Any(lesson => lesson.Id == item.LessonId && db.CourseChapters.Any(chapter => chapter.Id == lesson.ChapterId && chapter.CourseId == courseId))).ToListAsync(ct));
        db.CourseRubrics.RemoveRange(await db.CourseRubrics.Where(item =>
            db.Assignments.Any(assignment => assignment.Id == item.AssignmentId && db.CourseLessons.Any(lesson => lesson.Id == assignment.LessonId && db.CourseChapters.Any(chapter => chapter.Id == lesson.ChapterId && chapter.CourseId == courseId)))).ToListAsync(ct));
        db.Assignments.RemoveRange(await db.Assignments.Where(item =>
            db.CourseLessons.Any(lesson => lesson.Id == item.LessonId && db.CourseChapters.Any(chapter => chapter.Id == lesson.ChapterId && chapter.CourseId == courseId))).ToListAsync(ct));
        db.CourseLessons.RemoveRange(await db.CourseLessons.Where(item =>
            db.CourseChapters.Any(chapter => chapter.Id == item.ChapterId && chapter.CourseId == courseId)).ToListAsync(ct));
        db.CourseChapters.RemoveRange(await db.CourseChapters.Where(item => item.CourseId == courseId).ToListAsync(ct));
        await db.SaveChangesAsync(ct);

        var chapters = request.Chapters.Select(item => new CourseChapter {
            CourseId = courseId, Title = item.Title.Trim(), Order = item.Order
        }).ToList();
        if (chapters.Any(item => item.Title.Length is < 1 or > 200 || item.Order < 1))
            return BadRequest(new { detail = "Tên hoặc thứ tự chương không hợp lệ." });
        db.CourseChapters.AddRange(chapters);
        await db.SaveChangesAsync(ct);

        var chapterMap = request.Chapters.Zip(chapters)
            .Where(pair => pair.First.Id.HasValue)
            .ToDictionary(pair => pair.First.Id!.Value, pair => pair.Second.Id);
        var lessons = request.Lessons.Select(item => new CourseLesson {
            ChapterId = item.ChapterId is { } chapterId && chapterMap.TryGetValue(chapterId, out var mapped) ? mapped : 0,
            Title = item.Title.Trim(), Order = item.Order, TextContent = item.TextContent,
            ImagePath = item.ImagePath, VideoUrl = item.VideoUrl, Required = item.Required
        }).ToList();
        if (lessons.Any(item => item.ChapterId == 0 || item.Title.Length is < 1 or > 200 || item.Order < 1))
            return BadRequest(new { detail = "Nội dung bài học không hợp lệ." });
        db.CourseLessons.AddRange(lessons);
        await db.SaveChangesAsync(ct);

        var lessonMap = request.Lessons.Zip(lessons)
            .Where(pair => pair.First.Id.HasValue)
            .ToDictionary(pair => pair.First.Id!.Value, pair => pair.Second.Id);
        var assignments = request.Assignments.Select(item => new Assignment {
            LessonId = item.LessonId is { } lessonId && lessonMap.TryGetValue(lessonId, out var mapped) ? mapped : 0,
            Prompt = item.Prompt.Trim(), Deadline = item.Deadline, Required = item.Required
        }).ToList();
        if (assignments.Any(item => item.LessonId == 0 || item.Prompt.Length is < 1 or > 10000))
            return BadRequest(new { detail = "Bài tập không hợp lệ." });
        if (request.Attachments.Any(item => item.LessonId is null || item.Name.Trim().Length is < 1 or > 255 ||
            item.Path.Trim().Length is < 1 or > 500 || item.Size <= 0 ||
            item.Type is not ("IMAGE" or "DOCUMENT" or "REFERENCE")))
            return BadRequest(new { detail = "Tệp đính kèm không hợp lệ." });
        db.Assignments.AddRange(assignments);
        db.CourseAttachments.AddRange(request.Attachments.Select(item => new CourseAttachmentContent {
            LessonId = item.LessonId is { } lessonId && lessonMap.TryGetValue(lessonId, out var mapped) ? mapped : 0,
            Name = item.Name.Trim(), Path = item.Path.Trim(), Type = item.Type, Size = item.Size
        }));
        await db.SaveChangesAsync(ct);
        var assignmentMap = request.Assignments.Zip(assignments)
            .Where(pair => pair.First.Id.HasValue)
            .ToDictionary(pair => pair.First.Id!.Value, pair => pair.Second.Id);
        db.CourseRubrics.AddRange(request.Rubrics.Select(item => new CourseRubricContent {
            AssignmentId = item.AssignmentId is { } assignmentId && assignmentMap.TryGetValue(assignmentId, out var mapped) ? mapped : 0,
            Name = item.Name.Trim(), Weight = item.Weight, Order = item.Order
        }));
        if (request.Rubrics.Any(item => item.AssignmentId is null || item.Name.Trim().Length is < 1 or > 255 || item.Weight is < 1 or > 100 || item.Order < 1))
            return BadRequest(new { detail = "Tiêu chí chấm điểm không hợp lệ." });
        await db.SaveChangesAsync(ct);
        await transaction.CommitAsync(ct);
        return Ok(new { courseId, chapters = chapters.Count, lessons = lessons.Count,
            chapterIds = chapters.Select(item => item.Id).ToArray(),
            lessonIds = lessons.Select(item => item.Id).ToArray(),
            assignmentIds = assignments.Select(item => item.Id).ToArray(),
            version = await ComputeVersion(courseId, ct) });
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
