using System.Net;
using System.Net.Mail;

namespace Linea.Api.Services;

public interface IEmailSender
{
    Task SendAsync(string? to, string subject, string body, CancellationToken cancellationToken);
}

public sealed class SmtpEmailSender(
    IConfiguration configuration,
    ILogger<SmtpEmailSender> logger) : IEmailSender
{
    public async Task SendAsync(string? to, string subject, string body, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(to))
        {
            logger.LogInformation("Email skipped because the recipient has no address.");
            return;
        }

        try
        {
            var outboxPath = configuration["EMAIL_OUTBOX_PATH"];
            if (!string.IsNullOrWhiteSpace(outboxPath))
            {
                Directory.CreateDirectory(outboxPath);
                var file = Path.Combine(
                    outboxPath,
                    $"{DateTimeOffset.UtcNow:yyyyMMddHHmmssfff}-{Guid.NewGuid():N}.txt");
                await File.WriteAllTextAsync(
                    file,
                    $"To: {to}{Environment.NewLine}Subject: {subject}{Environment.NewLine}{Environment.NewLine}{body}",
                    cancellationToken);
                logger.LogInformation("Email written to the development outbox for {Recipient}.", to);
                return;
            }

            var host = configuration["SMTP_HOST"];
            if (string.IsNullOrWhiteSpace(host))
            {
                logger.LogInformation("SMTP is not configured; email to {Recipient} was skipped.", to);
                return;
            }

            var port = int.TryParse(configuration["SMTP_PORT"], out var parsedPort) ? parsedPort : 587;
            var from = configuration["SMTP_FROM"]
                       ?? configuration["SMTP_USER"]
                       ?? "no-reply@linea.local";
            var enableSsl = !bool.TryParse(configuration["SMTP_ENABLE_SSL"], out var parsedSsl) || parsedSsl;

            using var message = new MailMessage(from, to, subject, body) { IsBodyHtml = false };
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = enableSsl,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Timeout = 15000
            };

            var user = configuration["SMTP_USER"];
            var password = configuration["SMTP_PASSWORD"];
            if (!string.IsNullOrWhiteSpace(user) && !string.IsNullOrWhiteSpace(password))
            {
                client.Credentials = new NetworkCredential(user, password);
            }

            await client.SendMailAsync(message, cancellationToken);
            logger.LogInformation("Email sent to {Recipient}.", to);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not send email to {Recipient}.", to);
        }
    }
}
