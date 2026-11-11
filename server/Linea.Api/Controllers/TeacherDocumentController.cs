using Linea.Api.Data;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/teacher-docs")]
[AllowAnonymous]
public sealed class TeacherDocumentController(
    AppDbContext db,
    IPortfolioStorage portfolioStorage,
    SignedUrlService signedUrls) : ControllerBase
{
    [HttpGet("{imageId:long}")]
    public async Task<IActionResult> Download(
        long imageId,
        [FromQuery] string? token,
        CancellationToken cancellationToken)
    {
        if (!signedUrls.TryValidate(token, imageId, out var userId, out _))
        {
            return Problem(
                statusCode: StatusCodes.Status401Unauthorized,
                title: "Liên kết ảnh không hợp lệ",
                detail: "Liên kết ảnh không hợp lệ hoặc đã hết hạn.",
                extensions: new Dictionary<string, object?> { ["code"] = "SIGNED_URL_INVALID" });
        }

        var relativePath = await db.PortfolioImages
            .AsNoTracking()
            .Where(image => image.Id == imageId && image.Profile!.UserId == userId)
            .Select(image => image.FilePath)
            .SingleOrDefaultAsync(cancellationToken);
        if (relativePath is null)
        {
            return NotFound();
        }

        var content = await portfolioStorage.OpenAsync(relativePath, cancellationToken);
        if (content is null)
        {
            return NotFound();
        }

        if (content.LocalPath is not null)
        {
            return PhysicalFile(content.LocalPath, content.ContentType);
        }

        return content.RedirectUrl is not null ? Redirect(content.RedirectUrl) : NotFound();
    }
}
