using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/admin/teacher-profiles")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminTeacherProfilesController(
    AppDbContext db,
    AccountDirectory accounts,
    IPortfolioStorage portfolioStorage,
    IEmailSender emailSender,
    ILogger<AdminTeacherProfilesController> logger) : ControllerBase
{
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 20;
    private const int MinReasonLength = 10;
    private const int MaxReasonLength = 500;
    private const int MaxInternalNoteLength = 1000;
    private static readonly TimeSpan SignedUrlLifetime = TimeSpan.FromMinutes(5);

    [HttpGet]
    [ProducesResponseType<AdminTeacherProfileListResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = DefaultPageSize,
        CancellationToken cancellationToken = default)
    {
        if (page < 1)
        {
            return ApiProblem(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Trang phải bắt đầu từ 1.");
        }

        var statusFilter = string.IsNullOrWhiteSpace(status)
            ? null
            : status.Trim().ToUpperInvariant();
        if (statusFilter is not null && !TeacherProfileStatus.IsValid(statusFilter))
        {
            return ApiProblem(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Trạng thái phải là CHO_DUYET, CAN_BO_SUNG, DA_DUYET hoặc TU_CHOI.");
        }

        pageSize = Math.Clamp(pageSize, 1, MaxPageSize);

        var query = db.TeacherProfiles.AsNoTracking();
        if (statusFilter is not null)
        {
            query = query.Where(profile => profile.Status == statusFilter);
        }

        var profiles = await query.ToListAsync(cancellationToken);
        profiles = profiles
            .OrderBy(profile => profile.SubmittedAt)
            .ThenBy(profile => profile.Id)
            .ToList();

        var accountMap = await accounts.GetAccountsAsync(
            profiles.Select(profile => profile.UserId).Distinct().ToList(),
            cancellationToken);

        IEnumerable<TeacherProfile> filtered = profiles;
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim();
            filtered = filtered.Where(profile =>
            {
                accountMap.TryGetValue(profile.UserId, out var account);
                return Contains(account?.DisplayName, term) ||
                       Contains(account?.Email, term) ||
                       Contains(profile.Introduction, term) ||
                       Contains(profile.Experience, term);
            });
        }

        var matched = filtered.ToList();
        var total = matched.Count;
        var pageItems = matched
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        var profileIds = pageItems.Select(profile => profile.Id.ToString()).ToList();
        var resubmissionCounts = profileIds.Count == 0
            ? new Dictionary<string, int>()
            : await db.StatusHistory
                .AsNoTracking()
                .Where(entry =>
                    entry.ObjectType == HistoryObjectTypes.HoSoGiaoVien &&
                    profileIds.Contains(entry.ObjectId) &&
                    (entry.PreviousStatus == TeacherProfileStatus.TuChoi ||
                     entry.PreviousStatus == TeacherProfileStatus.CanBoSung) &&
                    entry.Status == TeacherProfileStatus.ChoDuyet)
                .GroupBy(entry => entry.ObjectId)
                .Select(group => new { ObjectId = group.Key, Count = group.Count() })
                .ToDictionaryAsync(item => item.ObjectId, item => item.Count, cancellationToken);

        var items = pageItems.Select(profile =>
        {
            accountMap.TryGetValue(profile.UserId, out var account);
            resubmissionCounts.TryGetValue(profile.Id.ToString(), out var resubmissionCount);
            return new AdminTeacherProfileListItem(
                profile.Id,
                profile.UserId,
                account?.DisplayName,
                account?.Email,
                profile.Introduction,
                profile.Experience,
                profile.Status,
                profile.SupplementReason,
                profile.SubmittedAt,
                profile.ReviewedAt,
                resubmissionCount);
        }).ToList();

        return Ok(new AdminTeacherProfileListResponse(items, page, pageSize, total));
    }

    [HttpGet("{id:long}")]
    [ProducesResponseType<AdminTeacherProfileDetailResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Detail(long id, CancellationToken cancellationToken)
    {
        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .Include(item => item.PortfolioImages)
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy hồ sơ giáo viên.");
        }

        var accountMap = await accounts.GetAccountsAsync([profile.UserId], cancellationToken);
        accountMap.TryGetValue(profile.UserId, out var account);
        var history = await LoadHistoryAsync(id, cancellationToken);

        return Ok(new AdminTeacherProfileDetailResponse(
            profile.Id,
            profile.UserId,
            account?.DisplayName,
            account?.Email,
            profile.Introduction,
            profile.Experience,
            profile.Status,
            profile.RejectionReason,
            profile.SupplementReason,
            profile.ReasonCode,
            profile.InternalNote,
            TeacherProfileFields.Deserialize(profile.FieldsToUpdate),
            profile.SubmittedAt,
            profile.ReviewedAt,
            profile.PortfolioImages
                .OrderBy(image => image.Id)
                .Select(image => new PortfolioFileResponse(
                    image.Id,
                    image.FilePath,
                    $"/api/admin/teacher-profiles/{profile.Id}/portfolio/{image.Id}",
                    $"/api/admin/teacher-profiles/{profile.Id}/portfolio/{image.Id}/signed-url",
                    image.UploadedAt))
                .ToList(),
            history));
    }

    [HttpPost("{id:long}/approve")]
    [ProducesResponseType<ApproveTeacherProfileResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Approve(
        long id,
        [FromBody(EmptyBodyBehavior = EmptyBodyBehavior.Allow)] ApproveTeacherProfileRequest? request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var adminId))
        {
            return Unauthorized();
        }

        var note = TextSanitizer.ToPlainText(request?.Note);
        if (note.Length > MaxInternalNoteLength)
        {
            ModelState.AddModelError("note", "Ghi chú không được dài quá 1000 ký tự.");
            return ValidationProblem(ModelState);
        }

        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy hồ sơ giáo viên.");
        }

        if (profile.Status != TeacherProfileStatus.ChoDuyet)
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Chỉ có thể duyệt hồ sơ đang chờ duyệt.");
        }

        var now = DateTimeOffset.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var affected = await db.TeacherProfiles
            .Where(item => item.Id == id && item.Status == TeacherProfileStatus.ChoDuyet)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, TeacherProfileStatus.DaDuyet)
                .SetProperty(item => item.ReviewedAt, now)
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

        if (!await accounts.SetRoleAsync(profile.UserId, UserRole.Teacher, cancellationToken))
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiProblem(StatusCodes.Status409Conflict, "ACCOUNT_NOT_FOUND",
                "Không tìm thấy tài khoản của hồ sơ. Vui lòng tải lại.");
        }

        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = HistoryObjectTypes.HoSoGiaoVien,
            ObjectId = profile.Id.ToString(),
            PreviousStatus = TeacherProfileStatus.ChoDuyet,
            Status = TeacherProfileStatus.DaDuyet,
            ActorId = adminId,
            Reason = string.IsNullOrWhiteSpace(note) ? null : note,
            ReasonCode = null,
            InternalNote = null,
            FieldsToUpdate = null,
            OccurredAt = now
        });

        db.Notifications.Add(new NotificationMessage
        {
            UserId = profile.UserId,
            Type = NotificationTypes.HoSoGiaoVien,
            Content = "Chúc mừng! Hồ sơ giáo viên của bạn đã được duyệt. Bạn có thể bắt đầu tạo khóa học.",
            Link = "/teacher/dashboard",
            IsRead = false,
            CreatedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await transaction.DisposeAsync();

        await SendDecisionEmailAsync(
            profile.UserId,
            TeacherProfileEmails.DecisionSubject,
            TeacherProfileEmails.ApprovedBody(await DisplayNameAsync(profile.UserId, cancellationToken)),
            cancellationToken);

        return Ok(new ApproveTeacherProfileResponse(
            profile.Id,
            TeacherProfileStatus.DaDuyet,
            "teacher",
            now));
    }

    [HttpPost("{id:long}/reject")]
    [ProducesResponseType<RejectTeacherProfileResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> Reject(
        long id,
        [FromBody] RejectTeacherProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var adminId))
        {
            return Unauthorized();
        }

        var reason = TextSanitizer.ToPlainText(request.Reason);
        var reasonCode = NormalizeReasonCode(request.ReasonCode);
        var internalNote = NormalizeInternalNote(request.InternalNote);
        ValidateDecision(reasonCode, reason, internalNote, requireFields: false, fields: null);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy hồ sơ giáo viên.");
        }

        if (profile.Status != TeacherProfileStatus.ChoDuyet)
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Chỉ có thể từ chối hồ sơ đang chờ duyệt.");
        }

        var now = DateTimeOffset.UtcNow;
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var affected = await db.TeacherProfiles
            .Where(item => item.Id == id && item.Status == TeacherProfileStatus.ChoDuyet)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, TeacherProfileStatus.TuChoi)
                .SetProperty(item => item.ReviewedAt, now)
                .SetProperty(item => item.RejectionReason, reason)
                .SetProperty(item => item.SupplementReason, (string?)null)
                .SetProperty(item => item.ReasonCode, reasonCode)
                .SetProperty(item => item.InternalNote, internalNote)
                .SetProperty(item => item.FieldsToUpdate, (string?)null), cancellationToken);

        if (affected == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Hồ sơ đã được người khác xử lý. Vui lòng tải lại.");
        }

        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = HistoryObjectTypes.HoSoGiaoVien,
            ObjectId = profile.Id.ToString(),
            PreviousStatus = TeacherProfileStatus.ChoDuyet,
            Status = TeacherProfileStatus.TuChoi,
            ActorId = adminId,
            Reason = reason,
            ReasonCode = reasonCode,
            InternalNote = internalNote,
            FieldsToUpdate = null,
            OccurredAt = now
        });

        db.Notifications.Add(new NotificationMessage
        {
            UserId = profile.UserId,
            Type = NotificationTypes.HoSoGiaoVien,
            Content = $"Hồ sơ giáo viên của bạn bị từ chối. Lý do: {reason}. Bạn có thể chỉnh sửa và gửi lại.",
            Link = "/teacher/onboarding",
            IsRead = false,
            CreatedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await transaction.DisposeAsync();

        await SendDecisionEmailAsync(
            profile.UserId,
            TeacherProfileEmails.DecisionSubject,
            TeacherProfileEmails.RejectedBody(await DisplayNameAsync(profile.UserId, cancellationToken), reason),
            cancellationToken);

        return Ok(new RejectTeacherProfileResponse(
            profile.Id,
            TeacherProfileStatus.TuChoi,
            reasonCode,
            reason,
            now));
    }

    [HttpPost("{id:long}/request-changes")]
    [ProducesResponseType<RequestChangesTeacherProfileResponse>(StatusCodes.Status200OK)]
    public async Task<IActionResult> RequestChanges(
        long id,
        [FromBody] RequestChangesTeacherProfileRequest request,
        CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var adminId))
        {
            return Unauthorized();
        }

        var reason = TextSanitizer.ToPlainText(request.Reason);
        var reasonCode = NormalizeReasonCode(request.ReasonCode);
        var internalNote = NormalizeInternalNote(request.InternalNote);
        var fields = TeacherProfileFields.Normalize(request.Fields);
        ValidateDecision(reasonCode, reason, internalNote, requireFields: true, fields);
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == id, cancellationToken);
        if (profile is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy hồ sơ giáo viên.");
        }

        if (profile.Status != TeacherProfileStatus.ChoDuyet)
        {
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Chỉ có thể yêu cầu bổ sung hồ sơ đang chờ duyệt.");
        }

        var now = DateTimeOffset.UtcNow;
        var fieldsJson = TeacherProfileFields.Serialize(fields);
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var affected = await db.TeacherProfiles
            .Where(item => item.Id == id && item.Status == TeacherProfileStatus.ChoDuyet)
            .ExecuteUpdateAsync(setters => setters
                .SetProperty(item => item.Status, TeacherProfileStatus.CanBoSung)
                .SetProperty(item => item.ReviewedAt, now)
                .SetProperty(item => item.RejectionReason, (string?)null)
                .SetProperty(item => item.SupplementReason, reason)
                .SetProperty(item => item.ReasonCode, reasonCode)
                .SetProperty(item => item.InternalNote, internalNote)
                .SetProperty(item => item.FieldsToUpdate, fieldsJson), cancellationToken);

        if (affected == 0)
        {
            await transaction.RollbackAsync(cancellationToken);
            return ApiProblem(StatusCodes.Status409Conflict, "INVALID_STATUS_TRANSITION",
                "Hồ sơ đã được người khác xử lý. Vui lòng tải lại.");
        }

        db.StatusHistory.Add(new StatusHistoryEntry
        {
            ObjectType = HistoryObjectTypes.HoSoGiaoVien,
            ObjectId = profile.Id.ToString(),
            PreviousStatus = TeacherProfileStatus.ChoDuyet,
            Status = TeacherProfileStatus.CanBoSung,
            ActorId = adminId,
            Reason = reason,
            ReasonCode = reasonCode,
            InternalNote = internalNote,
            FieldsToUpdate = fieldsJson,
            OccurredAt = now
        });

        db.Notifications.Add(new NotificationMessage
        {
            UserId = profile.UserId,
            Type = NotificationTypes.HoSoGiaoVien,
            Content = $"Hồ sơ giáo viên cần bổ sung: {reason}. Vui lòng cập nhật: {TeacherProfileEmails.FieldsLabel(fields!)} và gửi lại.",
            Link = "/teacher/onboarding",
            IsRead = false,
            CreatedAt = now
        });

        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        await transaction.DisposeAsync();

        await SendDecisionEmailAsync(
            profile.UserId,
            TeacherProfileEmails.DecisionSubject,
            TeacherProfileEmails.ChangesRequestedBody(
                await DisplayNameAsync(profile.UserId, cancellationToken),
                reason,
                fields!),
            cancellationToken);

        return Ok(new RequestChangesTeacherProfileResponse(
            profile.Id,
            TeacherProfileStatus.CanBoSung,
            reasonCode,
            reason,
            fields!,
            now));
    }

    [HttpGet("{id:long}/portfolio/{imageId:long}")]
    public async Task<IActionResult> DownloadPortfolio(
        long id,
        long imageId,
        CancellationToken cancellationToken)
    {
        var relativePath = await db.PortfolioImages
            .AsNoTracking()
            .Where(image => image.Id == imageId && image.ProfileId == id)
            .Select(image => image.FilePath)
            .SingleOrDefaultAsync(cancellationToken);
        if (relativePath is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
        }

        return await ServePortfolioAsync(relativePath, cancellationToken);
    }

    [HttpPost("{id:long}/portfolio/{imageId:long}/signed-url")]
    public async Task<IActionResult> CreatePortfolioSignedUrl(
        long id,
        long imageId,
        CancellationToken cancellationToken)
    {
        var image = await db.PortfolioImages
            .AsNoTracking()
            .Where(item => item.Id == imageId && item.ProfileId == id)
            .Select(item => new { item.FilePath, item.Profile!.UserId })
            .SingleOrDefaultAsync(cancellationToken);
        if (image is null)
        {
            return ApiProblem(StatusCodes.Status404NotFound, "NOT_FOUND",
                "Không tìm thấy ảnh tác phẩm.");
        }

        var signed = await portfolioStorage.CreateSignedUrlAsync(
            imageId,
            image.UserId,
            image.FilePath,
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

    private void ValidateDecision(
        string? reasonCode,
        string reason,
        string? internalNote,
        bool requireFields,
        IReadOnlyList<string>? fields)
    {
        if (reasonCode is null)
        {
            ModelState.AddModelError("reasonCode", "Vui lòng chọn lý do.");
        }
        else if (!RejectionReasonCodes.All.Contains(reasonCode))
        {
            ModelState.AddModelError("reasonCode", "Mã lý do không hợp lệ.");
        }

        if (reason.Length is < MinReasonLength or > MaxReasonLength)
        {
            ModelState.AddModelError(
                "reason",
                $"Vui lòng nhập lý do từ {MinReasonLength} đến {MaxReasonLength} ký tự.");
        }

        if (internalNote is { Length: > MaxInternalNoteLength })
        {
            ModelState.AddModelError(
                "internalNote",
                $"Ghi chú nội bộ không được dài quá {MaxInternalNoteLength} ký tự.");
        }

        if (requireFields && (fields is null || fields.Count == 0))
        {
            ModelState.AddModelError("fields", "Vui lòng chọn thông tin cần bổ sung.");
        }
    }

    private static string? NormalizeReasonCode(string? reasonCode) =>
        string.IsNullOrWhiteSpace(reasonCode) ? null : reasonCode.Trim().ToUpperInvariant();

    private static string? NormalizeInternalNote(string? internalNote)
    {
        var sanitized = TextSanitizer.ToPlainText(internalNote);
        return string.IsNullOrWhiteSpace(sanitized) ? null : sanitized;
    }

    private async Task<string?> DisplayNameAsync(Guid userId, CancellationToken cancellationToken)
    {
        try
        {
            var map = await accounts.GetAccountsAsync([userId], cancellationToken);
            return map.TryGetValue(userId, out var account) ? account.DisplayName : null;
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not read the display name for account {UserId}.", userId);
            return null;
        }
    }

    private async Task SendDecisionEmailAsync(
        Guid userId,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        try
        {
            var map = await accounts.GetAccountsAsync([userId], cancellationToken);
            map.TryGetValue(userId, out var account);
            await emailSender.SendAsync(account?.Email, subject, body, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not send a teacher profile decision email.");
        }
    }

    private async Task<IReadOnlyList<ProfileHistoryResponse>> LoadHistoryAsync(
        long profileId,
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
                entry.InternalNote,
                TeacherProfileFields.Deserialize(entry.FieldsToUpdate),
                entry.OccurredAt))
            .ToList();
    }

    private static bool Contains(string? value, string term) =>
        value?.Contains(term, StringComparison.OrdinalIgnoreCase) ?? false;

    private ObjectResult ApiProblem(int statusCode, string code, string detail, string? title = null) =>
        Problem(
            statusCode: statusCode,
            title: title ?? "Không thể xử lý yêu cầu",
            detail: detail,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
