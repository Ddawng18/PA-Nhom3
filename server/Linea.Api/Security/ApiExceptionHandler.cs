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
        var duplicateTitle = databaseError?.SqlState == PostgresErrorCodes.UniqueViolation ? databaseError.ConstraintName switch
        {
            "uq_khoa_hoc_teacher_title" => (Code: "DUPLICATE_COURSE_TITLE", Message: "Bạn đã có khóa học dùng tên này. Vui lòng chọn tên khác."),
            "uq_chuong_course_title" => (Code: "DUPLICATE_CHAPTER_TITLE", Message: "Tên chương đã tồn tại trong khóa học. Vui lòng chọn tên khác."),
            "uq_bai_hoc_chapter_title" => (Code: "DUPLICATE_LESSON_TITLE", Message: "Tên bài học đã tồn tại trong chương. Vui lòng chọn tên khác."),
            _ => (Code: "", Message: ""),
        } : (Code: "", Message: "");
        var storageUnavailable = exception is StorageConfigurationException;
        var upstreamFailure = exception is HttpRequestException ||
            (exception is OperationCanceledException && !httpContext.RequestAborted.IsCancellationRequested);
        if (!conflict && duplicateTitle.Code == "" && !storageUnavailable && !upstreamFailure && exception is not (ArgumentException or KeyNotFoundException))
        {
            return false;
        }

        logger.LogWarning(exception, "Handled API exception for {Path}", httpContext.Request.Path);
        var status = conflict || duplicateTitle.Code != "" ? StatusCodes.Status409Conflict : storageUnavailable ? StatusCodes.Status503ServiceUnavailable : upstreamFailure ? StatusCodes.Status502BadGateway : exception switch
        {
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status400BadRequest
        };

        httpContext.Response.StatusCode = status;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = status,
            Title = status == StatusCodes.Status404NotFound ? "Resource not found" : "Request could not be completed",
            Detail = duplicateTitle.Code != "" ? duplicateTitle.Message : conflict ? "Dữ liệu đã thay đổi. Tải lại trước khi lưu." : upstreamFailure ? "Dịch vụ đang gián đoạn. Vui lòng thử lại." : exception.Message,
            Instance = httpContext.Request.Path,
            Extensions = { ["code"] = duplicateTitle.Code != "" ? duplicateTitle.Code : conflict ? "EDITOR_VERSION_CONFLICT" : storageUnavailable ? "STORAGE_NOT_CONFIGURED" : upstreamFailure ? "UPSTREAM_ERROR" : "REQUEST_ERROR",
                ["traceId"] = httpContext.TraceIdentifier }
        }, cancellationToken);
        return true;
    }
}

internal sealed class StorageConfigurationException() : Exception("Chưa cấu hình lưu trữ. Vui lòng liên hệ quản trị viên.");
