using Linea.Api.Models;
using Linea.Api.Services;

namespace Linea.Api.Contracts;

public sealed class SubmitTeacherProfileRequest
{
    public string Introduction { get; set; } = string.Empty;

    public string Experience { get; set; } = string.Empty;

    public List<string> PortfolioFiles { get; set; } = [];
}

public sealed record PortfolioFileResponse(
    long Id,
    string FilePath,
    string DownloadUrl,
    string SignedUrlEndpoint,
    DateTimeOffset UploadedAt);

public sealed record ProfileHistoryResponse(
    string? PreviousStatus,
    string Status,
    string? Reason,
    string? ReasonCode,
    string? InternalNote,
    IReadOnlyList<string> Fields,
    DateTimeOffset OccurredAt);

public sealed record TeacherProfileResponse(
    long Id,
    Guid UserId,
    string Introduction,
    string Experience,
    string Status,
    string? RejectionReason,
    string? SupplementReason,
    string? ReasonCode,
    IReadOnlyList<string> Fields,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ReviewedAt,
    IReadOnlyList<PortfolioFileResponse> PortfolioFiles,
    IReadOnlyList<ProfileHistoryResponse> History)
{
    public static TeacherProfileResponse From(
        TeacherProfile profile,
        IReadOnlyList<ProfileHistoryResponse> history,
        string downloadUrlPrefix,
        string signedUrlPrefix) => new(
        profile.Id,
        profile.UserId,
        profile.Introduction,
        profile.Experience,
        profile.Status,
        profile.RejectionReason,
        profile.SupplementReason,
        profile.ReasonCode,
        TeacherProfileFields.Deserialize(profile.FieldsToUpdate),
        profile.SubmittedAt,
        profile.ReviewedAt,
        profile.PortfolioImages
            .OrderBy(image => image.Id)
            .Select(image => new PortfolioFileResponse(
                image.Id,
                image.FilePath,
                $"{downloadUrlPrefix}/{image.Id}",
                $"{signedUrlPrefix}/{image.Id}/signed-url",
                image.UploadedAt))
            .ToList(),
        history);
}

public sealed record SubmitTeacherProfileResponse(
    long Id,
    string Status,
    DateTimeOffset SubmittedAt);

public sealed record UploadedPortfolioFileResponse(
    string FilePath,
    string FileName,
    string ContentType,
    long Size,
    DateTimeOffset UploadedAt);

public sealed record AdminTeacherProfileListItem(
    long Id,
    Guid UserId,
    string? DisplayName,
    string? Email,
    string Introduction,
    string Experience,
    string Status,
    string? SupplementReason,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ReviewedAt,
    int ResubmissionCount);

public sealed record AdminTeacherProfileListResponse(
    IReadOnlyList<AdminTeacherProfileListItem> Items,
    int Page,
    int PageSize,
    int Total);

public sealed record AdminTeacherProfileDetailResponse(
    long Id,
    Guid UserId,
    string? DisplayName,
    string? Email,
    string Introduction,
    string Experience,
    string Status,
    string? RejectionReason,
    string? SupplementReason,
    string? ReasonCode,
    string? InternalNote,
    IReadOnlyList<string> Fields,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ReviewedAt,
    IReadOnlyList<PortfolioFileResponse> PortfolioFiles,
    IReadOnlyList<ProfileHistoryResponse> History);

public sealed class ApproveTeacherProfileRequest
{
    public string? Note { get; set; }
}

public sealed class RejectTeacherProfileRequest
{
    public string? ReasonCode { get; set; }

    public string Reason { get; set; } = string.Empty;

    public string? InternalNote { get; set; }
}

public sealed class RequestChangesTeacherProfileRequest
{
    public string? ReasonCode { get; set; }

    public string Reason { get; set; } = string.Empty;

    public List<string> Fields { get; set; } = [];

    public string? InternalNote { get; set; }
}

public sealed record ApproveTeacherProfileResponse(
    long Id,
    string Status,
    string Role,
    DateTimeOffset ReviewedAt);

public sealed record RejectTeacherProfileResponse(
    long Id,
    string Status,
    string? ReasonCode,
    string RejectionReason,
    DateTimeOffset ReviewedAt);

public sealed record RequestChangesTeacherProfileResponse(
    long Id,
    string Status,
    string? ReasonCode,
    string SupplementReason,
    IReadOnlyList<string> Fields,
    DateTimeOffset ReviewedAt);

public sealed record SignedUrlResponse(
    string Url,
    DateTimeOffset ExpiresAt);
