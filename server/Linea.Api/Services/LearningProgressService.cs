using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Linea.Api.Services;

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

    public async Task RefreshAsync(Guid userId, long courseId, CancellationToken ct)
    {
        var enrollment = await db.CourseEnrollments.SingleOrDefaultAsync(x => x.UserId == userId && x.CourseId == courseId, ct);
        if (enrollment is null || enrollment.Status == "DA_HUY") return;
        var lessons = from l in db.CourseLessons join c in db.CourseChapters on l.ChapterId equals c.Id
                      where c.CourseId == courseId select l;
        var required = lessons.Where(x => x.Required);
        var hasLessons = await required.AnyAsync(ct);
        var missingLesson = await required.AnyAsync(l => !db.LessonProgress.Any(p =>
            p.UserId == userId && p.LessonId == l.Id && p.Status == "DA_HOAN_THANH"), ct);
        var missingAssignment = await db.Assignments.Where(a => a.Required && lessons.Any(l => l.Id == a.LessonId))
            .AnyAsync(a => !db.Submissions.Any(s => s.AssignmentId == a.Id && s.UserId == userId &&
                s.Status == "DA_CHAM" && db.Grades.Any(g => g.SubmissionId == s.Id)), ct);
        var complete = hasLessons && !missingLesson && !missingAssignment;
        enrollment.Status = complete ? "HOAN_THANH" : "DANG_HOC";
        enrollment.CompletedAt = complete ? enrollment.CompletedAt ?? DateTimeOffset.UtcNow : null;
        await db.SaveChangesAsync(ct);
    }
}
