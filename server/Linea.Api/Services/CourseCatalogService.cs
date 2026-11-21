using System.Data;
using Linea.Api.Contracts;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Services;

public sealed class CourseCatalogService(
    AppDbContext db,
    AccountDirectory accounts,
    ILogger<CourseCatalogService> logger)
{
    private static readonly string[] ValidLevels = ["CO_BAN", "TRUNG_CAP", "NANG_CAO"];

    public async Task<CatalogListResponse> ListAsync(
        string? search, string? topic, string? levels, string? sort, int page, int pageSize,
        CancellationToken cancellationToken)
    {
        page = Math.Clamp(page, 1, 1_000_000);
        pageSize = Math.Clamp(pageSize, 1, 48);
        var levelFilter = (levels ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(level => ValidLevels.Contains(level))
            .Distinct()
            .ToList();

        var published = db.LearningCourses.AsNoTracking().Where(course => course.Status == "DA_DANG");
        var topics = await published
            .GroupBy(course => course.Topic)
            .Select(group => new { Topic = group.Key, Count = group.Count() })
            .OrderBy(item => item.Topic)
            .ToListAsync(cancellationToken);

        var query = published;
        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLowerInvariant();
            if (term.Length > 100) term = term[..100];
            query = query.Where(course => course.Title.ToLower().Contains(term));
        }
        var topicFilter = (topic ?? "")
            .Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Distinct()
            .Take(20)
            .ToList();
        if (topicFilter.Count > 0) query = query.Where(course => topicFilter.Contains(course.Topic));
        if (levelFilter.Count > 0) query = query.Where(course => levelFilter.Contains(course.Level));

        var total = await query.CountAsync(cancellationToken);
        var projected = query.Select(course => new
        {
            Course = course,
            Chapters = db.CourseChapters.Count(chapter => chapter.CourseId == course.Id),
            Lessons = db.CourseLessons.Count(lesson =>
                db.CourseChapters.Any(chapter => chapter.Id == lesson.ChapterId && chapter.CourseId == course.Id)),
            Students = db.CourseEnrollments.Count(enrollment =>
                enrollment.CourseId == course.Id && enrollment.Status != "DA_HUY"),
        });
        projected = sort switch
        {
            "pho_bien" => projected.OrderByDescending(item => item.Students).ThenByDescending(item => item.Course.Id),
            "ten" => projected.OrderBy(item => item.Course.Title).ThenByDescending(item => item.Course.Id),
            _ => projected.OrderByDescending(item => item.Course.Id),
        };
        var rows = await projected.Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        var items = await EnrichAsync(
            rows.Select(row => (row.Course, row.Chapters, row.Lessons, row.Students)).ToList(),
            cancellationToken);
        return new CatalogListResponse(
            items, page, pageSize, total,
            topics.Select(item => new CatalogTopic(item.Topic, item.Count)).ToList());
    }

    public async Task<CatalogDetailResponse?> GetAsync(long id, CancellationToken cancellationToken)
    {
        var course = await db.LearningCourses.AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id && item.Status == "DA_DANG", cancellationToken);
        if (course is null) return null;

        var chapters = await db.CourseChapters.AsNoTracking()
            .Where(item => item.CourseId == id).OrderBy(item => item.Order).ToListAsync(cancellationToken);
        var chapterIds = chapters.Select(item => item.Id).ToList();
        var lessons = await db.CourseLessons.AsNoTracking()
            .Where(item => chapterIds.Contains(item.ChapterId)).OrderBy(item => item.Order)
            .ToListAsync(cancellationToken);
        var students = await db.CourseEnrollments.AsNoTracking()
            .CountAsync(item => item.CourseId == id && item.Status != "DA_HUY", cancellationToken);

        var detail = (await EnrichAsync([(course, chapters.Count, lessons.Count, students)], cancellationToken))[0];
        var outline = chapters.Select(chapter => new CatalogChapter(
            chapter.Id, chapter.Title, chapter.Order,
            lessons.Where(lesson => lesson.ChapterId == chapter.Id)
                .OrderBy(lesson => lesson.Order)
                .Select(lesson => new CatalogLesson(lesson.Id, lesson.Title, lesson.Order, lesson.Required))
                .ToList())).ToList();

        var relatedRows = await db.LearningCourses.AsNoTracking()
            .Where(item => item.Status == "DA_DANG" && item.Id != id && item.Topic == course.Topic)
            .OrderByDescending(item => item.Id).Take(3)
            .Select(item => new
            {
                Course = item,
                Chapters = db.CourseChapters.Count(chapter => chapter.CourseId == item.Id),
                Lessons = db.CourseLessons.Count(lesson =>
                    db.CourseChapters.Any(chapter => chapter.Id == lesson.ChapterId && chapter.CourseId == item.Id)),
                Students = db.CourseEnrollments.Count(enrollment =>
                    enrollment.CourseId == item.Id && enrollment.Status != "DA_HUY"),
            })
            .ToListAsync(cancellationToken);
        var related = await EnrichAsync(
            relatedRows.Select(row => (row.Course, row.Chapters, row.Lessons, row.Students)).ToList(),
            cancellationToken);
        return new CatalogDetailResponse(detail, outline, related);
    }

    private async Task<List<CatalogCourseItem>> EnrichAsync(
        IReadOnlyList<(Models.LearningCourse Course, int Chapters, int Lessons, int Students)> rows,
        CancellationToken cancellationToken)
    {
        var teacherIds = rows.Select(row => row.Course.TeacherId).Distinct().ToList();
        var teacherNames = new Dictionary<Guid, string?>();
        try
        {
            var directory = await accounts.GetAccountsAsync(teacherIds, cancellationToken);
            foreach (var pair in directory) teacherNames[pair.Key] = pair.Value.DisplayName;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not load teacher names for the course catalog.");
        }
        var prices = await LoadPricesAsync(rows.Select(row => row.Course.Id).ToList(), cancellationToken);

        return rows.Select(row => new CatalogCourseItem(
            row.Course.Id, row.Course.Title, row.Course.Description, row.Course.Level, row.Course.Topic,
            row.Course.CoverImage, row.Course.TeacherId,
            teacherNames.TryGetValue(row.Course.TeacherId, out var name) ? name : null,
            prices.TryGetValue(row.Course.Id, out var price) ? price : null,
            row.Chapters, row.Lessons, row.Students, row.Course.DurationText, row.Course.StartDate,
            row.Course.CreatedAt)).ToList();
    }

    private async Task<Dictionary<long, long>> LoadPricesAsync(
        IReadOnlyCollection<long> courseIds, CancellationToken cancellationToken)
    {
        var result = new Dictionary<long, long>();
        if (courseIds.Count == 0 || !db.Database.IsNpgsql()) return result;
        try
        {
            var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
            try
            {
                var idList = string.Join(",", courseIds.Distinct());
                await using var command = PostgresAdminHelpers.CreateCommand(connection, $"""
                    select k.ma_khoa_hoc,
                           coalesce(nullif(to_jsonb(k) ->> 'gia_vnd', '')::bigint, 0)
                    from public.khoa_hoc k
                    where k.ma_khoa_hoc in ({idList})
                    """, db.Database.CurrentTransaction);
                await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                while (await reader.ReadAsync(cancellationToken))
                    result[reader.GetInt64(0)] = reader.GetInt64(1);
            }
            finally
            {
                await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
            }
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not load course prices for the catalog.");
        }
        return result;
    }
}
