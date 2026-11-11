namespace Linea.Api.Models;

public sealed class Course
{
    public Guid Id { get; set; }
    public required string Name { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public CourseStatus Status { get; set; } = CourseStatus.Draft;
    public required string OwnerId { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}
