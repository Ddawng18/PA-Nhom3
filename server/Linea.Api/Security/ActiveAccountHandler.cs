using System.Data;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Npgsql;

namespace Linea.Api.Security;

public sealed record ActiveAccountStatus(bool Available, bool Found, bool IsLocked, string? Role);

// D09/S6-08: account state is checked from the database on every authenticated
// request, so locking an account takes effect on the next request even when the
// client still holds an old Supabase/JWT token.
public sealed class ActiveAccountHandler(AppDbContext db, ILogger<ActiveAccountHandler> logger)
{
    public async Task<ActiveAccountStatus> CheckAsync(Guid userId, CancellationToken cancellationToken)
    {
        if (!db.Database.IsNpgsql())
        {
            var user = await db.Users.AsNoTracking()
                .SingleOrDefaultAsync(candidate => candidate.Id == userId, cancellationToken);
            return user is null
                ? new ActiveAccountStatus(true, false, false, null)
                : new ActiveAccountStatus(true, true, user.IsLocked, user.Role.ToString().ToLowerInvariant());
        }

        var connection = db.Database.GetDbConnection();
        var wasClosed = connection.State != ConnectionState.Open;
        try
        {
            if (wasClosed) await connection.OpenAsync(cancellationToken);

            await using var command = connection.CreateCommand();
            command.Transaction = db.Database.CurrentTransaction?.GetDbTransaction();
            command.CommandText =
                """
                select role::text,
                       coalesce((to_jsonb(n) ->> 'is_locked')::boolean, false)
                from public.nguoi_dung n
                where n.id = @id
                """;
            var parameter = command.CreateParameter();
            parameter.ParameterName = "id";
            parameter.DbType = DbType.Guid;
            parameter.Value = userId;
            command.Parameters.Add(parameter);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
            {
                return new ActiveAccountStatus(true, false, false, null);
            }

            var role = reader.IsDBNull(0) ? null : reader.GetString(0);
            var locked = !reader.IsDBNull(1) && reader.GetBoolean(1);
            return new ActiveAccountStatus(true, true, locked, role);
        }
        catch (PostgresException exception) when (exception.SqlState is PostgresErrorCodes.UndefinedTable)
        {
            logger.LogError("Account status table is missing; run the reviewed Supabase migration.");
            return new ActiveAccountStatus(false, false, false, null);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            logger.LogWarning(exception, "Could not read the current account state; leaving token validation to the identity provider.");
            return new ActiveAccountStatus(false, false, false, null);
        }
        finally
        {
            if (wasClosed) await connection.CloseAsync();
        }
    }
}
