using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/teacher")]
[Authorize(Policy = AuthPolicies.TeacherAccess)]
public sealed class TeacherController(AppDbContext db) : ControllerBase
{
    private sealed class PersonName
    {
        public Guid Id { get; set; }
        public string Name { get; set; } = "";
    }

    private sealed class CourseRow
    {
        public long Id { get; set; }
        public string Title { get; set; } = "";
        public string Status { get; set; } = "";
        public string Level { get; set; } = "";
        public string Topic { get; set; } = "";
        public long PriceVnd { get; set; }
        public DateTimeOffset CreatedAt { get; set; }
    }

    private async Task<Dictionary<Guid, string>> DisplayNames(IEnumerable<Guid> ids, CancellationToken ct)
    {
        var values = ids.Distinct().ToArray();
        if (values.Length == 0) return [];
        var rows = await db.Database.SqlQuery<PersonName>($"""
            select id AS "Id", coalesce(nullif(btrim(display_name), ''), 'Học viên LINEA') AS "Name"
            from public.nguoi_dung where id = any({values})
            """).ToListAsync(ct);
        return rows.ToDictionary(row => row.Id, row => row.Name);
    }

    private Task<List<CourseRow>> OwnedCourses(Guid userId, CancellationToken ct) =>
        db.LearningCourses.AsNoTracking().Where(course => course.TeacherId == userId)
            .OrderByDescending(course => course.CreatedAt)
            .Select(course => new CourseRow
            {
                Id = course.Id, Title = course.Title, Status = course.Status, Level = course.Level,
                Topic = course.Topic, PriceVnd = course.PriceVnd, CreatedAt = course.CreatedAt
            }).ToListAsync(ct);

    private IQueryable<long> OwnedAssignmentIds(Guid userId) =>
        from assignment in db.Assignments
        join lesson in db.CourseLessons on assignment.LessonId equals lesson.Id
        join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
        join course in db.LearningCourses on chapter.CourseId equals course.Id
        where course.TeacherId == userId
        select assignment.Id;

    [HttpGet("courses")]
    public async Task<IActionResult> GetCourses(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        return Ok(await OwnedCourses(userId, ct));
    }

    [HttpGet("dashboard")]
    public Task<IActionResult> GetDashboard(CancellationToken ct) => Overview(ct);

    [HttpGet("overview")]
    public async Task<IActionResult> Overview(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var courses = await OwnedCourses(userId, ct);
        var assignmentIds = await OwnedAssignmentIds(userId).ToListAsync(ct);
        var submissions = await db.Submissions.AsNoTracking()
            .Where(item => assignmentIds.Contains(item.AssignmentId))
            .Select(item => new { item.Id, item.AssignmentId, item.UserId, item.Status, item.UpdatedAt })
            .ToListAsync(ct);
        var assignmentCourse = await (from assignment in db.Assignments
                                      join lesson in db.CourseLessons on assignment.LessonId equals lesson.Id
                                      join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                                      join course in db.LearningCourses on chapter.CourseId equals course.Id
                                      where course.TeacherId == userId
                                      select new { AssignmentId = assignment.Id, CourseId = course.Id })
            .ToDictionaryAsync(item => item.AssignmentId, item => item.CourseId, ct);
        var students = await db.CourseEnrollments.AsNoTracking()
            .Where(item => courses.Select(course => course.Id).Contains(item.CourseId)
                && (item.Status == "DANG_HOC" || item.Status == "HOAN_THANH"))
            .Select(item => item.UserId).Distinct().CountAsync(ct);
        var recent = submissions.OrderByDescending(item => item.UpdatedAt).Take(6).ToList();
        var names = await DisplayNames(recent.Select(item => item.UserId), ct);
        return Ok(new
        {
            totals = new
            {
                courses = courses.Count,
                published = courses.Count(course => course.Status == "DA_DANG"),
                drafts = courses.Count(course => course.Status == "NHAP"),
                pendingSubmissions = submissions.Count(item => item.Status == "CHO_CHAM"),
                gradedSubmissions = submissions.Count(item => item.Status == "DA_CHAM"),
                students
            },
            courses = courses.Select(course => new
            {
                course.Id, course.Title, course.Status, course.Level, course.Topic, course.CreatedAt,
                pendingSubmissions = submissions.Count(item => item.Status == "CHO_CHAM"
                    && assignmentCourse.GetValueOrDefault(item.AssignmentId) == course.Id)
            }),
            recentSubmissions = recent.Select(item => new
            {
                item.Id, item.Status, item.UpdatedAt,
                courseId = assignmentCourse.GetValueOrDefault(item.AssignmentId),
                studentId = item.UserId,
                studentName = names.GetValueOrDefault(item.UserId, "Học viên LINEA")
            })
        });
    }

