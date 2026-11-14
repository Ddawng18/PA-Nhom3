using System.Data;
using Linea.Api.Data;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController, Route("api/profile"), Authorize]
public sealed class ProfileController(AppDbContext db) : ControllerBase
{
    public sealed record ProfileResponse(string? display_name, string? avatar_url);
    public sealed record UpdateProfileRequest(string? display_name, string? avatar_url);

    [HttpGet("me")]
    public async Task<IActionResult> Get(CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        if (!db.Database.IsNpgsql())
        {
            var user = await db.Users.AsNoTracking().SingleOrDefaultAsync(item => item.Id == userId, ct);
            return user is null ? NotFound() : Ok(new ProfileResponse(user.DisplayName, null));
        }

        await using var command = await CreateCommandAsync(
            "select display_name, avatar_url from public.nguoi_dung where id = @id", userId, ct);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return !await reader.ReadAsync(ct)
            ? NotFound()
            : Ok(new ProfileResponse(
                reader.IsDBNull(0) ? null : reader.GetString(0),
                reader.IsDBNull(1) ? null : reader.GetString(1)));
    }

    [HttpPut("me")]
    public async Task<IActionResult> Update(UpdateProfileRequest request, CancellationToken ct)
    {
        if (!User.TryGetUserId(out var userId)) return Unauthorized();
        var displayName = string.IsNullOrWhiteSpace(request.display_name) ? null : request.display_name.Trim();
        var avatarUrl = string.IsNullOrWhiteSpace(request.avatar_url) ? null : request.avatar_url.Trim();
        if (displayName?.Length > 100 || avatarUrl?.Length > 1000)
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Thông tin hồ sơ vượt quá giới hạn." });
        if (avatarUrl is not null && (!Uri.TryCreate(avatarUrl, UriKind.Absolute, out var uri) ||
            uri.Scheme is not ("http" or "https")))
            return BadRequest(new { code = "VALIDATION_ERROR", detail = "Địa chỉ ảnh đại diện không hợp lệ." });

        if (!db.Database.IsNpgsql())
        {
            var user = await db.Users.SingleOrDefaultAsync(item => item.Id == userId, ct);
            if (user is null) return NotFound();
            user.DisplayName = displayName;
            user.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync(ct);
            return Ok(new ProfileResponse(user.DisplayName, null));
        }

        await using var command = await CreateCommandAsync(
            """
            update public.nguoi_dung
            set display_name = @display_name, avatar_url = @avatar_url
            where id = @id
            returning display_name, avatar_url
            """, userId, ct);
        AddParameter(command, "display_name", displayName);
        AddParameter(command, "avatar_url", avatarUrl);
        await using var reader = await command.ExecuteReaderAsync(ct);
        return !await reader.ReadAsync(ct)
            ? NotFound()
            : Ok(new ProfileResponse(
                reader.IsDBNull(0) ? null : reader.GetString(0),
                reader.IsDBNull(1) ? null : reader.GetString(1)));
    }

    private async Task<System.Data.Common.DbCommand> CreateCommandAsync(
        string sql, Guid userId, CancellationToken ct)
    {
        var connection = db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);
        var command = connection.CreateCommand();
        command.CommandText = sql;
        AddParameter(command, "id", userId);
        return command;
    }

    private static void AddParameter(System.Data.Common.DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }
}
