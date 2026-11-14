using Linea.Api.Data;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Controllers;

[ApiController]
[Route("api/admin/orders")]
[Authorize(Policy = AuthPolicies.AdminOnly)]
public sealed class AdminOrdersController(
    AppDbContext db,
    AdminOrderService orders) : ControllerBase
{
    private static readonly IReadOnlySet<string> Statuses =
        new HashSet<string>(StringComparer.Ordinal) { "PENDING", "SUCCEEDED", "FAILED", "CANCELLED" };

    [HttpGet]
    public async Task<IActionResult> List(
        [FromQuery] string? status,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        if (!db.Database.IsNpgsql()) return SchemaRequired();
        if (page < 1)
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR", "Trang phải bắt đầu từ 1.");
        pageSize = Math.Clamp(pageSize, 1, 100);
        var statusFilter = string.IsNullOrWhiteSpace(status) ? null : status.Trim().ToUpperInvariant();
        if (statusFilter is not null && !Statuses.Contains(statusFilter))
            return Failure(StatusCodes.Status400BadRequest, "VALIDATION_ERROR",
                "Trạng thái phải là PENDING, SUCCEEDED, FAILED hoặc CANCELLED.");

        try
        {
            return Ok(await orders.ListAsync(statusFilter, page, pageSize, cancellationToken));
        }
        catch (Exception exception)
        {
            return Map(exception);
        }
    }

    [HttpGet("{id:long}")]
    public async Task<IActionResult> Get(long id, CancellationToken cancellationToken)
    {
        if (!db.Database.IsNpgsql()) return SchemaRequired();
        try
        {
            return Ok(await orders.GetAsync(id, cancellationToken));
        }
        catch (Exception exception)
        {
            return Map(exception);
        }
    }

    private IActionResult Map(Exception exception) => exception switch
    {
        AdminSchemaNotReadyException => Failure(
            StatusCodes.Status503ServiceUnavailable, "SCHEMA_NOT_READY", exception.Message),
        KeyNotFoundException => Failure(
            StatusCodes.Status404NotFound, "NOT_FOUND", exception.Message),
        _ => throw exception
    };

    private IActionResult SchemaRequired() => Failure(
        StatusCodes.Status503ServiceUnavailable,
        "SCHEMA_NOT_READY",
        "Đơn DEMO yêu cầu kết nối SUPABASE_DB_URL và migration Sprint 6.");

    private ObjectResult Failure(int statusCode, string code, string detail) =>
        Problem(
            statusCode: statusCode,
            title: "Không thể xử lý yêu cầu",
            detail: detail,
            extensions: new Dictionary<string, object?> { ["code"] = code });
}
