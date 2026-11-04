using Linea.Api.Contracts;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminController(AppDbContext db, IWebHostEnvironment environment, IConfiguration configuration) : ControllerBase
{
    [HttpGet("users")]
    [ProducesResponseType<IReadOnlyList<UserResponse>>(StatusCodes.Status200OK)]
    public async Task<ActionResult<IReadOnlyList<UserResponse>>> GetUsers(
        [FromQuery] int take = 50,
        CancellationToken cancellationToken = default)
    {
        if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
            return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
        var limit = Math.Clamp(take, 1, 200);
        var users = await db.Users
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        return Ok(users
            .OrderBy(user => user.CreatedAt)
            .Take(limit)
            .Select(UserResponse.From)
            .ToList());
    }

    [HttpPatch("users/{id:guid}/lock")]
    public async Task<IActionResult> UpdateLock(
        Guid id,
        [FromBody] UpdateLockRequest request,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
            return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
        var user = await db.Users.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound();
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

    [HttpPatch("users/{id:guid}/role")]
    public async Task<IActionResult> UpdateRole(
        Guid id,
        [FromBody] UpdateRoleRequest request,
        CancellationToken cancellationToken)
    {
        if (!environment.IsDevelopment() || configuration["AUTH_MODE"] != "legacy")
            return StatusCode(501, "Quản lý tài khoản Supabase chưa được triển khai.");
        if (!Enum.TryParse<UserRole>(request.Role, ignoreCase: true, out var role) ||
            !Enum.IsDefined(role) ||
            !string.Equals(request.Role, role.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            ModelState.AddModelError(nameof(request.Role), "Vai trò phải là student, teacher hoặc admin.");
            return ValidationProblem(ModelState);
        }

        var user = await db.Users.SingleOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return NotFound();
        }

        if (User.TryGetUserId(out var currentUserId) &&
            currentUserId == id &&
            role != UserRole.Admin)
        {
            return Problem(
                statusCode: StatusCodes.Status400BadRequest,
                title: "Yêu cầu không hợp lệ",
                detail: "Không thể tự hạ quyền quản trị của chính mình.");
        }

        user.Role = role;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);

        return NoContent();
    }
}
