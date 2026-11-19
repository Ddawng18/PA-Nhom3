using System.Text.Json.Serialization;

namespace Linea.Api.Contracts;

public sealed record ProgressLessonItem(
    long Id,
    string Title,
    int Order,
    bool Required,
    string Status);

public sealed record ProgressChapterItem(
    long Id,
    string Title,
    int Order,
    int Percent,
    IReadOnlyList<ProgressLessonItem> Lessons);

public sealed record ProgressAssignmentItem(
    long Id,
    long LessonId,
    string LessonTitle,
    bool Required,
    DateTimeOffset? Deadline,
    string Status,
    decimal? Score,
    DateTimeOffset? SubmittedAt,
    DateTimeOffset? GradedAt);

public sealed record CourseProgressResponse(
    long CourseId,
    string Title,
    string? CoverImage,
    string EnrollmentStatus,
    bool Available,
    bool Completed,
    int LessonPercent,
    int RequiredLessons,
    int CompletedRequiredLessons,
    int RequiredAssignments,
    int SubmittedRequiredAssignments,
    int GradedRequiredAssignments,
    [property: JsonPropertyName("chapters")] IReadOnlyList<ProgressChapterItem> Chapters,
    [property: JsonPropertyName("assignments")] IReadOnlyList<ProgressAssignmentItem> Assignments,
    DateTimeOffset? CompletedAt);

public sealed record ProgressListResponse(IReadOnlyList<CourseProgressResponse> Items);
