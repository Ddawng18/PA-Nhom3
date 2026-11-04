using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace Linea.Api.Security;

public sealed class SupabaseAuthenticationHandler(
    IOptionsMonitor<AuthenticationSchemeOptions> options,
    ILoggerFactory logger,
    UrlEncoder encoder,
    IConfiguration configuration,
    IHttpClientFactory clients) : AuthenticationHandler<AuthenticationSchemeOptions>(options, logger, encoder)
{
    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        if (!AuthenticationHeaderValue.TryParse(Request.Headers.Authorization, out var header) ||
            !string.Equals(header.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) ||
            string.IsNullOrWhiteSpace(header.Parameter)) return AuthenticateResult.NoResult();

        var projectUrl = configuration["SUPABASE_URL"];
        var key = configuration["SUPABASE_PUBLISHABLE_KEY"];
        if (!Uri.TryCreate(projectUrl?.TrimEnd('/') + "/", UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps || string.IsNullOrWhiteSpace(key))
            return AuthenticateResult.Fail("Supabase authentication is not configured.");

        var client = clients.CreateClient("supabase-account");
        client.BaseAddress = uri;
        var result = await new SupabaseAccountService(client, key).GetAccountAsync(header.Parameter, Context.RequestAborted);
        if (result.Account is null) return AuthenticateResult.Fail("Invalid or unavailable account.");
        var account = result.Account;
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new Claim(ClaimTypes.Role, account.Role),
            new Claim(ClaimTypes.Name, account.DisplayName ?? "LINEA")
        };
        var identity = new ClaimsIdentity(claims, Scheme.Name);
        return AuthenticateResult.Success(new AuthenticationTicket(new ClaimsPrincipal(identity), Scheme.Name));
    }
}
