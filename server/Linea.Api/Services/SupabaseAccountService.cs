using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Serialization;

namespace Linea.Api.Services;

public sealed record SupabaseAccount(Guid Id, string? DisplayName, string Role, bool IsLocked = false);
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

            using var profileRequest = CreateRequest(
                $"rest/v1/nguoi_dung?id=eq.{user.Id:D}&select=id,display_name,role,is_locked", token);
            using var profileResponse = await client.SendAsync(profileRequest, cancellationToken);
            if (profileResponse.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                return new(null);

            if (profileResponse.StatusCode == HttpStatusCode.BadRequest)
            {
                // The admin migration has not been applied yet. Authentication can
                // still work; the direct database check becomes active after the
                // reviewed migration adds nguoi_dung.is_locked.
                using var fallbackRequest = CreateRequest(
                    $"rest/v1/nguoi_dung?id=eq.{user.Id:D}&select=id,display_name,role", token);
                using var fallbackResponse = await client.SendAsync(fallbackRequest, cancellationToken);
                return await ReadProfileAsync(fallbackResponse, user.Id, cancellationToken);
            }

            if (!profileResponse.IsSuccessStatusCode) return new(null, true);
            return await ReadProfileAsync(profileResponse, user.Id, cancellationToken);
        }
        catch (HttpRequestException) { return new(null, true); }
        catch (System.Text.Json.JsonException) { return new(null, true); }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested) { return new(null, true); }
    }

    private static async Task<SupabaseAccountResult> ReadProfileAsync(
        HttpResponseMessage response,
        Guid userId,
        CancellationToken cancellationToken)
    {
        if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
            return new(null);
        if (!response.IsSuccessStatusCode) return new(null, true);

        var profiles = await response.Content.ReadFromJsonAsync<Profile[]>(cancellationToken: cancellationToken);
        if (profiles is not { Length: 1 } || profiles[0].Id != userId ||
            profiles[0].Role is not ("student" or "teacher" or "admin")) return new(null);

        var profile = profiles[0];
        return new(new SupabaseAccount(profile.Id, profile.DisplayName, profile.Role, profile.IsLocked));
    }

    private HttpRequestMessage CreateRequest(string path, string token)
    {
        var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("apikey", publishableKey);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private sealed record AuthUser(Guid Id);
    private sealed record Profile(
        Guid Id,
        [property: JsonPropertyName("display_name")] string? DisplayName,
        string Role,
        [property: JsonPropertyName("is_locked")] bool IsLocked = false);
}
