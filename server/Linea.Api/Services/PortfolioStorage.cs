namespace Linea.Api.Services;

public static class PortfolioLimits
{
    public const long MaxFileBytes = 10 * 1024 * 1024;
    public const long MaxTotalBytes = 30 * 1024 * 1024;
    public const int MaxFiles = 5;
}

public sealed record PortfolioFileInfo(string? FullPath, string ContentType, long Size);

public sealed record StoredPortfolioFile(
    string FilePath,
    string FileName,
    string ContentType,
    long Size,
    DateTimeOffset UploadedAt);

public sealed record PortfolioUploadResult(
    StoredPortfolioFile? File,
    int StatusCode,
    string? Code,
    string? Message)
{
    public bool Success => File is not null;

    public static PortfolioUploadResult Ok(StoredPortfolioFile file) => new(file, 201, null, null);

    public static PortfolioUploadResult Error(int statusCode, string code, string message) =>
        new(null, statusCode, code, message);
}

public sealed record PortfolioValidationResult(
    PortfolioFileInfo? File,
    int StatusCode,
    string? Code,
    string? Message)
{
    public bool Success => File is not null && StatusCode < 400;

    public static PortfolioValidationResult Ok(PortfolioFileInfo file) => new(file, 200, null, null);

    public static PortfolioValidationResult Error(int statusCode, string code, string message) =>
        new(null, statusCode, code, message);
}

public sealed record PortfolioContent(
    string? LocalPath,
    string? RedirectUrl,
    string ContentType);

public sealed record PortfolioSignedUrlResult(string Url, DateTimeOffset ExpiresAt);

public interface IPortfolioStorage
{
    Task<PortfolioUploadResult> SaveAsync(IFormFile? file, CancellationToken cancellationToken);

    Task<PortfolioValidationResult> ValidateAsync(string? path, CancellationToken cancellationToken);

    Task<PortfolioContent?> OpenAsync(string path, CancellationToken cancellationToken);

    Task<PortfolioSignedUrlResult?> CreateSignedUrlAsync(
        long imageId,
        Guid userId,
        string path,
        TimeSpan lifetime,
        CancellationToken cancellationToken);
}

public static class PortfolioFileTypes
{
    public static string? DetectExtension(ReadOnlySpan<byte> header, int count)
    {
        if (count >= 3 &&
            header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF)
        {
            return "jpg";
        }

        if (count >= 8 &&
            header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
            header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A)
        {
            return "png";
        }

        if (count >= 12 &&
            header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
            header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50)
        {
            return "webp";
        }

        return null;
    }

    public static string ContentTypeFor(string extension) => extension switch
    {
        "jpg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        _ => "application/octet-stream"
    };
}
