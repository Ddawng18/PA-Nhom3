using Linea.Api.Models;

namespace Linea.Api.Services;

public sealed record TokenResult(string AccessToken, DateTimeOffset ExpiresAt);

public interface ITokenService
{
    TokenResult Create(User user);
}
