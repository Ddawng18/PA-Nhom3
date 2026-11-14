using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

// PB15 / WBS 2.15.2. Read-only view of the learner's own progress. The
// completion rule is the shared D05 implementation in LearningProgressService.
[ApiController]
[Route("api/progress")]
[Authorize]
public sealed class ProgressController(AppDbContext db, LearningProgressService progressService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> Get([FromQuery] long? courseId, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();

        if (courseId is { } singleCourseId)
        {
            var course = await db.LearningCourses.AsNoTracking()
                .SingleOrDefaultAsync(item => item.Id == singleCourseId, cancellationToken);
            if (course is null)
                return NotFound(new { code = "NOT_FOUND", detail = "Không tìm thấy khóa học." });

            var enrollment = await db.CourseEnrollments.AsNoTracking()
                .SingleOrDefaultAsync(item => item.UserId == userId &&
                    item.CourseId == singleCourseId && item.Status != "DA_HUY", cancellationToken);
            if (enrollment is null)
                return Forbid();

            return Ok(await BuildAsync(userId, course, enrollment, cancellationToken));
        }

        var rows = await (
            from enrollment in db.CourseEnrollments.AsNoTracking()
            join course in db.LearningCourses.AsNoTracking() on enrollment.CourseId equals course.Id
            where enrollment.UserId == userId && enrollment.Status != "DA_HUY"
            orderby enrollment.EnrolledAt descending
            select new { Enrollment = enrollment, Course = course }).ToListAsync(cancellationToken);

        var items = new List<CourseProgressResponse>();
        foreach (var row in rows)
        {
            items.Add(await BuildAsync(userId, row.Course, row.Enrollment, cancellationToken));
        }

        return Ok(new ProgressListResponse(items));
    }

    private async Task<CourseProgressResponse> BuildAsync(
        Guid userId,
        LearningCourse course,
        CourseEnrollment enrollment,
        CancellationToken cancellationToken)
    {
        var summary = await progressService.EvaluateAsync(userId, course.Id, cancellationToken);
        var available = course.Status == "DA_DANG";

        if (!available)
        {
            // A hidden course must not expose content. The stored progress counts
            // remain visible only through the enrollment row on the progress page.
            return new CourseProgressResponse(
                course.Id, course.Title, course.CoverImage, enrollment.Status, false, false,
                summary.Percent, summary.RequiredLessons, summary.CompletedRequiredLessons,
                summary.RequiredAssignments, summary.SubmittedRequiredAssignments,
                summary.GradedRequiredAssignments, [], [], enrollment.CompletedAt);
        }

        var chapters = await db.CourseChapters.AsNoTracking()
            .Where(chapter => chapter.CourseId == course.Id)
            .OrderBy(chapter => chapter.Order)
            .ToListAsync(cancellationToken);

        var chapterIds = chapters.Select(chapter => chapter.Id).ToList();
        var lessons = await db.CourseLessons.AsNoTracking()
            .Where(lesson => chapterIds.Contains(lesson.ChapterId))
            .OrderBy(lesson => lesson.Order)
            .ToListAsync(cancellationToken);

        var lessonIds = lessons.Select(lesson => lesson.Id).ToList();
        var lessonProgress = await db.LessonProgress.AsNoTracking()
            .Where(item => item.UserId == userId && lessonIds.Contains(item.LessonId))
            .ToDictionaryAsync(item => item.LessonId, cancellationToken);

        var assignments = await db.Assignments.AsNoTracking()
            .Where(assignment => lessonIds.Contains(assignment.LessonId))
            .OrderBy(assignment => assignment.LessonId)
            .ThenBy(assignment => assignment.Id)
            .ToListAsync(cancellationToken);

        var assignmentIds = assignments.Select(assignment => assignment.Id).ToList();
        var submissions = await db.Submissions.AsNoTracking()
            .Where(submission => submission.UserId == userId && assignmentIds.Contains(submission.AssignmentId))
            .ToListAsync(cancellationToken);
        var submissionIds = submissions.Select(submission => submission.Id).ToList();
        var grades = await db.Grades.AsNoTracking()
            .Where(grade => submissionIds.Contains(grade.SubmissionId))
            .ToListAsync(cancellationToken);

        var lessonsByChapter = lessons
            .GroupBy(lesson => lesson.ChapterId)
            .ToDictionary(group => group.Key, group => group.ToList());

        var chapterItems = new List<ProgressChapterItem>();
        foreach (var chapter in chapters)
        {
            var chapterLessons = lessonsByChapter.TryGetValue(chapter.Id, out var values)
                ? values
                : [];
            var required = chapterLessons.Where(lesson => lesson.Required).ToList();
            var completed = required.Count(lesson =>
                lessonProgress.TryGetValue(lesson.Id, out var item) && item.Status == "DA_HOAN_THANH");
            var percent = required.Count == 0
                ? 0
                : (int)Math.Round(completed * 100d / required.Count);

            chapterItems.Add(new ProgressChapterItem(
                chapter.Id,
                chapter.Title,
                chapter.Order,
                percent,
                chapterLessons.Select(lesson => new ProgressLessonItem(
                    lesson.Id,
                    lesson.Title,
                    lesson.Order,
                    lesson.Required,
                    lessonProgress.TryGetValue(lesson.Id, out var item) ? item.Status : "CHUA_HOC"))
                    .ToList()));
        }

        var lessonTitles = lessons.ToDictionary(lesson => lesson.Id, lesson => lesson.Title);
        var submissionsByAssignment = submissions.ToDictionary(submission => submission.AssignmentId);
        var gradesBySubmission = grades.ToDictionary(grade => grade.SubmissionId);
        var assignmentItems = assignments.Select(assignment =>
        {
            submissionsByAssignment.TryGetValue(assignment.Id, out var submission);
            SubmissionGrade? grade = null;
            if (submission is not null) gradesBySubmission.TryGetValue(submission.Id, out grade);
            return new ProgressAssignmentItem(
                assignment.Id,
                assignment.LessonId,
                lessonTitles.TryGetValue(assignment.LessonId, out var title) ? title : string.Empty,
                assignment.Required,
                assignment.Deadline,
                submission?.Status ?? "CHUA_NOP",
                grade?.Score,
                submission?.SubmittedAt,
                grade?.GradedAt);
        }).ToList();

        return new CourseProgressResponse(
            course.Id,
            course.Title,
            course.CoverImage,
            enrollment.Status,
            true,
            summary.IsComplete,
            summary.Percent,
            summary.RequiredLessons,
            summary.CompletedRequiredLessons,
            summary.RequiredAssignments,
            summary.SubmittedRequiredAssignments,
            summary.GradedRequiredAssignments,
            chapterItems,
            assignmentItems,
            enrollment.CompletedAt);
    }
}
