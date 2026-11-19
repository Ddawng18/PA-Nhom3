using System.Data;
using System.Data.Common;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;

namespace Linea.Api.Services;

internal static class PostgresAdminHelpers
{
    public static async Task<(DbConnection Connection, bool WasClosed)> OpenAsync(
        AppDbContext db, CancellationToken cancellationToken)
    {
        var connection = db.Database.GetDbConnection();
        var wasClosed = connection.State != ConnectionState.Open;
        if (wasClosed) await connection.OpenAsync(cancellationToken);
        return (connection, wasClosed);
    }

    public static async Task CloseAsync(DbConnection connection, bool wasClosed)
    {
        if (wasClosed) await connection.CloseAsync();
    }

    public static DbCommand CreateCommand(
        DbConnection connection,
        string sql,
        IDbContextTransaction? transaction = null)
    {
        var command = connection.CreateCommand();
        command.CommandText = sql;
        command.Transaction = transaction?.GetDbTransaction();
        return command;
    }

    public static void AddParameter(DbCommand command, string name, object? value, DbType type)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.DbType = type;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    public static DateTimeOffset? ReadTimestamp(DbDataReader reader, int ordinal)
    {
        if (reader.IsDBNull(ordinal)) return null;
        var value = reader.GetDateTime(ordinal);
        return new DateTimeOffset(DateTime.SpecifyKind(value, DateTimeKind.Utc));
    }

    public static async Task<long> ScalarLongAsync(
        DbConnection connection,
        string sql,
        Action<DbCommand>? parameters,
        IDbContextTransaction? transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, sql, transaction);
        parameters?.Invoke(command);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is null or DBNull ? 0 : Convert.ToInt64(result);
    }

    public static async Task<int> ExecuteAsync(
        DbConnection connection,
        string sql,
        Action<DbCommand>? parameters,
        IDbContextTransaction? transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection, sql, transaction);
        parameters?.Invoke(command);
        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    public static async Task<bool> ColumnExistsAsync(
        DbConnection connection,
        string table,
        string column,
        IDbContextTransaction? transaction,
        CancellationToken cancellationToken)
    {
        await using var command = CreateCommand(connection,
            """
            select 1
            from information_schema.columns
            where table_schema = 'public' and table_name = @table and column_name = @column
            limit 1
            """, transaction);
        AddParameter(command, "table", table, DbType.String);
        AddParameter(command, "column", column, DbType.String);
        var result = await command.ExecuteScalarAsync(cancellationToken);
        return result is not null and not DBNull;
    }
}
