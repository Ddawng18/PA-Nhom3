using System.ComponentModel.DataAnnotations;
using Linea.Api.Models;

namespace Linea.Api.Contracts;

/// <summary>Payload for creating a course.</summary>
public sealed record CreateCourseRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(4000)]
    public string? Description { get; init; }

    [Url, MaxLength(1000)]
    public string? CoverImageUrl { get; init; }

    public CourseStatus Status { get; init; } = CourseStatus.Draft;
}

/// <summary>Payload for replacing a course.</summary>
public sealed record UpdateCourseRequest
{
    [Required, MaxLength(200)]
    public required string Name { get; init; }

    [MaxLength(4000)]
    public string? Description { get; init; }

    [Url, MaxLength(1000)]
    public string? CoverImageUrl { get; init; }

    public CourseStatus Status { get; init; }
}

/// <summary>Course returned by the API.</summary>
public sealed record CourseResponse(
    Guid Id,
    string Name,
    string? Description,
    string? CoverImageUrl,
    CourseStatus Status,
    string OwnerId,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

/// <summary>Paginated course list.</summary>
public sealed record CourseListResponse(
    IReadOnlyList<CourseResponse> Items,
    int Page,
    int PageSize,
    int TotalCount);
