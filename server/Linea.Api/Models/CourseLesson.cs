namespace Linea.Api.Models;

public sealed class CourseLesson
{
    public long Id { get; set; }
    public long ChapterId { get; set; }
    public string Title { get; set; } = "";
    public int Order { get; set; }
    public string? TextContent { get; set; }
    public string? ImagePath { get; set; }
    public string? VideoUrl { get; set; }
    public bool Required { get; set; } = true;
}
