using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/courses")]
public sealed class CoursesController(AppDbContext db, LearningProgressService progressService) : ControllerBase
{
    [HttpGet("mine"), Authorize]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var rows = await (from e in db.CourseEnrollments.AsNoTracking()
                          join c in db.LearningCourses.AsNoTracking() on e.CourseId equals c.Id
                          where e.UserId == userId && e.Status != "DA_HUY"
                          orderby e.EnrolledAt descending
                          select new { id = c.Id, title = c.Title, level = c.Level, status = e.Status,
                              available = c.Status == "DA_DANG", coverImage = c.CoverImage }).ToListAsync(ct);
        var ids = rows.Select(c => c.id).ToList();
        var lessons = await (from l in db.CourseLessons.AsNoTracking() join c in db.CourseChapters on l.ChapterId equals c.Id
                             where ids.Contains(c.CourseId) && l.Required select new { l.Id, c.CourseId }).ToListAsync(ct);
        var lessonIds = lessons.Select(l => l.Id).ToList();
        var completed = await db.LessonProgress.AsNoTracking().Where(p => p.UserId == userId &&
            lessonIds.Contains(p.LessonId) && p.Status == "DA_HOAN_THANH").Select(p => p.LessonId).ToListAsync(ct);
        return Ok(rows.Select(c => new { c.id, c.title, c.level, c.status, c.available, c.coverImage,
            totalLessons = lessons.Count(l => l.CourseId == c.id),
            completedLessons = lessons.Count(l => l.CourseId == c.id && completed.Contains(l.Id)),
            percent = lessons.Count(l => l.CourseId == c.id) is var count && count > 0
                ? (int)Math.Round(100d * lessons.Count(l => l.CourseId == c.id && completed.Contains(l.Id)) / count) : 0 }));
    }

    [HttpGet("enrolled"), Authorize(Policy = AuthPolicies.StudentOnly)]
    public async Task<IActionResult> Enrolled(CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var rows = await db.CourseEnrollments.AsNoTracking()
            .Where(item => item.UserId == userId && item.Status != "DA_HUY")
            .Select(item => new { ma_khoa_hoc = item.CourseId, trang_thai = item.Status })
            .ToListAsync(cancellationToken);
        return Ok(rows);
    }

    [HttpGet, AllowAnonymous]
    public async Task<IActionResult> List(int page = 1, int pageSize = 20, string? search = null,
        bool mine = false, CancellationToken cancellationToken = default)
    {
        page = Math.Clamp(page, 1, 1000000); pageSize = Math.Clamp(pageSize, 1, 100);
        User.TryGetUserId(out var userId);
        if (mine && userId == Guid.Empty) return Unauthorized();
        var query = db.LearningCourses.AsNoTracking().AsQueryable();
        if (mine) query = query.Where(item => item.TeacherId == userId);
        else if (!User.IsAdmin()) query = query.Where(item => item.Status == "DA_DANG" || item.TeacherId == userId);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            query = query.Where(item => item.Title.ToLower().Contains(term) || item.Description.ToLower().Contains(term));
        }
        var total = await query.CountAsync(cancellationToken);
        var rows = await query.OrderByDescending(item => item.Id).Skip((page - 1) * pageSize)
            .Take(pageSize).ToListAsync(cancellationToken);
        return Ok(new { items = rows.Select(LearningCourseResponse.From), page, pageSize, totalCount = total });
    }

    [HttpGet("{id:long}"), AllowAnonymous]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || (course.Status != "DA_DANG" && !Owns(course) && !User.IsAdmin())) return NotFound();
        return Ok(LearningCourseResponse.From(course));
    }

    [HttpGet("{id:long}/learning"), Authorize]
    public async Task<IActionResult> Learning(long id, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var course = await db.LearningCourses.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.Status == "DA_DANG", cancellationToken);
        if (course is null) return NotFound();

        var enrollment = await db.CourseEnrollments.AsNoTracking()
            .SingleOrDefaultAsync(item => item.CourseId == id && item.UserId == userId && item.Status != "DA_HUY", cancellationToken);
        var chapters = await db.CourseChapters.AsNoTracking()
            .Where(item => item.CourseId == id).OrderBy(item => item.Order).ToListAsync(cancellationToken);
        var lessons = await db.CourseLessons.AsNoTracking()
            .Where(item => chapters.Select(chapter => chapter.Id).Contains(item.ChapterId))
            .OrderBy(item => item.Order).ToListAsync(cancellationToken);
        var progress = await db.LessonProgress.AsNoTracking()
            .Where(item => item.UserId == userId && lessons.Select(lesson => lesson.Id).Contains(item.LessonId))
            .ToDictionaryAsync(item => item.LessonId, cancellationToken);
        var requiredLessons = lessons.Where(item => item.Required).ToList();
        var completed = requiredLessons.Count(item =>
            progress.TryGetValue(item.Id, out var itemProgress) && itemProgress.Status == "DA_HOAN_THANH");
        var percent = requiredLessons.Count == 0 ? 0 : (int)Math.Round(completed * 100d / requiredLessons.Count);
        var summaries = chapters.Select(chapter => new LearnerChapterSummary(
            chapter.Id, chapter.Title, chapter.Order,
            lessons.Where(lesson => lesson.ChapterId == chapter.Id)
                .OrderBy(lesson => lesson.Order)
                .Select(lesson => new LearnerLessonSummary(
                    lesson.Id, lesson.Title, lesson.Order,
                    progress.TryGetValue(lesson.Id, out var itemProgress) ? itemProgress.Status : "CHUA_HOC"))
                .ToList())).ToList();

        return Ok(new LearnerCourseResponse(
            course.Id, course.Title, course.Description, course.Level, course.Topic,
            course.CoverImage, course.TeacherId, enrollment is not null, percent, summaries, enrollment?.Status));
    }

    [HttpPost("{id:long}/enroll"), Authorize(Policy = AuthPolicies.StudentOnly)]
    public async Task<IActionResult> Enroll(long id, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var course = await db.LearningCourses.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.Status == "DA_DANG", cancellationToken);
        if (course is null) return NotFound();
        await using var tx = await progressService.BeginAsync(userId, id, cancellationToken);
        var enrollment = await db.CourseEnrollments
            .SingleOrDefaultAsync(item => item.CourseId == id && item.UserId == userId, cancellationToken);
        if (enrollment is null)
        {
            enrollment = new CourseEnrollment { UserId = userId, CourseId = id };
            db.CourseEnrollments.Add(enrollment);
            await db.SaveChangesAsync(cancellationToken);
        }
        else if (enrollment.Status == "DA_HUY")
        {
            enrollment.Status = "DANG_HOC";
            enrollment.CompletedAt = null;
            await db.SaveChangesAsync(cancellationToken);
        }
        await progressService.RefreshAsync(userId, id, cancellationToken);
        await tx.CommitAsync(cancellationToken);
        return Ok(new { ma_khoa_hoc = id, trang_thai = enrollment.Status });
    }

    [HttpGet("{courseId:long}/lessons/{lessonId:long}"), Authorize]
    public async Task<IActionResult> Lesson(long courseId, long lessonId, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var enrolled = await db.CourseEnrollments.AsNoTracking()
            .AnyAsync(item => item.CourseId == courseId && item.UserId == userId && (item.Status == "DANG_HOC" || item.Status == "HOAN_THANH"), cancellationToken);
        if (!enrolled) return Forbid();
        if (!await db.LearningCourses.AnyAsync(c => c.Id == courseId && c.Status == "DA_DANG", cancellationToken)) return NotFound();
        var lesson = await (
            from item in db.CourseLessons.AsNoTracking()
            join chapter in db.CourseChapters.AsNoTracking() on item.ChapterId equals chapter.Id
            where item.Id == lessonId && chapter.CourseId == courseId
            select new { item, chapter })
            .SingleOrDefaultAsync(cancellationToken);
        if (lesson is null) return NotFound();
        var itemProgress = await db.LessonProgress.AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId && item.LessonId == lessonId, cancellationToken);
        return Ok(new LearnerLessonResponse(
            lesson.item.Id, courseId, lesson.chapter.Id, lesson.item.Title, lesson.item.TextContent,
            lesson.item.ImagePath, lesson.item.VideoUrl, lesson.item.Required,
            itemProgress?.Status ?? "CHUA_HOC", itemProgress?.Status == "DA_HOAN_THANH" ? 100 : 0));
    }

    [HttpPut("{courseId:long}/lessons/{lessonId:long}/progress"), Authorize(Policy = AuthPolicies.StudentOnly)]
    public async Task<IActionResult> UpdateProgress(
        long courseId, long lessonId, UpdateLessonProgressRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (request.Status is not ("DANG_HOC" or "DA_HOAN_THANH"))
            return BadRequest(new { detail = "Trạng thái bài học không hợp lệ." });
        await using var transaction = await progressService.BeginAsync(userId, courseId, cancellationToken);
        if (!await db.LearningCourses.AnyAsync(c => c.Id == courseId && c.Status == "DA_DANG", cancellationToken)) return NotFound();
        var enrolled = await db.CourseEnrollments
            .SingleOrDefaultAsync(item => item.CourseId == courseId && item.UserId == userId && (item.Status == "DANG_HOC" || item.Status == "HOAN_THANH"), cancellationToken);
        if (enrolled is null) return Forbid();
        var lessonBelongs = await (
            from item in db.CourseLessons
            join chapter in db.CourseChapters on item.ChapterId equals chapter.Id
            where item.Id == lessonId && chapter.CourseId == courseId
            select item.Id).AnyAsync(cancellationToken);
        if (!lessonBelongs) return NotFound();

        var now = DateTimeOffset.UtcNow;
        var progress = await db.LessonProgress
            .SingleOrDefaultAsync(item => item.UserId == userId && item.LessonId == lessonId, cancellationToken);
        if (progress is null)
        {
            db.LessonProgress.Add(new LessonProgress {
                UserId = userId, LessonId = lessonId, Status = request.Status,
                StartedAt = now, CompletedAt = request.Status == "DA_HOAN_THANH" ? now : null
            });
        }
        else
        {
            // Opening an already completed lesson must not reset its progress.
            if (progress.Status != "DA_HOAN_THANH") progress.Status = request.Status;
            progress.StartedAt ??= now;
            if (request.Status == "DA_HOAN_THANH") progress.CompletedAt ??= now;
        }
        await db.SaveChangesAsync(cancellationToken);

        await progressService.RefreshAsync(userId, courseId, cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return Ok(new { ma_bai_hoc = lessonId, trang_thai = progress?.Status ?? request.Status });
    }

    [HttpPost, Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Create(SaveLearningCourseRequest request, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var owner)) return Unauthorized();
        var error = Validate(request); if (error is not null) return error;
        var course = new LearningCourse { TeacherId = owner };
        Apply(course, request); db.LearningCourses.Add(course);
        await db.SaveChangesAsync(cancellationToken);
        return CreatedAtAction(nameof(Get), new { id = course.Id }, LearningCourseResponse.From(course));
    }

    [HttpPut("{id:long}"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public async Task<IActionResult> Update(long id, SaveLearningCourseRequest request, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || !Owns(course)) return NotFound();
        var error = Validate(request); if (error is not null) return error;
        var changed = await db.LearningCourses.Where(item => item.Id == id && item.Status == "NHAP")
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Title, request.Title.Trim())
                .SetProperty(item => item.Description, request.Description.Trim())
                .SetProperty(item => item.Level, request.Level).SetProperty(item => item.Topic, request.Topic.Trim())
                .SetProperty(item => item.CoverImage, string.IsNullOrWhiteSpace(request.CoverImage) ? null : request.CoverImage), cancellationToken);
        if (changed == 0) return Conflict(new { detail = "Chỉ được sửa khóa học ở trạng thái nháp." });
        Apply(course, request); return Ok(LearningCourseResponse.From(course));
    }

    [HttpPost("{id:long}/submit"), Authorize(Policy = AuthPolicies.TeacherAccess)]
    public Task<IActionResult> Submit(long id, CancellationToken cancellationToken) =>
        Transition(id, "NHAP", "CHO_DUYET", null, false, cancellationToken);

    [HttpPost("/api/admin/courses/{id:long}/approve"), Authorize(Policy = AuthPolicies.AdminOnly)]
    public Task<IActionResult> Approve(long id, CancellationToken cancellationToken) =>
        Transition(id, "CHO_DUYET", "DA_DANG", null, true, cancellationToken);

    [HttpPost("/api/admin/courses/{id:long}/reject"), Authorize(Policy = AuthPolicies.AdminOnly)]
    public Task<IActionResult> Reject(long id, RejectTeacherProfileRequest request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Trim().Length is < 10 or > 1000)
            return Task.FromResult<IActionResult>(BadRequest(new { detail = "Lý do từ chối cần từ 10 đến 1000 ký tự." }));
        return Transition(id, "CHO_DUYET", "NHAP", request.Reason.Trim(), true, cancellationToken);
    }

    private async Task<IActionResult> Transition(long id, string expected, string next, string? reason,
        bool admin, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.AsNoTracking().SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (course is null || (!admin && !Owns(course))) return NotFound();
        var now = DateTimeOffset.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);
        var changed = await db.LearningCourses.Where(item => item.Id == id && item.Status == expected)
            .ExecuteUpdateAsync(setters => setters.SetProperty(item => item.Status, next), cancellationToken);
        if (changed == 0) return Conflict(new { detail = "Trạng thái khóa học đã thay đổi. Vui lòng tải lại." });
        User.TryGetUserId(out var actorId);
        db.StatusHistory.Add(new StatusHistoryEntry { ObjectType = "KHOA_HOC", ObjectId = id.ToString(),
            PreviousStatus = expected, Status = next, ActorId = actorId, Reason = reason, OccurredAt = now });
        if (admin) db.Notifications.Add(new NotificationMessage { UserId = course.TeacherId, Type = "KHOA_HOC",
            Content = next == "DA_DANG" ? "Khóa học của bạn đã được duyệt." : $"Khóa học cần chỉnh sửa: {reason}",
            Link = $"/teacher/courses/{id}/edit", CreatedAt = now });
        await db.SaveChangesAsync(cancellationToken); await transaction.CommitAsync(cancellationToken);
        return Ok(new { id, status = next, reviewedAt = now, rejectionReason = reason });
    }

    private bool Owns(LearningCourse course) => User.TryGetUserId(out var id) && course.TeacherId == id;
    private IActionResult? Validate(SaveLearningCourseRequest request)
    {
        if (request.Title.Trim().Length < 5 || request.Description.Trim().Length < 50 || request.Topic.Trim().Length < 2)
            return BadRequest(new { detail = "Vui lòng nhập đủ tiêu đề, mô tả và chủ đề khóa học." });
        if (!string.IsNullOrWhiteSpace(request.CoverImage) &&
            (!Uri.TryCreate(request.CoverImage, UriKind.Absolute, out var uri) || uri.Scheme != "https"))
            return BadRequest(new { detail = "Ảnh đại diện phải dùng URL HTTPS." });
        return null;
    }
    private static void Apply(LearningCourse course, SaveLearningCourseRequest request)
    {
        course.Title = request.Title.Trim(); course.Description = request.Description.Trim();
        course.Level = request.Level; course.Topic = request.Topic.Trim();
        course.CoverImage = string.IsNullOrWhiteSpace(request.CoverImage) ? null : request.CoverImage;
    }
}
