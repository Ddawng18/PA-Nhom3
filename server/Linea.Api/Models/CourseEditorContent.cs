namespace Linea.Api.Models;

public sealed class CourseChapterContent
{
    public long Id { get; set; }
    public long CourseId { get; set; }
    public string Title { get; set; } = "";
    public int Order { get; set; }
}

public sealed class CourseLessonContent
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

public sealed class CourseAssignmentContent
{
    public long Id { get; set; }
    public long LessonId { get; set; }
    public string Prompt { get; set; } = "";
    public DateTimeOffset? Deadline { get; set; }
    public bool Required { get; set; } = true;
}

public sealed class CourseAttachmentContent
{
    public long Id { get; set; }
    public long LessonId { get; set; }
    public string Name { get; set; } = "";
    public string Path { get; set; } = "";
    public string Type { get; set; } = "REFERENCE";
    public long Size { get; set; }
}

public sealed class CourseRubricContent
{
    public long Id { get; set; }
    public long AssignmentId { get; set; }
    public string Name { get; set; } = "";
    public int Weight { get; set; }
    public int Order { get; set; }
}
