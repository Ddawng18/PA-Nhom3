namespace Linea.Api.Models;

public sealed class CourseChapter
{
    public long Id { get; set; }
    public long CourseId { get; set; }
    public string Title { get; set; } = "";
    public int Order { get; set; }
}
