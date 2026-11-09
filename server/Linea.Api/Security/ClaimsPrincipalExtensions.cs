using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Linea.Api.Models;

namespace Linea.Api.Security;

public static class ClaimsPrincipalExtensions
{
    public static bool TryGetUserId(this ClaimsPrincipal principal, out Guid userId) =>
        Guid.TryParse(principal.FindFirstValue(JwtRegisteredClaimNames.Sub), out userId);

    public static string GetRequiredUserId(this ClaimsPrincipal principal) =>
        principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? throw new InvalidOperationException("The authenticated user has no subject claim.");

    public static bool IsAdmin(this ClaimsPrincipal principal) =>
        principal.IsInRole(UserRole.Admin.ToString().ToLowerInvariant());
}
