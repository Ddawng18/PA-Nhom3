using System.Text.Json;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/assignments"), Authorize]
public sealed class AssignmentsController(AppDbContext db, AssignmentStorage storage, LearningProgressService progress) : ControllerBase
{
    private IQueryable<AssignmentCourse> Contexts =>
        from a in db.Assignments
        join l in db.CourseLessons on a.LessonId equals l.Id
        join c in db.CourseChapters on l.ChapterId equals c.Id
        join course in db.LearningCourses on c.CourseId equals course.Id
        select new AssignmentCourse { Id = a.Id, LessonId = l.Id, CourseId = course.Id, TeacherId = course.TeacherId, Status = course.Status };

    [HttpGet]
    public async Task<IActionResult> List(long? lessonId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var visible = Contexts.Where(c => c.Status == "DA_DANG" && db.CourseEnrollments.Any(e =>
            e.UserId == userId && e.CourseId == c.CourseId && (e.Status == "DANG_HOC" || e.Status == "HOAN_THANH")));
        if (lessonId.HasValue) visible = visible.Where(c => c.LessonId == lessonId.Value);
        var rows = await (from a in db.Assignments.AsNoTracking()
                          join c in visible on a.Id equals c.Id
                          join l in db.CourseLessons on a.LessonId equals l.Id
                          orderby c.CourseId, c.LessonId, a.Id
                          select new { id = a.Id, lessonId = a.LessonId, courseId = c.CourseId,
                              lessonTitle = l.Title, prompt = a.Prompt, deadline = a.Deadline, required = a.Required })
            .ToListAsync(ct);
        var ids = rows.Select(a => a.id).ToList();
        var submissions = await db.Submissions.AsNoTracking().Where(s => s.UserId == userId && ids.Contains(s.AssignmentId)).ToListAsync(ct);
        var submissionIds = submissions.Select(s => s.Id).ToList();
        var grades = await db.Grades.AsNoTracking().Where(g => submissionIds.Contains(g.SubmissionId)).ToListAsync(ct);
        return Ok(rows.Select(a => new { a.id, a.lessonId, a.courseId, a.lessonTitle, a.prompt, a.deadline, a.required,
            submission = SubmissionView(submissions.SingleOrDefault(s => s.AssignmentId == a.id), grades) }));
    }

