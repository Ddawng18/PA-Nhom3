using Linea.Api.Data;
using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Linea.Api.Services;

// D05: a course is complete when every required lesson is marked complete and
// every required assignment has a stored submission. Grading is not a gate.
public sealed record CourseProgressSummary(
    int RequiredLessons,
    int CompletedRequiredLessons,
    int RequiredAssignments,
    int SubmittedRequiredAssignments,
    int GradedRequiredAssignments,
    int Percent,
    bool IsComplete);

public sealed class LearningProgressService(AppDbContext db)
{
    // All learner writes and grading use the same transaction lock. This also
    // serializes concurrent insertions of the composite enrollment/progress keys.
    public async Task<IDbContextTransaction> BeginAsync(Guid userId, long courseId, CancellationToken ct)
    {
        var transaction = await db.Database.BeginTransactionAsync(ct);
        if (db.Database.IsNpgsql())
        {
            var key = $"learner:{userId}:{courseId}";
            await db.Database.ExecuteSqlInterpolatedAsync($"select pg_advisory_xact_lock(hashtextextended({key}, 0))", ct);
        }
        return transaction;
    }

    public async Task<CourseProgressSummary> EvaluateAsync(Guid userId, long courseId, CancellationToken ct)
    {
        var requiredLessonIds = await (
            from lesson in db.CourseLessons.AsNoTracking()
            join chapter in db.CourseChapters.AsNoTracking() on lesson.ChapterId equals chapter.Id
            where chapter.CourseId == courseId && lesson.Required
            select lesson.Id).ToListAsync(ct);

        var completedLessonIds = requiredLessonIds.Count == 0
            ? new List<long>()
            : await db.LessonProgress.AsNoTracking()
                .Where(progress => progress.UserId == userId &&
                    requiredLessonIds.Contains(progress.LessonId) &&
                    progress.Status == "DA_HOAN_THANH")
                .Select(progress => progress.LessonId)
                .Distinct()
                .ToListAsync(ct);

        var requiredAssignmentIds = await (
            from assignment in db.Assignments.AsNoTracking()
            join lesson in db.CourseLessons.AsNoTracking() on assignment.LessonId equals lesson.Id
            join chapter in db.CourseChapters.AsNoTracking() on lesson.ChapterId equals chapter.Id
            where chapter.CourseId == courseId && assignment.Required
            select assignment.Id).ToListAsync(ct);

        var submissions = requiredAssignmentIds.Count == 0
            ? new List<AssignmentSubmission>()
            : await db.Submissions.AsNoTracking()
                .Where(submission => submission.UserId == userId &&
                    requiredAssignmentIds.Contains(submission.AssignmentId))
                .ToListAsync(ct);

        var submittedAssignmentIds = submissions
            .Select(submission => submission.AssignmentId)
            .Distinct()
            .ToList();
        var gradedAssignmentIds = submissions
            .Where(submission => submission.Status == "DA_CHAM")
            .Select(submission => submission.AssignmentId)
            .Distinct()
            .ToList();

        var completedLessons = completedLessonIds.Count;
        var percent = requiredLessonIds.Count == 0
            ? 0
            : (int)Math.Round(completedLessons * 100d / requiredLessonIds.Count);
        var complete = requiredLessonIds.Count > 0 &&
            completedLessons == requiredLessonIds.Count &&
            submittedAssignmentIds.Count == requiredAssignmentIds.Count;

        return new CourseProgressSummary(
            requiredLessonIds.Count,
            completedLessons,
            requiredAssignmentIds.Count,
            submittedAssignmentIds.Count,
            gradedAssignmentIds.Count,
            percent,
            complete);
    }

    public async Task RefreshAsync(Guid userId, long courseId, CancellationToken ct)
    {
        var enrollment = await db.CourseEnrollments.SingleOrDefaultAsync(x => x.UserId == userId && x.CourseId == courseId, ct);
        if (enrollment is null || enrollment.Status == "DA_HUY") return;
        var summary = await EvaluateAsync(userId, courseId, ct);
        enrollment.Status = summary.IsComplete ? "HOAN_THANH" : "DANG_HOC";
        enrollment.CompletedAt = summary.IsComplete ? enrollment.CompletedAt ?? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync(ct);
    }
}
