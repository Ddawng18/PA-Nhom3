using Linea.Api.Models;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Data;

public static class DbSeeder
{
    public static async Task SeedAdminAsync(
        IServiceProvider services,
        IConfiguration configuration,
        ILogger logger,
        CancellationToken cancellationToken = default)
    {
        var email = configuration["SEED_ADMIN_EMAIL"];
        var password = configuration["SEED_ADMIN_PASSWORD"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            return;
        }

        var db = services.GetRequiredService<AppDbContext>();
        var hasher = services.GetRequiredService<IPasswordHasher>();
        var normalizedEmail = EmailNormalizer.Normalize(email);

        if (await db.Users.AnyAsync(user => user.Email == normalizedEmail, cancellationToken))
        {
            logger.LogInformation("Seed admin skipped because the account already exists.");
            return;
        }

        db.Users.Add(new User
        {
            Email = normalizedEmail,
            DisplayName = "Administrator",
            PasswordHash = hasher.Hash(password),
            Role = UserRole.Admin
        });

        await db.SaveChangesAsync(cancellationToken);
        logger.LogInformation("Seeded the initial administrator account.");
        logger.LogInformation("Remember to unset SEED_ADMIN_PASSWORD after the first run.");
    }
}