    [HttpGet("submissions")]
    public async Task<IActionResult> Submissions([FromQuery] string? status, [FromQuery] long? courseId,
        [FromQuery] int page = 1, CancellationToken ct = default)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var filter = string.IsNullOrWhiteSpace(status) ? "waiting" : status.Trim().ToLowerInvariant();
        if (filter is not ("waiting" or "graded" or "all")) filter = "waiting";
        page = Math.Clamp(page, 1, 10000);
        var query = from submission in db.Submissions.AsNoTracking()
                    join assignment in db.Assignments on submission.AssignmentId equals assignment.Id
                    join lesson in db.CourseLessons on assignment.LessonId equals lesson.Id
                    join chapter in db.CourseChapters on lesson.ChapterId equals chapter.Id
                    join course in db.LearningCourses on chapter.CourseId equals course.Id
                    where course.TeacherId == userId
                    select new { submission, assignment, lesson, course };
        if (courseId is > 0) query = query.Where(row => row.course.Id == courseId);
        if (filter == "waiting") query = query.Where(row => row.submission.Status == "CHO_CHAM");
        if (filter == "graded") query = query.Where(row => row.submission.Status == "DA_CHAM");
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(row => row.submission.UpdatedAt).ThenByDescending(row => row.submission.Id)
            .Skip((page - 1) * 20).Take(20).ToListAsync(ct);
        var ids = rows.Select(row => row.submission.Id).ToList();
        var grades = await db.Grades.AsNoTracking().Where(grade => ids.Contains(grade.SubmissionId)).ToListAsync(ct);
        var names = await DisplayNames(rows.Select(row => row.submission.UserId), ct);
        return Ok(new
        {
            total, page,
            items = rows.Select(row => new
            {
                id = row.submission.Id,
                courseId = row.course.Id,
                courseTitle = row.course.Title,
                assignmentId = row.assignment.Id,
                lessonTitle = row.lesson.Title,
                prompt = row.assignment.Prompt,
                studentId = row.submission.UserId,
                studentName = names.GetValueOrDefault(row.submission.UserId, "Học viên LINEA"),
                status = row.submission.Status,
                submittedAt = row.submission.SubmittedAt,
                updatedAt = row.submission.UpdatedAt,
                grade = grades.Where(grade => grade.SubmissionId == row.submission.Id)
                    .Select(grade => new { score = grade.Score, feedback = grade.Feedback, gradedAt = grade.GradedAt })
                    .SingleOrDefault()
            })
        });
    }

    [HttpGet("students")]
    public async Task<IActionResult> Students([FromQuery] long? courseId, [FromQuery] int page = 1,
        CancellationToken ct = default)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        page = Math.Clamp(page, 1, 10000);
        var query = from enrollment in db.CourseEnrollments.AsNoTracking()
                    join course in db.LearningCourses on enrollment.CourseId equals course.Id
                    where course.TeacherId == userId
                    select new { enrollment, course };
        if (courseId is > 0) query = query.Where(row => row.course.Id == courseId);
        var total = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(row => row.enrollment.EnrolledAt)
            .Skip((page - 1) * 50).Take(50).ToListAsync(ct);
        var names = await DisplayNames(rows.Select(row => row.enrollment.UserId), ct);
        return Ok(new
        {
            total, page,
            items = rows.Select(row => new
            {
                studentId = row.enrollment.UserId,
                studentName = names.GetValueOrDefault(row.enrollment.UserId, "Học viên LINEA"),
                courseId = row.course.Id,
                courseTitle = row.course.Title,
                status = row.enrollment.Status,
                enrolledAt = row.enrollment.EnrolledAt,
                completedAt = row.enrollment.CompletedAt
            })
        });
    }
}
