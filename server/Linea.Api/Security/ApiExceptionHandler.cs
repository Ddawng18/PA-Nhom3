using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Npgsql;

namespace Linea.Api.Security;

internal sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        var databaseError = exception as PostgresException ?? exception.InnerException as PostgresException;
        var conflict = databaseError?.SqlState is PostgresErrorCodes.SerializationFailure or PostgresErrorCodes.DeadlockDetected;
        var storageUnavailable = exception is StorageConfigurationException;
        var upstreamFailure = exception is HttpRequestException ||
            (exception is OperationCanceledException && !httpContext.RequestAborted.IsCancellationRequested);
        if (!conflict && !storageUnavailable && !upstreamFailure && exception is not (ArgumentException or KeyNotFoundException))
        {
            return false;
        }

        logger.LogWarning(exception, "Handled API exception for {Path}", httpContext.Request.Path);
        var status = conflict ? StatusCodes.Status409Conflict : storageUnavailable ? StatusCodes.Status503ServiceUnavailable : upstreamFailure ? StatusCodes.Status502BadGateway : exception switch
        {
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status404NotFound ? "Resource not found" : "Request could not be completed",
            Detail = conflict ? "Dữ liệu đã thay đổi. Tải lại trước khi lưu." : upstreamFailure ? "Dịch vụ đang gián đoạn. Vui lòng thử lại." : exception.Message,
            Instance = httpContext.Request.Path,
            Extensions = { ["code"] = conflict ? "EDITOR_VERSION_CONFLICT" : storageUnavailable ? "STORAGE_NOT_CONFIGURED" : upstreamFailure ? "UPSTREAM_ERROR" : "REQUEST_ERROR",
                ["traceId"] = httpContext.TraceIdentifier }
        }, cancellationToken);
        return true;
    }
}

internal sealed class StorageConfigurationException() : Exception("Chưa cấu hình lưu trữ. Vui lòng liên hệ quản trị viên.");
