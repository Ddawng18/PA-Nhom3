using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Services;

public sealed class LifecycleEmailService(
    AppDbContext db,
    AccountDirectory accounts,
    IEmailSender email,
    ILogger<LifecycleEmailService> logger)
{
    public Task SendWelcomeAsync(Guid userId, CancellationToken cancellationToken) =>
        SendOnceAsync(userId, "welcome", "",
            "Chào mừng bạn đến LINEA",
            "LINEA đã sẵn sàng. Hãy chọn một lộ trình ngắn, hoàn thành bài đầu tiên và lưu tiến độ của bạn trong tài khoản.",
            cancellationToken);

    public Task SendFirstLessonAsync(Guid userId, long lessonId, string lessonTitle, CancellationToken cancellationToken) =>
        SendOnceAsync(userId, "first-lesson", lessonId.ToString(),
            "Bài học đầu tiên đã hoàn thành",
            $"Bạn vừa hoàn thành “{lessonTitle}”. Một bài nhỏ mỗi ngày là cách giữ nhịp luyện vẽ bền vững.",
            cancellationToken);

    public Task SendFeedbackAsync(Guid userId, long submissionId, decimal score, CancellationToken cancellationToken) =>
        SendOnceAsync(userId, "feedback", submissionId.ToString(),
            "Bài tập của bạn đã được chấm",
            $"Bài tập đã có điểm {score:0.##}/10 và nhận xét từ giảng viên. Mở LINEA để xem chi tiết và điều chỉnh bài tiếp theo.",
            cancellationToken);

    private async Task SendOnceAsync(
        Guid userId,
        string kind,
        string objectId,
        string subject,
        string body,
        CancellationToken cancellationToken)
    {
        if (!db.Database.IsNpgsql()) return;
        try
        {
            var inserted = await db.Database.ExecuteSqlInterpolatedAsync($"""
                insert into public.lifecycle_emails(user_id, kind, object_id)
                values ({userId}, {kind}, {objectId})
                on conflict do nothing
                """, cancellationToken);
            if (inserted == 0) return;

            var map = await accounts.GetAccountsAsync([userId], cancellationToken);
            map.TryGetValue(userId, out var account);
            await email.SendAsync(account?.Email, subject, body, cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not send {Kind} lifecycle email to {UserId}.", kind, userId);
        }
    }
}
