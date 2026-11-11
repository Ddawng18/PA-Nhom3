using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;

namespace Linea.Api.Services;

public sealed class SignedUrlService
{
    private const string Version = "v1";
    private readonly byte[] _key;

    public SignedUrlService(IConfiguration configuration, ILogger<SignedUrlService> logger)
    {
        var configuredKey = configuration["SIGNED_URL_KEY"];
        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            configuredKey = configuration["JWT_KEY"];
        }

        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            configuredKey = configuration["SUPABASE_SERVICE_ROLE_KEY"];
        }

        if (string.IsNullOrWhiteSpace(configuredKey))
        {
            _key = RandomNumberGenerator.GetBytes(32);
            logger.LogWarning(
                "SIGNED_URL_KEY is not configured. Signed image URLs will stop working after the process restarts.");
            return;
        }

        _key = SHA256.HashData(Encoding.UTF8.GetBytes(configuredKey));
    }

    public string CreateToken(long imageId, Guid userId, DateTimeOffset expiresAt)
    {
        var payload = $"{Version}|{imageId}|{userId:D}|{expiresAt.ToUnixTimeSeconds()}";
        var payloadBytes = Encoding.UTF8.GetBytes(payload);
        var signature = HMACSHA256.HashData(_key, payloadBytes);
        return $"{WebEncoders.Base64UrlEncode(payloadBytes)}.{WebEncoders.Base64UrlEncode(signature)}";
    }

    public bool TryValidate(
        string? token,
        long expectedImageId,
        out Guid userId,
        out DateTimeOffset expiresAt)
    {
        userId = Guid.Empty;
        expiresAt = default;
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var separator = token.IndexOf('.');
        if (separator <= 0 || separator == token.Length - 1)
        {
            return false;
        }

        byte[] payloadBytes;
        byte[] signature;
        try
        {
            payloadBytes = WebEncoders.Base64UrlDecode(token[..separator]);
            signature = WebEncoders.Base64UrlDecode(token[(separator + 1)..]);
        }
        catch (FormatException)
        {
            return false;
        }

        var expectedSignature = HMACSHA256.HashData(_key, payloadBytes);
        if (!CryptographicOperations.FixedTimeEquals(signature, expectedSignature))
        {
            return false;
        }

        var payload = Encoding.UTF8.GetString(payloadBytes);
        var parts = payload.Split('|');
        if (parts.Length != 4 ||
            !string.Equals(parts[0], Version, StringComparison.Ordinal) ||
            !long.TryParse(parts[1], out var imageId) ||
            !Guid.TryParse(parts[2], out var parsedUserId) ||
            !long.TryParse(parts[3], out var expiryUnix))
        {
            return false;
        }

        if (imageId != expectedImageId)
        {
            return false;
        }

        var parsedExpiry = DateTimeOffset.FromUnixTimeSeconds(expiryUnix);
        if (parsedExpiry <= DateTimeOffset.UtcNow)
        {
            return false;
        }

        userId = parsedUserId;
        expiresAt = parsedExpiry;
        return true;
    }
}
