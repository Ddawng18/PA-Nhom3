namespace Linea.Api.Models;

public sealed class LearningCourse
{
    public long Id { get; set; }
    public Guid TeacherId { get; set; }
    public string Title { get; set; } = "";
    public string Level { get; set; } = "CO_BAN";
    public string Topic { get; set; } = "";
    public string Description { get; set; } = "";
    public string? CoverImage { get; set; }
    public string Status { get; set; } = "NHAP";
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}
