using Linea.Api.Data;
using Npgsql;

namespace Linea.Api.Tests;

// Exercises bootstrap against existing moderation history on a dedicated test DB.
// All schema and fixture changes are rolled back, including on failure.
internal static class BootstrapRegression
{
    public static async Task<int> RunAsync()
    {
        var url = Environment.GetEnvironmentVariable("TEST_DATABASE_URL");
        if (string.IsNullOrWhiteSpace(url))
            throw new InvalidOperationException("A dedicated TEST_DATABASE_URL is required.");
        await using var connection = new NpgsqlConnection(DatabaseConfiguration.BuildPostgresConnectionString(url));
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        try
        {
            await using (var timeout = new NpgsqlCommand("SET LOCAL lock_timeout='5s'; SET LOCAL statement_timeout='30s';", connection, transaction))
                await timeout.ExecuteNonQueryAsync();
            var marker = "bootstrap-regression-" + Guid.NewGuid().ToString("N");
            await using (var seed = new NpgsqlCommand("""
                insert into public.lich_su_trang_thai
                    (loai_doi_tuong, ma_doi_tuong, trang_thai_moi, ma_nguoi_thuc_hien)
                select 'CONG_DONG', @marker, 'HIDDEN', id
                from public.nguoi_dung order by id limit 1
                """, connection, transaction))
            {
                seed.Parameters.AddWithValue("marker", marker);
                if (await seed.ExecuteNonQueryAsync() != 1)
                    throw new InvalidOperationException("Test database needs one account fixture.");
            }
            using var stream = typeof(AppDbContext).Assembly.GetManifestResourceStream("Linea.Api.Data.Sql.admin-management.sql")
                ?? throw new InvalidOperationException("Missing bootstrap SQL resource.");
            using var reader = new StreamReader(stream);
            var sql = await reader.ReadToEndAsync();
            for (var run = 1; run <= 2; run++)
            {
                await using var bootstrap = new NpgsqlCommand(sql, connection, transaction);
                await bootstrap.ExecuteNonQueryAsync();
                await using var verify = new NpgsqlCommand("""
                    select count(*) from public.lich_su_trang_thai
                    where ma_doi_tuong=@marker and loai_doi_tuong='CONG_DONG'
                    """, connection, transaction);
                verify.Parameters.AddWithValue("marker", marker);
                if (Convert.ToInt64(await verify.ExecuteScalarAsync()) != 1)
                    throw new InvalidOperationException("Existing moderation history was changed.");
                Console.WriteLine($"PASS bootstrap run {run} preserves existing CONG_DONG history");
            }
            Console.WriteLine("2/2 bootstrap regression checks passed; changes rolled back.");
            return 0;
        }
        catch (Exception exception)
        {
            // No connection string or credential is written to the test output.
            Console.WriteLine($"FAIL bootstrap regression: {exception.GetType().Name}");
            if (exception is PostgresException pg) Console.WriteLine($"SQLSTATE {pg.SqlState}: {pg.MessageText}");
            return 1;
        }
        finally
        {
            await transaction.RollbackAsync();
        }
    }
}
