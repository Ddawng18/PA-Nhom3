namespace Linea.Api.Services;

public sealed class JwtOptions
{
    public string Key { get; init; } = string.Empty;

    public string Issuer { get; init; } = "linea-api";

    public string Audience { get; init; } = "linea-client";

    public int ExpiryMinutes { get; init; } = 60;
}
