using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace Linea.Api.Security;

internal sealed class ApiExceptionHandler(ILogger<ApiExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext httpContext,
        Exception exception,
        CancellationToken cancellationToken)
    {
        if (exception is not (ArgumentException or KeyNotFoundException))
        {
            return false;
        }

        logger.LogWarning(exception, "Handled API exception for {Path}", httpContext.Request.Path);
        var status = exception switch
        {
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status404NotFound ? "Resource not found" : "Request could not be completed",
            Detail = exception.Message,
            Instance = httpContext.Request.Path
        }, cancellationToken);
        return true;
    }
}
