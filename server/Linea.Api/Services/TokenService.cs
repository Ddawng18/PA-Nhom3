using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Linea.Api.Models;
using Microsoft.IdentityModel.Tokens;

namespace Linea.Api.Services;

public sealed class TokenService(JwtOptions options) : ITokenService
{
    public TokenResult Create(User user)
    {
        var now = DateTimeOffset.UtcNow;
        var expiresAt = now.AddMinutes(options.ExpiryMinutes);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new Claim(JwtRegisteredClaimNames.Email, user.Email),
            new Claim("role", user.Role.ToString().ToLowerInvariant()),
            new Claim("name", user.DisplayName ?? user.Email),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString("N"))
        };

        var credentials = new SigningCredentials(
            new SymmetricSecurityKey(Encoding.UTF8.GetBytes(options.Key)),
            SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: options.Issuer,
            audience: options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expiresAt.UtcDateTime,
            signingCredentials: credentials);

        return new TokenResult(
            new JwtSecurityTokenHandler().WriteToken(token),
            expiresAt);
    }
}
