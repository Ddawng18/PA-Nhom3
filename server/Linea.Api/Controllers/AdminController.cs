using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminController(
    AppDbContext db,
    AdminManagementService admin,
    IWebHostEnvironment environment,
    IConfiguration configuration) : ControllerBase
{
    private bool UseSupabase => db.Database.IsNpgsql();

    [HttpGet("users")]
    public async Task<IActionResult> GetUsers(
        [FromQuery] int take = 50,
        [FromQuery] string? search = null,
        [FromQuery] string? role = null,
        [FromQuery] bool? locked = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken cancellationToken = default)
    {
        if (!UseSupabase)
        {
            if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
                return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
            var limit = Math.Clamp(take, 1, 200);
            var users = await db.Users.AsNoTracking().ToListAsync(cancellationToken);
            return Ok(users
                .OrderBy(user => user.CreatedAt)
                .Take(limit)
                .Select(UserResponse.From)
                .ToList());
        }

        if (page < 1)
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Trang phải bắt đầu từ 1.");
        pageSize = Math.Clamp(pageSize, 1, 100);
        var roleFilter = NormalizeRole(role);
        if (role is not null && roleFilter is null)
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Vai trò phải là student, teacher hoặc admin.");

        try
        {
            return Ok(await admin.ListUsersAsync(search, roleFilter, locked, page, pageSize, cancellationToken));
        }
        catch (Exception exception)
        {
            return MapAdminException(exception);
        }
    }

    [HttpGet("users/{id:guid}")]
    public async Task<IActionResult> GetUser(Guid id, CancellationToken cancellationToken)
    {
        try
        {
            if (!UseSupabase)
            {
                var user = await db.Users.AsNoTracking()
                    .SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
                return user is null ? NotFound() : Ok(UserResponse.From(user));
            }

            return Ok(await admin.GetUserAsync(id, cancellationToken));
        }
        catch (Exception exception)
        {
            return MapAdminException(exception);
        }
    }

    [HttpPatch("users/{id:guid}/lock")]
    public async Task<IActionResult> UpdateLock(
        Guid id,
        [FromBody] UpdateLockRequest request,
        CancellationToken cancellationToken)
    {
        if (!UseSupabase)
        {
            if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
                return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
            var user = await db.Users.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
            if (user is null) return NotFound();
            if (request.IsLocked && user.Role == UserRole.Admin)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Yêu cầu không hợp lệ",
                    detail: "Không thể khóa tài khoản quản trị.");
            }
            if (request.IsLocked && User.TryGetUserId(out var currentUserId) && currentUserId == id)
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Yêu cầu không hợp lệ",
                    detail: "Không thể tự khóa tài khoản của chính mình.");
            }

            user.IsLocked = request.IsLocked;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return NoContent();
        }

        if (request.IsLocked && User.TryGetUserId(out var actorId) && actorId == id)
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Không thể tự khóa tài khoản của chính mình.");
        if (!User.TryGetUserId(out var adminId)) return Unauthorized();
        var reason = ValidateReason(request.Reason);
        if (reason is null)
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Lý do khóa/mở phải từ 10 đến 500 ký tự.");
        if (request.ExpectedVersion is not > 0)
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Thiếu phiên bản tài khoản (expectedVersion). Tải lại danh sách trước khi thao tác.");

        try
        {
            return Ok(await admin.SetUserLockAsync(
                adminId, id, request.IsLocked, reason, request.ExpectedVersion.Value, cancellationToken));
        }
        catch (Exception exception)
        {
            return MapAdminException(exception);
        }
    }

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        var role = NormalizeRole(request.Role);
        if (role is null)
        {
            ModelState.AddModelError(nameof(request.Role), "Vai trò phải là student, teacher hoặc admin.");
            return ValidationProblem(ModelState);
        }

        if (!UseSupabase)
        {
            if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
                return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
            var user = await db.Users.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
            if (user is null) return NotFound();
            if (User.TryGetUserId(out var currentUserId) &&
                currentUserId == id &&
                !string.Equals(role, "admin", StringComparison.Ordinal))
            {
                return Problem(
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "Yêu cầu không hợp lệ",
                    detail: "Không thể tự hạ quyền quản trị của chính mình.");
            }

            user.Role = role switch
            {
                "admin" => UserRole.Admin,
                "teacher" => UserRole.Teacher,
                _ => UserRole.Student
            };
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(cancellationToken);
            return NoContent();
        }

        if (!User.TryGetUserId(out var actorId)) return Unauthorized();
        if (actorId == id && !string.Equals(role, "admin", StringComparison.Ordinal))
            return AdminFailure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Không thể tự hạ quyền quản trị của chính mình.");
        var reason = ValidateReason(request.Reason) ?? "Quản trị viên cập nhật vai trò tài khoản.";

        try
        {
            return Ok(await admin.SetUserRoleAsync(
                actorId, id, role, reason, request.ExpectedVersion, cancellationToken));
        }
        catch (Exception exception)
        {
            return MapAdminException(exception);
        }
    }

    private static string? NormalizeRole(string? role)
    {
        if (string.IsNullOrWhiteSpace(role)) return null;
        var value = role.Trim().ToLowerInvariant();
        return value is "student" or "teacher" or "admin" ? value : null;
    }

    private static string? ValidateReason(string? reason)
    {
        var value = reason?.Trim();
        return value is { Length: >= 10 and <= 500 } ? value : null;
    }

    private IActionResult MapAdminException(Exception exception) => exception switch
    {
        AdminSchemaNotReadyException => AdminFailure(
            StatusCodes.Status503ServiceUnavailable, "SCHEMA_NOT_READY", exception.Message),
        AdminVersionConflictException => AdminFailure(
            StatusCodes.Status409Conflict, "VERSION_CONFLICT", exception.Message),
        AdminInvalidStateException => AdminFailure(
            StatusCodes.Status409Conflict, "INVALID_STATE", exception.Message),
        KeyNotFoundException => AdminFailure(
            StatusCodes.Status404NotFound, "NOT_FOUND", exception.Message),
        _ => throw exception
    };

    private ObjectResult AdminFailure(int statusCode, string code, string detail) =>
        Problem(
            statusCode: statusCode,
            title: "Không thể xử lý yêu cầu",
            detail: detail,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
