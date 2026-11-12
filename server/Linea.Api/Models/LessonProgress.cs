namespace Linea.Api.Models;

public sealed class LessonProgress
{
    public Guid UserId { get; set; }
    public long LessonId { get; set; }
    public string Status { get; set; } = "CHUA_HOC";
    public DateTimeOffset? StartedAt { get; set; }
    public DateTimeOffset? CompletedAt { get; set; }
}
