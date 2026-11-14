using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/admin/courses")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminCoursesController(
    AppDbContext db,
    AdminManagementService admin) : ControllerBase
{
    private static readonly IReadOnlySet<string> Statuses =
        new HashSet<string>(StringComparer.Ordinal) { "NHAP", "CHO_DUYET", "DA_DANG", "AN", "DA_GO" };

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? search,
        [FromQuery] string? status,
        [FromQuery] bool? hidden,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsNpgsql()) return SchemaRequired();
        if (page < 1)
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Trang phải bắt đầu từ 1.");
        pageSize = Math.Clamp(pageSize, 1, 100);
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToUpperInvariant();
        if (statusFilter is not null && !Statuses.Contains(statusFilter))
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Trạng thái phải là NHAP, CHO_DUYET, DA_DANG, AN hoặc DA_GO.");

        try
        {
            return Ok(await admin.ListCoursesAsync(
                search, statusFilter, hidden, page, pageSize, cancellationToken));
        }
        catch (Exception exception)
        {
            return Map(exception);
        }
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        if (!db.Database.IsNpgsql()) return SchemaRequired();
        try
        {
            return Ok(await admin.GetCourseAsync(id, cancellationToken));
        }
        catch (Exception exception)
        {
            return Map(exception);
        }
    }

    [HttpPatch("{id:long}/visibility")]
    public async Task<IActionResult> Visibility(
        long id,
        [FromBody] UpdateVisibilityRequest request,
        CancellationToken cancellationToken)
    {
        if (!db.Database.IsNpgsql()) return SchemaRequired();
        if (!User.TryGetUserId(out var actorId)) return Unauthorized();
        var reason = request.Reason?.Trim();
        if (reason is not { Length: >= 10 and <= 500 })
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Lý do ẩn/hiện phải từ 10 đến 500 ký tự.");
        if (request.ExpectedVersion is not > 0)
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Thiếu phiên bản khóa học (expectedVersion). Tải lại trước khi thao tác.");

        try
        {
            return Ok(await admin.SetCourseVisibilityAsync(
                actorId, id, request.Hidden, reason, request.ExpectedVersion.Value, cancellationToken));
        }
        catch (Exception exception)
        {
            return Map(exception);
        }
    }

    private IActionResult Map(Exception exception) => exception switch
    {
        AdminSchemaNotReadyException => Failure(
            StatusCodes.Status503ServiceUnavailable, "SCHEMA_NOT_READY", exception.Message),
        AdminVersionConflictException => Failure(
            StatusCodes.Status409Conflict, "VERSION_CONFLICT", exception.Message),
        AdminInvalidStateException => Failure(
            StatusCodes.Status409Conflict, "INVALID_STATE", exception.Message),
        KeyNotFoundException => Failure(
            StatusCodes.Status404NotFound, "NOT_FOUND", exception.Message),
        _ => throw exception
    };

    private IActionResult SchemaRequired() => Failure(
        StatusCodes.Status503ServiceUnavailable,
        "SCHEMA_NOT_READY",
        "Quản trị khóa học Supabase yêu cầu kết nối SUPABASE_DB_URL và migration Sprint 6.");

    private ObjectResult Failure(int statusCode, string code, string detail) =>
        Problem(
            statusCode: statusCode,
            title: "Không thể xử lý yêu cầu",
            detail: detail,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
