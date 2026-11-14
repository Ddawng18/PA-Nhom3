using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/teacher/profile")]
[Authorize]
public sealed class TeacherProfileController(
    AppDbContext db,
    IPortfolioStorage portfolioStorage,
    IEmailSender emailSender,
    AccountDirectory accounts,
    ILogger<TeacherProfileController> logger) : ControllerBase
{
    private const int MinIntroductionLength = 50;
    private const int MaxIntroductionLength = 1000;
    private const int MinExperienceLength = 10;
    private const int MaxExperienceLength = 2000;
    private const int ResubmissionLimit = 3;
    private const int ResubmissionWindowDays = 30;
    private static readonly TimeSpan SignedUrlLifetime = TimeSpan.FromMinutes(5);

    [HttpGet("me")]
    [ProducesResponseType<TeacherProfileResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> GetMine(CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        if (User.IsInRole("admin"))
        {
            return ApiProblem(StatusCodes.Status403Forbidden, "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này.");
        }

        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .Include(item => item.PortfolioImages)
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);
        if (profile is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Bạn chưa gửi hồ sơ giáo viên.");
        }

        var history = await LoadHistoryAsync(profile.Id, includeInternalNote: false, cancellationToken);
        return Ok(TeacherProfileResponse.From(
            profile,
            history,
            "/api/teacher/profile/me/portfolio",
            "/api/teacher/profile/me/portfolio"));
    }

    [HttpPost("me/submit")]
    [ProducesResponseType<SubmitTeacherProfileResponse>(StatusCodes.Status202Accepted)]
    public async Task<IActionResult> Submit(
        [FromBody] SubmitTeacherProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var roleError = CheckSubmitRole();
        if (roleError is not null)
        {
            return roleError;
        }

        var introduction = TextSanitizer.ToPlainText(request.Introduction);
        var experience = TextSanitizer.ToPlainText(request.Experience);
        var (validPaths, validationError) = await ValidateSubmissionAsync(
            introduction,
            experience,
            request.PortfolioFiles,
            cancellationToken);
        if (validationError is not null)
        {
            return validationError;
        }

        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.UserId == userId, cancellationToken);

        if (profile is { Status: TeacherProfileStatus.ChoDuyet })
        {
            return ApiProblem(StatusCodes.Status409Conflict, "TEACHER_PROFILE_EXISTS",
                "Hồ sơ của bạn đã được gửi trước đó. Vui lòng chờ kết quả duyệt.");
        }

        if (profile is { Status: TeacherProfileStatus.DaDuyet })
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Hồ sơ giáo viên của bạn đã được duyệt.");
        }

        var canResubmit = profile is null ||
                          profile.Status is TeacherProfileStatus.TuChoi or TeacherProfileStatus.CanBoSung;
        if (!canResubmit)
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Trạng thái hồ sơ hiện tại không cho phép gửi duyệt.");
        }

        if (profile is not null && await IsResubmissionRateLimitedAsync(profile.Id, cancellationToken))
        {
            return ApiProblem(429, "RATE_LIMITED",
                "Bạn đã gửi lại quá 3 lần trong 30 ngày. Vui lòng liên hệ quản trị viên.");
        }

        var now = DateTimeOffset.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        string? previousStatus = null;
        string? previousReason = null;
        string? previousReasonCode = null;
        string? previousInternalNote = null;
        string? previousFields = null;
        var isResubmission = profile is not null;

        if (profile is null)
        {
            profile = new TeacherProfile
            {
                UserId = userId,
                Introduction = introduction,
                Experience = experience,
                Status = TeacherProfileStatus.ChoDuyet,
                SubmittedAt = now
            };
            db.TeacherProfiles.Add(profile);

            try
            {
                await db.SaveChangesAsync(cancellationToken);
            }
            catch (DbUpdateException exception) when (IsUniqueViolation(exception))
            {
                logger.LogWarning(exception, "Concurrent teacher profile creation for user {UserId}.", userId);
                await transaction.RollbackAsync(cancellationToken);
                return ApiProblem(StatusCodes.Status409Conflict, "TEACHER_PROFILE_EXISTS",
                    "Hồ sơ của bạn đã được gửi trước đó. Vui lòng chờ kết quả duyệt.");
            }
        }
        else
        {
            previousStatus = profile.Status;
            previousReason = profile.Status == TeacherProfileStatus.CanBoSung
                ? profile.SupplementReason
                : profile.RejectionReason;
            previousReasonCode = profile.ReasonCode;
            previousInternalNote = profile.InternalNote;
            previousFields = profile.FieldsToUpdate;
            var affected = await db.TeacherProfiles
                .Where(item =>
                    item.Id == profile.Id &&
                    (item.Status == TeacherProfileStatus.TuChoi || item.Status == TeacherProfileStatus.CanBoSung))
                .ExecuteUpdateAsync(setters => setters
                    .SetProperty(item => item.Introduction, introduction)
                    .SetProperty(item => item.Experience, experience)
                    .SetProperty(item => item.Status, TeacherProfileStatus.ChoDuyet)
                    .SetProperty(item => item.SubmittedAt, now)
                    .SetProperty(item => item.ReviewedAt, (DateTimeOffset?)null)
                    .SetProperty(item => item.RejectionReason, (string?)null)
                    .SetProperty(item => item.SupplementReason, (string?)null)
                    .SetProperty(item => item.ReasonCode, (string?)null)
                    .SetProperty(item => item.InternalNote, (string?)null)
                    .SetProperty(item => item.FieldsToUpdate, (string?)null), cancellationToken);
            if (affected == 0)
            {
                await transaction.RollbackAsync(cancellationToken);
                return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                    "Hồ sơ đã được người khác xử lý. Vui lòng tải lại.");
            }

            await db.PortfolioImages
                .Where(image => image.ProfileId == profile.Id)
                .ExecuteDeleteAsync(cancellationToken);
        }

        foreach (var path in validPaths!)
        {
            db.PortfolioImages.Add(new PortfolioImage
            {
                ProfileId = profile.Id,
                FilePath = path,
                UploadedAt = now
            });
        }

        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = HistoryObjectTypes.HoSoGiaoVien,
            ObjectId = profile.Id.ToString(),
            PreviousStatus = previousStatus,
            Status = TeacherProfileStatus.ChoDuyet,
            ActorId = userId,
            Reason = previousReason,
            ReasonCode = previousReasonCode,
            InternalNote = previousInternalNote,
            FieldsToUpdate = previousFields,
            OccurredAt = now
        });

        db.Notifications.Add(new NotificationMessage
        {
            UserId = userId,
            Type = NotificationTypes.HoSoGiaoVien,
            Content = isResubmission
                ? "Hồ sơ giáo viên của bạn đã được gửi lại và đang chờ duyệt."
                : "Hồ sơ giáo viên của bạn đã được gửi và đang chờ duyệt.",
            Link = "/teacher/onboarding",
            IsRead = false,
            CreatedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await transaction.DisposeAsync();

        await SendSubmittedEmailAsync(userId, isResubmission, cancellationToken);

        return Accepted(new SubmitTeacherProfileResponse(
            profile.Id,
            TeacherProfileStatus.ChoDuyet,
            now));
    }

    [HttpPost("me/portfolio")]
    [RequestSizeLimit(11 * 1024 * 1024)]
    [RequestFormLimits(MultipartBodyLengthLimit = 11 * 1024 * 1024)]
    public async Task<IActionResult> UploadPortfolio(
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out _))
        {
            return Unauthorized();
        }

        var roleError = CheckSubmitRole();
        if (roleError is not null)
        {
            return roleError;
        }

        var result = await portfolioStorage.SaveAsync(file, cancellationToken);
        if (!result.Success)
        {
            return ApiProblem(result.StatusCode, result.Code!, result.Message!);
        }

        return StatusCode(StatusCodes.Status201Created, new UploadedPortfolioFileResponse(
            result.File!.FilePath,
            result.File.FileName,
            result.File.ContentType,
            result.File.Size,
            result.File.UploadedAt));
    }

    [HttpGet("me/portfolio/{imageId:long}")]
    public async Task<IActionResult> DownloadPortfolio(long imageId, CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var relativePath = await db.PortfolioImages
            .AsNoTracking()
            .Where(image => image.Id == imageId && image.Profile!.UserId == userId)
            .Select(image => image.FilePath)
            .SingleOrDefaultAsync(cancellationToken);
        if (relativePath is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
        }

        return await ServePortfolioAsync(relativePath, cancellationToken);
    }

    [HttpPost("me/portfolio/{imageId:long}/signed-url")]
    public async Task<IActionResult> CreatePortfolioSignedUrl(
        long imageId,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return Unauthorized();
        }

        var relativePath = await db.PortfolioImages
            .AsNoTracking()
            .Where(image => image.Id == imageId && image.Profile!.UserId == userId)
            .Select(image => image.FilePath)
            .SingleOrDefaultAsync(cancellationToken);
        if (relativePath is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
        }

        var signed = await portfolioStorage.CreateSignedUrlAsync(
            imageId,
            userId,
            relativePath,
            SignedUrlLifetime,
            cancellationToken);
        if (signed is null)
        {
            return ApiProblem(502, "STORAGE_ERROR",
                "Không thể tạo liên kết ảnh lúc này. Vui lòng thử lại.");
        }

        return Ok(new SignedUrlResponse(signed.Url, signed.ExpiresAt));
    }

    private async Task<IActionResult> ServePortfolioAsync(
        string relativePath,
        CancellationToken cancellationToken)
    {
        var content = await portfolioStorage.OpenAsync(relativePath, cancellationToken);
        if (content is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
        }

        if (content.LocalPath is not null)
        {
            return PhysicalFile(content.LocalPath, content.ContentType);
        }

        return content.RedirectUrl is not null
            ? Redirect(content.RedirectUrl)
            : ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
    }

    private ObjectResult? CheckSubmitRole()
    {
        if (User.IsInRole("admin"))
        {
            return ApiProblem(StatusCodes.Status403Forbidden, "FORBIDDEN",
                "Quản trị viên không gửi hồ sơ giáo viên.");
        }

        if (User.IsInRole("teacher"))
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Hồ sơ giáo viên của bạn đã được duyệt.");
        }

        if (!User.IsInRole("student"))
        {
            return ApiProblem(StatusCodes.Status403Forbidden, "FORBIDDEN",
                "Bạn không có quyền thực hiện thao tác này.");
        }

        return null;
    }

    private async Task<(List<string>? Paths, IActionResult? Error)> ValidateSubmissionAsync(
        string introduction,
        string experience,
        IReadOnlyList<string>? portfolioFiles,
        CancellationToken cancellationToken)
    {
        if (introduction.Length < MinIntroductionLength || introduction.Length > MaxIntroductionLength)
        {
            ModelState.AddModelError("introduction",
                $"Giới thiệu phải từ {MinIntroductionLength} đến {MaxIntroductionLength} ký tự.");
        }

        if (experience.Length < MinExperienceLength || experience.Length > MaxExperienceLength)
        {
            ModelState.AddModelError("experience",
                $"Kinh nghiệm phải từ {MinExperienceLength} đến {MaxExperienceLength} ký tự.");
        }

        var files = portfolioFiles?.Where(path => !string.IsNullOrWhiteSpace(path)).ToList() ?? [];
        if (files.Count is < 1 or > PortfolioLimits.MaxFiles)
        {
            ModelState.AddModelError("portfolioFiles",
                $"Vui lòng tải lên từ 1 đến {PortfolioLimits.MaxFiles} ảnh tác phẩm.");
        }

        var validPaths = new List<string>();
        long totalSize = 0;
        for (var index = 0; index < files.Count; index++)
        {
            var path = files[index].Trim().Replace('\\', '/').ToLowerInvariant();
            if (validPaths.Contains(path, StringComparer.Ordinal))
            {
                ModelState.AddModelError($"portfolioFiles[{index}]", "Ảnh tác phẩm bị trùng.");
                continue;
            }

            var result = await portfolioStorage.ValidateAsync(path, cancellationToken);
            if (!result.Success)
            {
                if (result.StatusCode >= 500)
                {
                    return (null, ApiProblem(
                        result.StatusCode,
                        result.Code ?? "STORAGE_ERROR",
                        result.Message ?? "Không thể kiểm tra ảnh lúc này."));
                }

                ModelState.AddModelError(
                    $"portfolioFiles[{index}]",
                    result.Message ?? "Ảnh tác phẩm không hợp lệ.");
                continue;
            }

            totalSize += result.File!.Size;
            validPaths.Add(path);
        }

        if (totalSize > PortfolioLimits.MaxTotalBytes)
        {
            ModelState.AddModelError("portfolioFiles", "Tổng dung lượng ảnh không được vượt quá 30 MB.");
        }

        return ModelState.IsValid
            ? (validPaths, null)
            : (null, ValidationProblem(ModelState));
    }

    private async Task<bool> IsResubmissionRateLimitedAsync(long profileId, CancellationToken cancellationToken)
    {
        var since = DateTimeOffset.UtcNow.AddDays(-ResubmissionWindowDays);
        var objectId = profileId.ToString();
        var entries = await db.StatusHistory
            .AsNoTracking()
            .Where(entry =>
                entry.ObjectType == HistoryObjectTypes.HoSoGiaoVien &&
                entry.ObjectId == objectId)
            .Select(entry => new { entry.PreviousStatus, entry.Status, entry.OccurredAt })
            .ToListAsync(cancellationToken);
        var count = entries.Count(entry =>
            (entry.PreviousStatus == TeacherProfileStatus.TuChoi ||
             entry.PreviousStatus == TeacherProfileStatus.CanBoSung) &&
            entry.Status == TeacherProfileStatus.ChoDuyet &&
            entry.OccurredAt >= since);
        return count >= ResubmissionLimit;
    }

    private async Task<IReadOnlyList<ProfileHistoryResponse>> LoadHistoryAsync(
        long profileId,
        bool includeInternalNote,
        CancellationToken cancellationToken)
    {
        var objectId = profileId.ToString();
        var history = await db.StatusHistory
            .AsNoTracking()
            .Where(entry =>
                entry.ObjectType == HistoryObjectTypes.HoSoGiaoVien &&
                entry.ObjectId == objectId)
            .Select(entry => new
            {
                entry.Id,
                entry.PreviousStatus,
                entry.Status,
                entry.Reason,
                entry.ReasonCode,
                entry.InternalNote,
                entry.FieldsToUpdate,
                entry.OccurredAt
            })
            .ToListAsync(cancellationToken);
        return history
            .OrderBy(entry => entry.OccurredAt)
            .ThenBy(entry => entry.Id)
            .Select(entry => new ProfileHistoryResponse(
                entry.PreviousStatus,
                entry.Status,
                entry.Reason,
                entry.ReasonCode,
                includeInternalNote ? entry.InternalNote : null,
                TeacherProfileFields.Deserialize(entry.FieldsToUpdate),
                entry.OccurredAt))
            .ToList();
    }

    private async Task SendSubmittedEmailAsync(
        Guid userId,
        bool resubmission,
        CancellationToken cancellationToken)
    {
        try
        {
            var accountMap = await accounts.GetAccountsAsync([userId], cancellationToken);
            accountMap.TryGetValue(userId, out var account);
            await emailSender.SendAsync(
                account?.Email,
                TeacherProfileEmails.SubmittedSubject,
                TeacherProfileEmails.SubmittedBody(account?.DisplayName, resubmission),
                cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not send the teacher profile submission email.");
        }
    }

    private static bool IsUniqueViolation(DbUpdateException exception) =>
        exception.InnerException switch
        {
            PostgresException { SqlState: "23505" } => true,
            _ => false
        };

    private ObjectResult ApiProblem(int statusCode, string code, string detail, string? title = null) =>
        Problem(
            statusCode: statusCode,
            title: title ?? "Không thể xử lý yêu cầu",
            detail: detail,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
