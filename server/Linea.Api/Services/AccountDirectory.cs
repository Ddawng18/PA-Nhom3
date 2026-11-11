using System.Data;
using Linea.Api.Data;
using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Linea.Api.Services;

public sealed record AccountInfo(string? DisplayName, string? Email);

public sealed class AccountDirectory(
    AppDbContext db,
    ILogger<AccountDirectory> logger)
{
    public async Task<Dictionary<Guid, AccountInfo>> GetAccountsAsync(
        IReadOnlyCollection<Guid> userIds,
        CancellationToken cancellationToken)
    {
        var result = new Dictionary<Guid, AccountInfo>();
        if (userIds.Count == 0)
        {
            return result;
        }

        if (db.Database.IsNpgsql())
        {
            try
            {
                var connection = db.Database.GetDbConnection();
                var wasClosed = connection.State != ConnectionState.Open;
                if (wasClosed)
                {
                    await connection.OpenAsync(cancellationToken);
                }

                try
                {
                    foreach (var userId in userIds.Distinct())
                    {
                        try
                        {
                            await using var command = connection.CreateCommand();
                            command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
                            command.CommandText =
                                """
                                select u.email, n.display_name
                                from auth.users u
                                left join public.nguoi_dung n on n.id = u.id
                                where u.id = @id
                                """;
                            var parameter = command.CreateParameter();
                            parameter.ParameterName = "id";
                            parameter.Value = userId;
                            command.Parameters.Add(parameter);
                            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                            if (await reader.ReadAsync(cancellationToken))
                            {
                                var email = reader.IsDBNull(0) ? null : reader.GetString(0);
                                var displayName = reader.IsDBNull(1) ? null : reader.GetString(1);
                                result[userId] = new AccountInfo(displayName, email);
                            }
                        }
                        catch (Exception exception) when (exception is not OperationCanceledException)
                        {
                            logger.LogWarning(
                                exception,
                                "Could not read the email for account {UserId}; falling back to display name only.",
                                userId);

                            try
                            {
                                await using var fallback = connection.CreateCommand();
                                fallback.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
                                fallback.CommandText = "select display_name from public.nguoi_dung where id = @id";
                                var fallbackParameter = fallback.CreateParameter();
                                fallbackParameter.ParameterName = "id";
                                fallbackParameter.Value = userId;
                                fallback.Parameters.Add(fallbackParameter);
                                var value = await fallback.ExecuteScalarAsync(cancellationToken);
                                result[userId] = new AccountInfo(value as string, null);
                            }
                            catch (Exception fallbackException) when (fallbackException is not OperationCanceledException)
                            {
                                logger.LogWarning(
                                    fallbackException,
                                    "Could not read the display name for account {UserId}.",
                                    userId);
                            }
                        }
                    }
                }
                finally
                {
                    if (wasClosed)
                    {
                        await connection.CloseAsync();
                    }
                }
            }
            catch (Exception exception) when (exception is not OperationCanceledException)
            {
                logger.LogWarning(exception, "Could not read account display names from nguoi_dung.");
            }

            return result;
        }

        var users = await db.Users
            .AsNoTracking()
            .Where(user => userIds.Contains(user.Id))
            .Select(user => new { user.Id, user.DisplayName, user.Email })
            .ToListAsync(cancellationToken);
        foreach (var user in users)
        {
            result[user.Id] = new AccountInfo(user.DisplayName, user.Email);
        }

        return result;
    }

    public async Task<bool> SetRoleAsync(Guid userId, UserRole role, CancellationToken cancellationToken)
    {
        if (db.Database.IsNpgsql())
        {
            var connection = db.Database.GetDbConnection();
            var wasClosed = connection.State != ConnectionState.Open;
            if (wasClosed)
            {
                await connection.OpenAsync(cancellationToken);
            }

            try
            {
                await using var command = connection.CreateCommand();
                command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
                command.CommandText = "update public.nguoi_dung set role = @role::public.app_role where id = @id";
                var roleParameter = command.CreateParameter();
                roleParameter.ParameterName = "role";
                roleParameter.Value = role.ToString().ToLowerInvariant();
                command.Parameters.Add(roleParameter);
                var idParameter = command.CreateParameter();
                idParameter.ParameterName = "id";
                idParameter.Value = userId;
                command.Parameters.Add(idParameter);
                return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
            }
            finally
            {
                if (wasClosed)
                {
                    await connection.CloseAsync();
                }
            }
        }

        var user = await db.Users.SingleOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.Role = role;
        user.UpdatedAt = DateTimeOffset.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
        return true;
    }
}
