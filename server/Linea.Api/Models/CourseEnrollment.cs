namespace Linea.Api.Models;

public sealed class CourseEnrollment
{
    public Guid UserId { get; set; }
    public long CourseId { get; set; }
    public string Status { get; set; } = "DANG_HOC";
    public DateTimeOffset EnrolledAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? CompletedAt { get; set; }
}
