using System.ComponentModel.DataAnnotations;
using Linea.Api.Models;

namespace Linea.Api.Contracts;

public sealed class RegisterRequest
{
    [Required(ErrorMessage = "Vui lòng nhập email.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [StringLength(254, ErrorMessage = "Email không được dài quá 254 ký tự.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập tên hiển thị.")]
    [StringLength(100, MinimumLength = 2, ErrorMessage = "Tên hiển thị phải từ 2 đến 100 ký tự.")]
    public string DisplayName { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
    [StringLength(64, MinimumLength = 8, ErrorMessage = "Mật khẩu phải từ 8 đến 64 ký tự.")]
    public string Password { get; set; } = string.Empty;
}

public sealed class LoginRequest
{
    [Required(ErrorMessage = "Vui lòng nhập email.")]
    [EmailAddress(ErrorMessage = "Email không hợp lệ.")]
    [StringLength(254, ErrorMessage = "Email không được dài quá 254 ký tự.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "Vui lòng nhập mật khẩu.")]
    [StringLength(128, ErrorMessage = "Mật khẩu không hợp lệ.")]
    public string Password { get; set; } = string.Empty;
}

public sealed record UserResponse(
    Guid Id,
    string Email,
    string? DisplayName,
    string Role,
    bool IsLocked,
    DateTimeOffset CreatedAt)
{
    public static UserResponse From(User user) => new(
        user.Id,
        user.Email,
        user.DisplayName,
        user.Role.ToString().ToLowerInvariant(),
        user.IsLocked,
        user.CreatedAt);
}

public sealed record AuthResponse(
    string AccessToken,
    string TokenType,
    DateTimeOffset ExpiresAt,
    UserResponse User);
