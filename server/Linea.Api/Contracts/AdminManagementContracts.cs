namespace Linea.Api.Contracts;

public sealed record AdminUserItem(
    Guid Id,
    string Email,
    string? DisplayName,
    string Role,
    bool IsLocked,
    int LockVersion,
    DateTimeOffset CreatedAt);

public sealed record AdminUserPage(
    IReadOnlyList<AdminUserItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record AdminHistoryItem(
    string? PreviousStatus,
    string Status,
    string? Reason,
    string? ReasonCode,
    string? InternalNote,
    Guid ActorId,
    DateTimeOffset OccurredAt);

public sealed record AdminUserDetail(
    Guid Id,
    string Email,
    string? DisplayName,
    string? AvatarUrl,
    string Role,
    bool IsLocked,
    string? LockedReason,
    DateTimeOffset? LockedAt,
    int LockVersion,
    DateTimeOffset CreatedAt,
    IReadOnlyList<AdminHistoryItem> History);

public sealed record AdminCourseItem(
    long Id,
    string Title,
    Guid TeacherId,
    string? TeacherName,
    string? TeacherEmail,
    string Level,
    string Topic,
    string Status,
    bool Hidden,
    int VisibilityVersion,
    long PriceVnd,
    int StudentCount,
    int ChapterCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt);

public sealed record AdminCoursePage(
    IReadOnlyList<AdminCourseItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record AdminCourseDetail(
    long Id,
    string Title,
    string? Description,
    Guid TeacherId,
    string? TeacherName,
    string? TeacherEmail,
    string Level,
    string Topic,
    string? CoverImage,
    string Status,
    bool Hidden,
    int VisibilityVersion,
    long PriceVnd,
    int StudentCount,
    int ChapterCount,
    int LessonCount,
    int AssignmentCount,
    int SubmissionCount,
    int GradedCount,
    DateTimeOffset CreatedAt,
    DateTimeOffset? UpdatedAt,
    IReadOnlyList<AdminHistoryItem> History);

public sealed record AdminOrderItem(
    long Id,
    Guid UserId,
    string? UserEmail,
    string? UserName,
    long CourseId,
    string? CourseTitle,
    long AmountVnd,
    string Currency,
    string Mode,
    string Status,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt);

public sealed record AdminOrderPage(
    IReadOnlyList<AdminOrderItem> Items,
    int Page,
    int PageSize,
    int TotalCount);

public sealed record AdminOrderDetail(
    long Id,
    Guid UserId,
    string? UserEmail,
    string? UserName,
    long CourseId,
    string? CourseTitle,
    long AmountVnd,
    string Currency,
    string Mode,
    string Status,
    string? IdempotencyKey,
    DateTimeOffset CreatedAt,
    DateTimeOffset? ConfirmedAt);
