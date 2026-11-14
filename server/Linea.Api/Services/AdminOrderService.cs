using System.Data;
using System.Data.Common;
using Linea.Api.Contracts;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Linea.Api.Services;

// S6-09 read side owned by Phú. This endpoint only lists DEMO orders created by
// the order service; it never confirms payments or writes enrollment state.
public sealed class AdminOrderService(AppDbContext db, ILogger<AdminOrderService> logger)
{
    public bool IsSupported => db.Database.IsNpgsql();

    public async Task<AdminOrderPage> ListAsync(
        string? status,
        int page,
        int pageSize,
        CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            const string where = """
                from public.don_hang_demo o
                left join auth.users u on u.id = o.ma_nguoi_dung
                left join public.nguoi_dung n on n.id = o.ma_nguoi_dung
                left join public.khoa_hoc k on k.ma_khoa_hoc = o.ma_khoa_hoc
                where (@status is null or o.trang_thai = @status)
                """;
            var total = await PostgresAdminHelpers.ScalarLongAsync(
                connection, $"select count(*) {where}", command =>
                {
                    PostgresAdminHelpers.AddParameter(command, "status", status, DbType.String);
                }, null, cancellationToken);

            var items = new List<AdminOrderItem>();
            await using var command = PostgresAdminHelpers.CreateCommand(connection, $"""
                select o.ma_don_hang,
                       o.ma_nguoi_dung,
                       u.email,
                       n.display_name,
                       o.ma_khoa_hoc,
                       k.tieu_de,
                       o.gia_vnd,
                       o.tien_te,
                       o.che_do,
                       o.trang_thai,
                       o.ngay_tao,
                       o.ngay_xac_nhan
                {where}
                order by o.ngay_tao desc, o.ma_don_hang desc
                offset @offset limit @limit
                """);
            PostgresAdminHelpers.AddParameter(command, "status", status, DbType.String);
            PostgresAdminHelpers.AddParameter(command, "offset", (page - 1) * pageSize, DbType.Int32);
            PostgresAdminHelpers.AddParameter(command, "limit", pageSize, DbType.Int32);

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                items.Add(ReadItem(reader));
            }

            return new AdminOrderPage(items, page, pageSize, (int)total);
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    public async Task<AdminOrderDetail> GetAsync(long id, CancellationToken cancellationToken)
    {
        EnsureSupported();
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            await using var command = PostgresAdminHelpers.CreateCommand(connection, """
                select o.ma_don_hang,
                       o.ma_nguoi_dung,
                       u.email,
                       n.display_name,
                       o.ma_khoa_hoc,
                       k.tieu_de,
                       o.gia_vnd,
                       o.tien_te,
                       o.che_do,
                       o.trang_thai,
                       o.idempotency_key,
                       o.ngay_tao,
                       o.ngay_xac_nhan
                from public.don_hang_demo o
                left join auth.users u on u.id = o.ma_nguoi_dung
                left join public.nguoi_dung n on n.id = o.ma_nguoi_dung
                left join public.khoa_hoc k on k.ma_khoa_hoc = o.ma_khoa_hoc
                where o.ma_don_hang = @id
                """);
            PostgresAdminHelpers.AddParameter(command, "id", id, DbType.Int64);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                throw new KeyNotFoundException("Không tìm thấy đơn DEMO.");

            return new AdminOrderDetail(
                reader.GetInt64(0),
                reader.GetGuid(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetInt64(4),
                reader.IsDBNull(5) ? null : reader.GetString(5),
                reader.GetInt64(6),
                reader.GetString(7),
                reader.GetString(8),
                reader.GetString(9),
                reader.IsDBNull(10) ? null : reader.GetString(10),
                PostgresAdminHelpers.ReadTimestamp(reader, 11) ?? DateTimeOffset.UtcNow,
                PostgresAdminHelpers.ReadTimestamp(reader, 12));
        }
        catch (PostgresException exception) when (IsSchemaError(exception))
        {
            throw SchemaNotReady(exception);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    private static AdminOrderItem ReadItem(DbDataReader reader) => new(
        reader.GetInt64(0),
        reader.GetGuid(1),
        reader.IsDBNull(2) ? null : reader.GetString(2),
        reader.IsDBNull(3) ? null : reader.GetString(3),
        reader.GetInt64(4),
        reader.IsDBNull(5) ? null : reader.GetString(5),
        reader.GetInt64(6),
        reader.GetString(7),
        reader.GetString(8),
        reader.GetString(9),
        PostgresAdminHelpers.ReadTimestamp(reader, 10) ?? DateTimeOffset.UtcNow,
        PostgresAdminHelpers.ReadTimestamp(reader, 11));

    private static bool IsSchemaError(PostgresException exception) =>
        exception.SqlState is PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn;

    private AdminSchemaNotReadyException SchemaNotReady(PostgresException exception)
    {
        logger.LogError(exception, "Demo order schema is not ready.");
        return new AdminSchemaNotReadyException(
            "Chưa áp dụng migration đơn DEMO. Áp dụng deploy Sprint 6 đã được review.");
    }

    private void EnsureSupported()
    {
        if (!IsSupported)
        {
            throw new AdminSchemaNotReadyException(
                "Đơn DEMO chỉ có trên Supabase và không chạy trên SQLite legacy.");
        }
    }
}
