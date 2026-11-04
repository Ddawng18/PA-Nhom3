using System.Text;
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
[Route("api/auth")]
public sealed class AuthController(
    AppDbContext db,
    IPasswordHasher passwordHasher,
    ITokenService tokenService,
    ILogger<AuthController> logger) : ControllerBase
{
    private static readonly string DummyHash =
        BCrypt.Net.BCrypt.HashPassword("timing-equalization-only", 11);

    [HttpPost("register")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status201Created)]
    public async Task<ActionResult<UserResponse>> Register(
        [FromBody] RegisterRequest request,
        CancellationToken cancellationToken)
    {
        AddPasswordPolicyErrors(request.Password);
        if (string.IsNullOrWhiteSpace(request.DisplayName))
        {
            ModelState.AddModelError(nameof(request.DisplayName), "Vui lòng nhập tên hiển thị.");
        }

        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = EmailNormalizer.Normalize(request.Email);
        if (await db.Users.AnyAsync(user => user.Email == email, cancellationToken))
        {
            return ConflictProblem("Email này đã được đăng ký.");
        }

        var user = new User
        {
            Email = email,
            DisplayName = request.DisplayName.Trim(),
            PasswordHash = passwordHasher.Hash(request.Password),
            Role = UserRole.Student
        };

        db.Users.Add(user);

        try
        {
            await db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            return ConflictProblem("Email này đã được đăng ký.");
        }

        logger.LogInformation("Registered account {UserId}.", user.Id);
        return CreatedAtAction(nameof(Me), null, UserResponse.From(user));
    }

    [HttpPost("login")]
    [ProducesResponseType<AuthResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<AuthResponse>> Login(
        [FromBody] LoginRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = EmailNormalizer.Normalize(request.Email);
        var user = await db.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Email == email, cancellationToken);

        if (user is null)
        {
            passwordHasher.Verify(request.Password, DummyHash);
            return UnauthorizedProblem("Email hoặc mật khẩu không đúng.");
        }

        if (user.PasswordHash is null ||
            !passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return UnauthorizedProblem("Email hoặc mật khẩu không đúng.");
        }

        if (user.IsLocked)
        {
            return LockedProblem();
        }

        var token = tokenService.Create(user);
        logger.LogInformation("Account {UserId} signed in.", user.Id);

        return Ok(new AuthResponse(
            token.AccessToken,
            "Bearer",
            token.ExpiresAt,
            UserResponse.From(user)));
    }

    [Authorize]
    [HttpGet("me")]
    [ProducesResponseType<UserResponse>(StatusCodes.Status200OK)]
    public async Task<ActionResult<UserResponse>> Me(CancellationToken cancellationToken)
    {
        if (!User.TryGetUserId(out var userId))
        {
            return UnauthorizedProblem("Phiên đăng nhập không hợp lệ.");
        }

        var user = await db.Users
            .AsNoTracking()
            .SingleOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);

        if (user is null)
        {
            return UnauthorizedProblem("Phiên đăng nhập không hợp lệ.");
        }

        if (user.IsLocked)
        {
            return LockedProblem();
        }

        return Ok(UserResponse.From(user));
    }

    private void AddPasswordPolicyErrors(string password)
    {
        if (Encoding.UTF8.GetByteCount(password) > 72)
        {
            ModelState.AddModelError(nameof(RegisterRequest.Password), "Mật khẩu không được vượt quá 72 byte.");
        }
    }

    private ObjectResult ConflictProblem(string detail) => Problem(
        statusCode: StatusCodes.Status409Conflict,
        title: "Dữ liệu đã tồn tại",
        detail: detail);

    private ObjectResult UnauthorizedProblem(string detail) => Problem(
        statusCode: StatusCodes.Status401Unauthorized,
        title: "Xác thực thất bại",
        detail: detail);

    private ObjectResult LockedProblem() => Problem(
        statusCode: StatusCodes.Status423Locked,
        title: "Tài khoản đã bị khóa",
        detail: "Tài khoản đã bị khóa. Vui lòng liên hệ quản trị viên.");
}
