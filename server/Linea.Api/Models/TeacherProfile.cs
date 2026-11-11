namespace Linea.Api.Models;

public static class TeacherProfileStatus
{
    public const string ChoDuyet = "CHO_DUYET";
    public const string CanBoSung = "CAN_BO_SUNG";
    public const string DaDuyet = "DA_DUYET";
    public const string TuChoi = "TU_CHOI";

    public static bool IsValid(string? status) =>
        status is ChoDuyet or CanBoSung or DaDuyet or TuChoi;
}

public static class HistoryObjectTypes
{
    public const string HoSoGiaoVien = "HO_SO_GIAO_VIEN";
}

public static class NotificationTypes
{
    public const string HoSoGiaoVien = "HO_SO_GIAO_VIEN";
}

public static class RejectionReasonCodes
{
    public const string MissingDocument = "MISSING_DOCUMENT";
    public const string UnclearPortfolio = "UNCLEAR_PORTFOLIO";
    public const string InsufficientExperience = "INSUFFICIENT_EXPERIENCE";
    public const string InvalidIdentity = "INVALID_IDENTITY";
    public const string CopyrightViolation = "COPYRIGHT_VIOLATION";
    public const string DuplicateProfile = "DUPLICATE_PROFILE";
    public const string Other = "OTHER";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        MissingDocument,
        UnclearPortfolio,
        InsufficientExperience,
        InvalidIdentity,
        CopyrightViolation,
        DuplicateProfile,
        Other
    };
}

public static class TeacherProfileFieldCodes
{
    public const string Introduction = "introduction";
    public const string Experience = "experience";
    public const string PortfolioFiles = "portfolioFiles";

    public static readonly IReadOnlySet<string> All = new HashSet<string>(StringComparer.Ordinal)
    {
        Introduction,
        Experience,
        PortfolioFiles
    };
}

public sealed class TeacherProfile
{
    public long Id { get; set; }

    public Guid UserId { get; set; }

    public string Introduction { get; set; } = string.Empty;

    public string Experience { get; set; } = string.Empty;

    public string Status { get; set; } = TeacherProfileStatus.ChoDuyet;

    public string? RejectionReason { get; set; }

    public string? SupplementReason { get; set; }

    public string? ReasonCode { get; set; }

    public string? InternalNote { get; set; }

    public string? FieldsToUpdate { get; set; }

    public DateTimeOffset SubmittedAt { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? ReviewedAt { get; set; }

    public List<PortfolioImage> PortfolioImages { get; set; } = [];
}

public sealed class PortfolioImage
{
    public long Id { get; set; }

    public long ProfileId { get; set; }

    public string FilePath { get; set; } = string.Empty;

    public DateTimeOffset UploadedAt { get; set; } = DateTimeOffset.UtcNow;

    public TeacherProfile? Profile { get; set; }
}

public sealed class NotificationMessage
{
    public long Id { get; set; }

    public Guid UserId { get; set; }

    public string Type { get; set; } = string.Empty;

    public string Content { get; set; } = string.Empty;

    public string? Link { get; set; }

    public bool IsRead { get; set; }

    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public sealed class StatusHistoryEntry
{
    public long Id { get; set; }

    public string ObjectType { get; set; } = string.Empty;

    public string ObjectId { get; set; } = string.Empty;

    public string? PreviousStatus { get; set; }

    public string Status { get; set; } = string.Empty;

    public Guid ActorId { get; set; }

    public string? Reason { get; set; }

    public string? ReasonCode { get; set; }

    public string? InternalNote { get; set; }

    public string? FieldsToUpdate { get; set; }

    public DateTimeOffset OccurredAt { get; set; } = DateTimeOffset.UtcNow;
}
