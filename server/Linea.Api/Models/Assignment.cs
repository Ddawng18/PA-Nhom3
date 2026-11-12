namespace Linea.Api.Models;

public sealed class Assignment
{
    public long Id { get; set; }
    public long LessonId { get; set; }
    public string Prompt { get; set; } = "";
    public DateTimeOffset? Deadline { get; set; }
    public bool Required { get; set; } = true;
}

public sealed class AssignmentSubmission
{
    public long Id { get; set; }
    public long AssignmentId { get; set; }
    public Guid UserId { get; set; }
    public string ImagePath { get; set; } = "";
    public string Status { get; set; } = "CHO_CHAM";
    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class SubmissionGrade
{
    public long Id { get; set; }
    public long SubmissionId { get; set; }
    public Guid GraderId { get; set; }
    public decimal Score { get; set; }
    public string Feedback { get; set; } = "";
    public DateTimeOffset GradedAt { get; set; } = DateTimeOffset.UtcNow;
}
