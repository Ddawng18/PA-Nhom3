using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Linea.Api.Services;

public sealed record SupabaseAccount(Guid Id, string? DisplayName, string Role);
public sealed record SupabaseAccountResult(SupabaseAccount? Account, bool Unavailable = false);

// Verify the bearer token with Auth, then query the user's own profile with RLS.
public sealed class SupabaseAccountService(HttpClient client, string publishableKey)
{
    public async Task<SupabaseAccountResult> GetAccountAsync(string token, CancellationToken cancellationToken)
    {
        try
        {
            using var userRequest = CreateRequest("auth/v1/user", token);
            using var userResponse = await client.SendAsync(userRequest, cancellationToken);
            if (userResponse.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return new(null);
            if (!userResponse.IsSuccessStatusCode) return new(null, true);

            var user = await userResponse.Content.ReadFromJsonAsync<AuthUser>(cancellationToken: cancellationToken);
            if (user is null || user.Id == Guid.Empty) return new(null, true);

            using var profileRequest = CreateRequest($"rest/v1/nguoi_dung?id=eq.{user.Id:D}&select=id,display_name,role", token);
            using var profileResponse = await client.SendAsync(profileRequest, cancellationToken);
            if (profileResponse.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return new(null);
            if (!profileResponse.IsSuccessStatusCode) return new(null, true);
            var profiles = await profileResponse.Content.ReadFromJsonAsync<Profile[]>(cancellationToken: cancellationToken);
            if (profiles is not { Length: 1 } || profiles[0].Id != user.Id ||
                profiles[0].Role is not ("student" or "teacher" or "admin")) return new(null);
            return new(new SupabaseAccount(user.Id, profiles[0].DisplayName, profiles[0].Role));
        }
        catch (HttpRequestException) { return new(null, true); }
        catch (System.Text.Json.JsonException) { return new(null, true); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { return new(null, true); }
    }

    private HttpRequestMessage CreateRequest(string path, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("apikey", publishableKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private sealed record AuthUser(Guid Id);
    private sealed record Profile(Guid Id, [property: JsonPropertyName("display_name")] string? DisplayName, string Role);
}
