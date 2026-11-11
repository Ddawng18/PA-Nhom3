using System.Text.RegularExpressions;

namespace Linea.Api.Services;

public sealed partial class LocalPortfolioStorage(
    IWebHostEnvironment environment,
    IConfiguration configuration,
    SignedUrlService signedUrls) : IPortfolioStorage
{
    private const string RelativePrefix = "teacher-docs/";

    public async Task<PortfolioUploadResult> SaveAsync(IFormFile? file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length <= 0)
        {
            return PortfolioUploadResult.Error(
                400,
                "VALIDATION_ERROR",
                "Vui lòng chọn một ảnh tác phẩm.");
        }

        if (file.Length > PortfolioLimits.MaxFileBytes)
        {
            return PortfolioUploadResult.Error(
                413,
                "UPLOAD_TOO_LARGE",
                "Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn.");
        }

        var header = new byte[12];
        await using (var input = file.OpenReadStream())
        {
            var read = 0;
            while (read < header.Length)
            {
                var count = await input.ReadAsync(
                    header.AsMemory(read, header.Length - read),
                    cancellationToken);
                if (count == 0)
                {
                    break;
                }

                read += count;
            }

            var extension = PortfolioFileTypes.DetectExtension(header, read);
            if (extension is null)
            {
                return PortfolioUploadResult.Error(
                    415,
                    "UPLOAD_INVALID_TYPE",
                    "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP.");
            }

            var storedName = $"{Guid.NewGuid():N}.{extension}";
            var root = ResolveRoot();
            Directory.CreateDirectory(root);
            var fullPath = Path.Combine(root, storedName);
            await using var output = new FileStream(
                fullPath,
                FileMode.CreateNew,
                FileAccess.Write,
                FileShare.None,
                81920,
                useAsync: true);
            await output.WriteAsync(header.AsMemory(0, read), cancellationToken);
            await input.CopyToAsync(output, cancellationToken);

            return PortfolioUploadResult.Ok(new StoredPortfolioFile(
                RelativePrefix + storedName,
                storedName,
                PortfolioFileTypes.ContentTypeFor(extension),
                file.Length,
                DateTimeOffset.UtcNow));
        }
    }

    public Task<PortfolioValidationResult> ValidateAsync(string? path, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryNormalize(path, out var normalized))
        {
            return Task.FromResult(PortfolioValidationResult.Error(
                400, "VALIDATION_ERROR", "Đường dẫn ảnh tác phẩm không hợp lệ."));
        }

        var fullPath = Resolve(normalized);
        if (fullPath is null || !File.Exists(fullPath))
        {
            return Task.FromResult(PortfolioValidationResult.Error(
                400, "VALIDATION_ERROR", "Không tìm thấy ảnh tác phẩm đã tải lên."));
        }

        var info = new FileInfo(fullPath);
        if (info.Length <= 0)
        {
            return Task.FromResult(PortfolioValidationResult.Error(
                400, "VALIDATION_ERROR", "Ảnh tác phẩm không hợp lệ."));
        }

        if (info.Length > PortfolioLimits.MaxFileBytes)
        {
            return Task.FromResult(PortfolioValidationResult.Error(
                413, "UPLOAD_TOO_LARGE", "Ảnh vượt quá 10 MB. Vui lòng chọn ảnh nhỏ hơn."));
        }

        var extension = Path.GetExtension(fullPath).TrimStart('.').ToLowerInvariant();
        using var stream = File.OpenRead(fullPath);
        var header = new byte[12];
        var read = stream.ReadAtLeast(header, header.Length, throwOnEndOfStream: false);
        if (!string.Equals(PortfolioFileTypes.DetectExtension(header, read), extension, StringComparison.Ordinal))
        {
            return Task.FromResult(PortfolioValidationResult.Error(
                415, "UPLOAD_INVALID_TYPE", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP."));
        }

        return Task.FromResult(PortfolioValidationResult.Ok(new PortfolioFileInfo(
            fullPath,
            PortfolioFileTypes.ContentTypeFor(extension),
            info.Length)));
    }

    public Task<PortfolioContent?> OpenAsync(string path, CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryNormalize(path, out var normalized))
        {
            return Task.FromResult<PortfolioContent?>(null);
        }

        var fullPath = Resolve(normalized);
        if (fullPath is null || !File.Exists(fullPath))
        {
            return Task.FromResult<PortfolioContent?>(null);
        }

        var extension = Path.GetExtension(fullPath).TrimStart('.').ToLowerInvariant();
        return Task.FromResult<PortfolioContent?>(new PortfolioContent(
            fullPath,
            null,
            PortfolioFileTypes.ContentTypeFor(extension)));
    }

    public Task<PortfolioSignedUrlResult?> CreateSignedUrlAsync(
        long imageId,
        Guid userId,
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (!TryNormalize(path, out _))
        {
            return Task.FromResult<PortfolioSignedUrlResult?>(null);
        }

        var expiresAt = DateTimeOffset.UtcNow.Add(lifetime);
        var token = signedUrls.CreateToken(imageId, userId, expiresAt);
        return Task.FromResult<PortfolioSignedUrlResult?>(new PortfolioSignedUrlResult(
            $"/api/teacher-docs/{imageId}?token={Uri.EscapeDataString(token)}",
            expiresAt));
    }

    private string? Resolve(string normalizedRelativePath)
    {
        var fileName = normalizedRelativePath[RelativePrefix.Length..];
        var root = Path.GetFullPath(ResolveRoot());
        var fullPath = Path.GetFullPath(Path.Combine(root, fileName));
        var rootPrefix = root.EndsWith(Path.DirectorySeparatorChar)
            ? root
            : root + Path.DirectorySeparatorChar;
        return fullPath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase) ? fullPath : null;
    }

    private string ResolveRoot() =>
        configuration["TEACHER_DOCS_PATH"] is { Length: > 0 } configuredPath
            ? Path.GetFullPath(configuredPath)
            : Path.Combine(environment.ContentRootPath, "App_Data", "teacher-docs");

    private static bool TryNormalize(string? relativePath, out string normalized)
    {
        normalized = string.Empty;
        if (string.IsNullOrWhiteSpace(relativePath))
        {
            return false;
        }

        var value = relativePath.Trim().Replace('\\', '/');
        if (value.Length > 500 ||
            value.Contains("..", StringComparison.Ordinal) ||
            value.StartsWith('/') ||
            !value.StartsWith(RelativePrefix, StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var fileName = value[RelativePrefix.Length..];
        if (!FileNameRegex().IsMatch(fileName))
        {
            return false;
        }

        normalized = RelativePrefix + fileName.ToLowerInvariant();
        return true;
    }

    [GeneratedRegex("^[0-9a-f]{32}\\.(jpg|png|webp)$", RegexOptions.CultureInvariant)]
    private static partial Regex FileNameRegex();
}