    [HttpPost("{id:long}/submission"), Authorize(Policy = AuthPolicies.StudentOnly)]
    [RequestSizeLimit(11 * 1024 * 1024), RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    public async Task<IActionResult> Submit(long id, [FromForm] IFormFile file, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var context = await Contexts.SingleOrDefaultAsync(c => c.Id == id, ct);
        if (context is null) return NotFound();
        await using var tx = await progress.BeginAsync(userId, context.CourseId, ct);
        if (context.Status != "DA_DANG" || !await Enrolled(userId, context.CourseId, ct)) return Forbid();
        var assignment = await db.Assignments.SingleAsync(a => a.Id == id, ct);
        var submission = await db.Submissions.SingleOrDefaultAsync(s => s.AssignmentId == id && s.UserId == userId, ct);
        if (submission?.Status == "DA_CHAM" || (submission is not null && await db.Grades.AnyAsync(g => g.SubmissionId == submission.Id, ct)))
            return Conflict(new { detail = "Bài đã chấm không thể nộp lại." });
        if (assignment.Deadline is { } deadline && DateTimeOffset.UtcNow > deadline)
            return Conflict(new { detail = "Đã hết hạn nộp bài." });
        var saved = await storage.Files.SaveAsync(file, ct);
        if (!saved.Success) return StatusCode(saved.StatusCode, new { detail = saved.Message, code = saved.Code });
        var oldPath = submission?.ImagePath;
        var now = DateTimeOffset.UtcNow;
        if (submission is null)
        {
            submission = new AssignmentSubmission { AssignmentId = id, UserId = userId, SubmittedAt = now };
            db.Submissions.Add(submission);
        }
        submission.ImagePath = saved.File!.FilePath;
        submission.UpdatedAt = now;
        submission.Status = "CHO_CHAM";
        db.Notifications.Add(new NotificationMessage { UserId = context.TeacherId, Type = "loi_nhan",
            Content = "Có bài tập mới đang chờ chấm.", Link = $"/teacher/courses/{context.CourseId}/submissions", CreatedAt = now });
        await db.SaveChangesAsync(ct);
        await progress.RefreshAsync(userId, context.CourseId, ct);
        await tx.CommitAsync(ct);
        await storage.DeleteReplacedAsync(oldPath);
        return Ok(SubmissionView(submission, []));
    }

    [HttpGet("teacher"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Teacher(long courseId, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (!await db.LearningCourses.AnyAsync(c => c.Id == courseId && c.TeacherId == userId, ct)) return NotFound();
        var contexts = Contexts.Where(c => c.CourseId == courseId && c.TeacherId == userId);
        var assignments = await db.Assignments.AsNoTracking().Where(a => contexts.Any(c => c.Id == a.Id))
            .Select(a => new { id = a.Id, lessonId = a.LessonId, prompt = a.Prompt, deadline = a.Deadline, required = a.Required }).ToListAsync(ct);
        var submissions = await db.Submissions.AsNoTracking().Where(s => contexts.Any(c => c.Id == s.AssignmentId))
            .OrderByDescending(s => s.UpdatedAt).ToListAsync(ct);
        var grades = await db.Grades.AsNoTracking().Where(g => db.Submissions.Any(s => s.Id == g.SubmissionId && contexts.Any(c => c.Id == s.AssignmentId))).ToListAsync(ct);
        var lessons = await (from l in db.CourseLessons.AsNoTracking() join c in db.CourseChapters on l.ChapterId equals c.Id
                            where c.CourseId == courseId orderby c.Order, l.Order select new { id = l.Id, title = l.Title }).ToListAsync(ct);
        return Ok(new { assignments, lessons, submissions = submissions.Select(s => new { id = s.Id, assignmentId = s.AssignmentId,
            studentId = s.UserId, status = s.Status, submittedAt = s.SubmittedAt, updatedAt = s.UpdatedAt,
            grade = grades.SingleOrDefault(g => g.SubmissionId == s.Id) is { } g ? GradeView(g) : null }) });
    }

    public sealed record SaveAssignment(long LessonId, string Prompt, DateTimeOffset? Deadline, bool Required);

    [HttpPost("teacher"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Create(SaveAssignment request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (string.IsNullOrWhiteSpace(request.Prompt) || request.Prompt.Trim().Length > 10000 || request.Deadline <= DateTimeOffset.UtcNow)
            return BadRequest(new { detail = "Nhập đề bài (tối đa 10.000 ký tự) và hạn nộp trong tương lai hoặc bỏ trống." });
        var ownsDraft = await (from l in db.CourseLessons join c in db.CourseChapters on l.ChapterId equals c.Id
                              join course in db.LearningCourses on c.CourseId equals course.Id
                              where l.Id == request.LessonId && course.TeacherId == userId && course.Status == "NHAP"
                              select l.Id).AnyAsync(ct);
        if (!ownsDraft) return Conflict(new { detail = "Chỉ thêm bài tập vào khóa học nháp của bạn." });
        var assignment = new Assignment { LessonId = request.LessonId, Prompt = request.Prompt.Trim(), Deadline = request.Deadline, Required = request.Required };
        db.Assignments.Add(assignment);
        await db.SaveChangesAsync(ct);
        return Ok(new { id = assignment.Id });
    }

    public sealed record GradeRequest(decimal Score, string Feedback, DateTimeOffset ExpectedUpdatedAt, DateTimeOffset? ExpectedGradedAt);

    [HttpPut("submissions/{id:long}/grade"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Grade(long id, GradeRequest request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (request.Score is < 0 or > 10 || decimal.Round(request.Score, 2) != request.Score ||
            string.IsNullOrWhiteSpace(request.Feedback) || request.Feedback.Trim().Length > 2000)
            return BadRequest(new { detail = "Điểm từ 0 đến 10, tối đa 2 số thập phân; nhận xét từ 1 đến 2.000 ký tự." });
        var target = await (from s in db.Submissions join c in Contexts on s.AssignmentId equals c.Id
                            where s.Id == id && c.TeacherId == userId select new { s.UserId, c.CourseId }).SingleOrDefaultAsync(ct);
        if (target is null) return NotFound();
        await using var tx = await progress.BeginAsync(target.UserId, target.CourseId, ct);
        var submission = await db.Submissions.SingleAsync(s => s.Id == id, ct);
        var grade = await db.Grades.SingleOrDefaultAsync(g => g.SubmissionId == id, ct);
        if (submission.UpdatedAt != request.ExpectedUpdatedAt || grade?.GradedAt != request.ExpectedGradedAt)
            return Conflict(new { detail = "Bài nộp hoặc điểm đã thay đổi. Tải lại trước khi chấm." });
        var previous = grade is null ? null : JsonSerializer.Serialize(GradeView(grade));
        if (grade is null) { grade = new SubmissionGrade { SubmissionId = id }; db.Grades.Add(grade); }
        grade.Score = request.Score; grade.Feedback = request.Feedback.Trim();
        grade.GraderId = userId; grade.GradedAt = DateTimeOffset.UtcNow;
        submission.Status = "DA_CHAM";
        db.StatusHistory.Add(new StatusHistoryEntry { ObjectType = "BAI_NOP", ObjectId = id.ToString(),
            PreviousStatus = previous is null ? "CHO_CHAM" : "DA_CHAM", Status = "DA_CHAM", ActorId = userId,
            Reason = JsonSerializer.Serialize(new { previous, current = GradeView(grade) }), OccurredAt = grade.GradedAt });
        db.Notifications.Add(new NotificationMessage { UserId = submission.UserId, Type = "loi_nhan",
            Content = $"Bài tập của bạn đã được chấm: {grade.Score}/10.", Link = $"/courses/{target.CourseId}/learn/{(await Contexts.SingleAsync(c => c.Id == submission.AssignmentId, ct)).LessonId}", CreatedAt = grade.GradedAt });
        await db.SaveChangesAsync(ct);
        await progress.RefreshAsync(submission.UserId, target.CourseId, ct);
        await tx.CommitAsync(ct);
        return Ok(GradeView(grade));
    }

    [HttpGet("submissions/{id:long}/image")]
    public async Task<IActionResult> Image(long id, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var submission = await (from s in db.Submissions.AsNoTracking() join c in Contexts on s.AssignmentId equals c.Id
                                where s.Id == id && (s.UserId == userId || c.TeacherId == userId) select s).SingleOrDefaultAsync(ct);
        if (submission is null) return NotFound();
        Response.Headers.CacheControl = "private, no-store";
        var content = await storage.Files.OpenAsync(submission.ImagePath, ct);
        if (content is null) return NotFound(new { detail = "Không tìm thấy ảnh bài nộp." });
        if (content.RedirectUrl is { } url) return Ok(new { url });
        if (content.LocalPath is { } path) return PhysicalFile(path, content.ContentType);
        return NotFound();
    }

    private Task<bool> Enrolled(Guid userId, long courseId, CancellationToken ct) => db.CourseEnrollments.AnyAsync(e =>
        e.UserId == userId && e.CourseId == courseId && (e.Status == "DANG_HOC" || e.Status == "HOAN_THANH"), ct);
    private static object GradeView(SubmissionGrade g) => new { score = g.Score, feedback = g.Feedback, gradedAt = g.GradedAt };
    private static object? SubmissionView(AssignmentSubmission? s, List<SubmissionGrade> grades) => s is null ? null : new {
        id = s.Id, status = s.Status, submittedAt = s.SubmittedAt, updatedAt = s.UpdatedAt,
        grade = grades.SingleOrDefault(g => g.SubmissionId == s.Id) is { } g ? GradeView(g) : null };
    private sealed class AssignmentCourse
    {
        public long Id { get; init; }
        public long LessonId { get; init; }
        public long CourseId { get; init; }
        public Guid TeacherId { get; init; }
        public string Status { get; init; } = "";
    }
}
