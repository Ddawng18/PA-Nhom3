using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace Linea.Api.Services;

public sealed partial class SupabasePortfolioStorage(
    IHttpClientFactory clients,
    IConfiguration configuration,
    ILogger<SupabasePortfolioStorage> logger) : IPortfolioStorage
{
    private static readonly string[] AllowedContentTypes = ["image/jpeg", "image/png", "image/webp"];

    public async Task<PortfolioUploadResult> SaveAsync(IFormFile? file, CancellationToken cancellationToken)
    {
        if (!IsConfigured(out var baseUrl, out var key))
        {
            return PortfolioUploadResult.Error(
                503, "STORAGE_NOT_CONFIGURED",
                "Chưa cấu hình Supabase Storage cho ảnh tác phẩm.");
        }

        if (file is null || file.Length <= 0)
        {
            return PortfolioUploadResult.Error(
                400, "VALIDATION_ERROR", "Vui lòng chọn một ảnh tác phẩm.");
        }

        if (file.Length > PortfolioLimits.MaxFileBytes)
        {
            return PortfolioUploadResult.Error(
                413, "UPLOAD_TOO_LARGE", "Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.");
        }

        var header = new byte[12];
        await using (var input = file.OpenReadStream())
        {
            var read = await ReadHeaderAsync(input, header, cancellationToken);
            var extension = PortfolioFileTypes.DetectExtension(header, read);
            if (extension is null)
            {
                return PortfolioUploadResult.Error(
                    415, "UPLOAD_INVALID_TYPE", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
            }

            var objectPath = $"{Guid.NewGuid():N}.{extension}";
            var contentType = PortfolioFileTypes.ContentTypeFor(extension);
            Stream contentStream = input;
            if (input.CanSeek)
            {
                input.Position = 0;
            }
            else
            {
                var buffer = new MemoryStream();
                await buffer.WriteAsync(header.AsMemory(0, read), cancellationToken);
                await input.CopyToAsync(buffer, cancellationToken);
                buffer.Position = 0;
                contentStream = buffer;
            }

            using var client = CreateClient();
            using var request = new HttpRequestMessage(HttpMethod.Post, ObjectUrl(baseUrl, objectPath));
            AddAuthHeaders(request, key);
            request.Headers.Add("x-upsert", "false");
            using var content = new StreamContent(contentStream);
            content.Headers.ContentType = new MediaTypeHeaderValue(contentType);
            content.Headers.ContentLength = file.Length;
            request.Content = content;

            try
            {
                using var response = await client.SendAsync(request, cancellationToken);
                if (!response.IsSuccessStatusCode)
                {
                    await LogFailureAsync(response, "upload", cancellationToken);
                    return PortfolioUploadResult.Error(
                        502, "STORAGE_ERROR", "Không thể lưu ảnh lúc này. Vui lòng thử lại.");
                }
            }
            catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
            {
                logger.LogWarning(exception, "Supabase Storage upload failed.");
                return PortfolioUploadResult.Error(
                    502, "STORAGE_ERROR", "Không thể lưu ảnh lúc này. Vui lòng thử lại.");
            }

            return PortfolioUploadResult.Ok(new StoredPortfolioFile(
                objectPath,
                objectPath,
                contentType,
                file.Length,
                DateTimeOffset.UtcNow));
        }
    }

    public async Task<PortfolioValidationResult> ValidateAsync(string? path, CancellationToken cancellationToken)
    {
        if (!IsConfigured(out var baseUrl, out var key))
        {
            return PortfolioValidationResult.Error(
                503, "STORAGE_NOT_CONFIGURED",
                "Chưa cấu hình Supabase Storage cho ảnh tác phẩm.");
        }

        if (!TryNormalize(path, out var normalized))
        {
            return PortfolioValidationResult.Error(
                400, "VALIDATION_ERROR", "Đường dẫn ảnh tác phẩm không hợp lệ.");
        }

        using var client = CreateClient();
        long size = 0;
        string? mediaType = null;

        using (var head = new HttpRequestMessage(HttpMethod.Head, ObjectUrl(baseUrl, normalized)))
        {
            AddAuthHeaders(head, key);
            HttpResponseMessage response;
            try
            {
                response = await client.SendAsync(head, cancellationToken);
            }
            catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
            {
                logger.LogWarning(exception, "Supabase Storage HEAD failed.");
                return PortfolioValidationResult.Error(
                    502, "STORAGE_ERROR", "Không thể kiểm tra ảnh lúc này. Vui lòng thử lại.");
            }

            using (response)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    return PortfolioValidationResult.Error(
                        400, "VALIDATION_ERROR", "Không tìm thấy ảnh tác phẩm đã tải lên.");
                }

                if (!response.IsSuccessStatusCode)
                {
                    await LogFailureAsync(response, "head", cancellationToken);
                    return PortfolioValidationResult.Error(
                        502, "STORAGE_ERROR", "Không thể kiểm tra ảnh lúc này. Vui lòng thử lại.");
                }

                size = response.Content.Headers.ContentLength ?? 0;
                mediaType = response.Content.Headers.ContentType?.MediaType;
            }
        }

        if (size > PortfolioLimits.MaxFileBytes)
        {
            return PortfolioValidationResult.Error(
                413, "UPLOAD_TOO_LARGE", "Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.");
        }

        var extension = Path.GetExtension(normalized).TrimStart('.').ToLowerInvariant();
        if (mediaType is not null &&
            !AllowedContentTypes.Contains(mediaType, StringComparer.OrdinalIgnoreCase))
        {
            return PortfolioValidationResult.Error(
                415, "UPLOAD_INVALID_TYPE", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
        }

        try
        {
            using var rangeRequest = new HttpRequestMessage(HttpMethod.Get, ObjectUrl(baseUrl, normalized));
            AddAuthHeaders(rangeRequest, key);
            rangeRequest.Headers.Range = new RangeHeaderValue(0, 11);
            using var rangeResponse = await client.SendAsync(
                rangeRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
            if (rangeResponse.IsSuccessStatusCode)
            {
                await using var stream = await rangeResponse.Content.ReadAsStreamAsync(cancellationToken);
                var header = new byte[12];
                var read = 0;
                while (read < header.Length)
                {
                    var count = await stream.ReadAsync(header.AsMemory(read, header.Length - read), cancellationToken);
                    if (count == 0)
                    {
                        break;
                    }

                    read += count;
                }

                if (PortfolioFileTypes.DetectExtension(header, read) is { } detected &&
                    !string.Equals(detected, extension, StringComparison.Ordinal))
                {
                    return PortfolioValidationResult.Error(
                        415, "UPLOAD_INVALID_TYPE", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
                }
            }
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException)
        {
            logger.LogWarning(exception, "Could not range-check a Supabase Storage object.");
        }

        return PortfolioValidationResult.Ok(new PortfolioFileInfo(
            null,
            mediaType ?? PortfolioFileTypes.ContentTypeFor(extension),
            size));
    }

    public async Task<PortfolioContent?> OpenAsync(string path, CancellationToken cancellationToken)
    {
        if (!TryNormalize(path, out var normalized))
        {
            return null;
        }

        var signed = await SignAsync(normalized, TimeSpan.FromMinutes(5), cancellationToken);
        if (signed is null)
        {
            return null;
        }

        var extension = Path.GetExtension(normalized).TrimStart('.').ToLowerInvariant();
        return new PortfolioContent(null, signed.Url, PortfolioFileTypes.ContentTypeFor(extension));
    }

    public Task<PortfolioSignedUrlResult?> CreateSignedUrlAsync(
        long imageId,
        Guid userId,
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken)
    {
        if (!TryNormalize(path, out var normalized))
        {
            return Task.FromResult<PortfolioSignedUrlResult?>(null);
        }

        return SignAsync(normalized, lifetime, cancellationToken);
    }

    private async Task<PortfolioSignedUrlResult?> SignAsync(
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken)
    {
        if (!IsConfigured(out var baseUrl, out var key))
        {
            return null;
        }

        lifetime = lifetime <= TimeSpan.Zero ? TimeSpan.FromMinutes(5) : lifetime;
        try
        {
            using var client = CreateClient();
            using var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{baseUrl}/storage/v1/object/sign/{Bucket}/{Uri.EscapeDataString(path)}");
            AddAuthHeaders(request, key);
            request.Content = JsonContent.Create(new { expiresIn = (int)Math.Ceiling(lifetime.TotalSeconds) });

            using var response = await client.SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                await LogFailureAsync(response, "sign", cancellationToken);
                return null;
            }

            using var json = await JsonDocument.ParseAsync(
                await response.Content.ReadAsStreamAsync(cancellationToken),
                cancellationToken: cancellationToken);
            var root = json.RootElement;
            var signedPath = root.TryGetProperty("signedURL", out var upper)
                ? upper.GetString()
                : root.TryGetProperty("signedUrl", out var lower) ? lower.GetString() : null;
            if (string.IsNullOrWhiteSpace(signedPath))
            {
                return null;
            }

            var url = signedPath.StartsWith("http", StringComparison.OrdinalIgnoreCase)
                ? signedPath
                : $"{baseUrl}/storage/v1{signedPath}";
            return new PortfolioSignedUrlResult(url, DateTimeOffset.UtcNow.Add(lifetime));
        }
        catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or JsonException)
        {
            logger.LogWarning(exception, "Supabase Storage signing failed.");
            return null;
        }
    }

    private HttpClient CreateClient()
    {
        var client = clients.CreateClient("supabase-storage");
        client.Timeout = TimeSpan.FromSeconds(30);
        return client;
    }

    private string Bucket => configuration["SUPABASE_STORAGE_BUCKET"] ?? "teacher-docs";

    private bool IsConfigured(out string baseUrl, out string key)
    {
        baseUrl = (configuration["SUPABASE_URL"] ?? string.Empty).TrimEnd('/');
        key = configuration["SUPABASE_SERVICE_ROLE_KEY"] ?? string.Empty;
        return baseUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase) &&
               !string.IsNullOrWhiteSpace(key);
    }

    private string ObjectUrl(string baseUrl, string path) =>
        $"{baseUrl}/storage/v1/object/{Bucket}/{Uri.EscapeDataString(path)}";

    private static void AddAuthHeaders(HttpRequestMessage request, string key)
    {
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
        request.Headers.Add("apikey", key);
    }

    private async Task LogFailureAsync(
        HttpResponseMessage response,
        string operation,
        CancellationToken cancellationToken)
    {
        var body = string.Empty;
        try
        {
            body = await response.Content.ReadAsStringAsync(cancellationToken);
            if (body.Length > 500)
            {
                body = body[..500];
            }
        }
        catch
        {
            // Best-effort logging only.
        }

        logger.LogWarning(
            "Supabase Storage {Operation} failed with {StatusCode}: {Body}",
            operation,
            (int)response.StatusCode,
            body);
    }

    private static async Task<int> ReadHeaderAsync(
        Stream stream,
        byte[] header,
        CancellationToken cancellationToken)
    {
        var read = 0;
        while (read < header.Length)
        {
            var count = await stream.ReadAsync(header.AsMemory(read, header.Length - read), cancellationToken);
            if (count == 0)
            {
                break;
            }

            read += count;
        }

        return read;
    }

    private static bool TryNormalize(string? path, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(path))
        {
            return false;
        }

        var value = path.Trim().Replace('\\', '/');
        if (value.Length > 500 ||
            value.Contains("..", StringComparison.Ordinal) ||
            value.StartsWith('/') ||
            !ObjectPathRegex().IsMatch(value))
        {
            return false;
        }

        normalized = value.ToLowerInvariant();
        return true;
    }

    [GeneratedRegex("^[0-9a-f]{32}\\.(jpg|png|webp)$", RegexOptions.CultureInvariant | RegexOptions.IgnoreCase)]
    private static partial Regex ObjectPathRegex();
}
