using System.Data;
using System.Data.Common;
using System.Net.Http.Headers;
using System.Net.Sockets;
using Linea.Api.Data;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace Linea.Api.Controllers;

// PB20 / WBS 2.20.6. Reports configuration names and real readiness flags.
// It never returns a secret, password, token or connection string value.
[ApiController]
[Route("api/health/preflight")]
[AllowAnonymous]
public sealed class PreflightController(
    AppDbContext db,
    IConfiguration configuration,
    IHttpClientFactory clients,
    IWebHostEnvironment environment) : ControllerBase
{
    private static readonly string[] RequiredNames =
    [
        "SUPABASE_URL",
        "SUPABASE_PUBLISHABLE_KEY",
        "SUPABASE_DB_URL",
        "SUPABASE_SERVICE_ROLE_KEY",
        "ASSIGNMENT_STORAGE_BUCKET",
        "CLIENT_ORIGIN"
    ];

    private static readonly string[] OptionalNames =
    [
        "SUPABASE_MEDIA_BUCKET",
        "SUPABASE_ATTACHMENTS_BUCKET",
        "PAYMENT_MODE"
    ];

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken cancellationToken)
    {
        var missing = RequiredNames
            .Where(name => string.IsNullOrWhiteSpace(configuration[name]))
            .ToArray();
        var optionalMissing = OptionalNames
            .Where(name => string.IsNullOrWhiteSpace(configuration[name]))
            .ToArray();

        var databaseConfigured = !string.IsNullOrWhiteSpace(configuration["SUPABASE_DB_URL"]);
        var mode = db.Database.IsNpgsql() ? "postgres" : "sqlite";
        var connected = false;
        string? databaseErrorKind = null;
        var schema = new SchemaReadiness(false, false, false, false, false, false);
        try
        {
            await CheckConnectionAsync(cancellationToken);
            connected = true;
            if (db.Database.IsNpgsql())
                schema = await ReadSchemaAsync(cancellationToken);
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            connected = false;
            databaseErrorKind = ClassifyDatabaseError(exception);
        }

        var storageBucket = configuration["ASSIGNMENT_STORAGE_BUCKET"] ?? "assignment-submissions";
        var storageConfigured = HasSupabaseStorageConfig();
        var storageAvailable = storageConfigured &&
            await CheckStorageBucketAsync(storageBucket, cancellationToken);

        var authConfigured = Uri.TryCreate(
                configuration["SUPABASE_URL"]?.TrimEnd('/') + "/", UriKind.Absolute, out var authUri) &&
            authUri.Scheme == Uri.UriSchemeHttps &&
            !string.IsNullOrWhiteSpace(configuration["SUPABASE_PUBLISHABLE_KEY"]);

        var schemaReady = schema.UsersTable && schema.CoursesTable &&
            schema.AuthUsersTable && schema.AdminLockColumns &&
            schema.CourseVisibilityColumns && schema.DemoOrdersTable;
        var productionNeedsPostgres = environment.IsProduction() && mode != "postgres";
        var ok = connected && authConfigured && !productionNeedsPostgres &&
            (mode == "postgres" ? schemaReady : true);

        return Ok(new
        {
            status = ok ? "ok" : "degraded",
            environment = environment.EnvironmentName,
            missingConfigNames = missing,
            optionalMissingConfigNames = optionalMissing,
            auth = new { configured = authConfigured },
            database = new
            {
                configured = databaseConfigured,
                mode,
                connected,
                errorKind = databaseErrorKind,
                hint = DatabaseHint(databaseErrorKind),
                schema = new
                {
                    usersTable = schema.UsersTable,
                    authUsersTable = schema.AuthUsersTable,
                    coursesTable = schema.CoursesTable,
                    adminLockColumns = schema.AdminLockColumns,
                    courseVisibilityColumns = schema.CourseVisibilityColumns,
                    demoOrdersTable = schema.DemoOrdersTable,
                    ready = schemaReady
                }
            },
            storage = new
            {
                configured = storageConfigured,
                bucket = storageBucket,
                available = storageAvailable,
                note = "Storage readiness is separate so a missing upload bucket does not hide GET assignment readiness."
            },
            payment = new { mode = configuration["PAYMENT_MODE"] ?? "DEMO" }
        });
    }

    private async Task CheckConnectionAsync(CancellationToken cancellationToken)
    {
        await db.Database.OpenConnectionAsync(cancellationToken);
        try
        {
            await using var command = db.Database.GetDbConnection().CreateCommand();
            command.CommandText = "select 1";
            await command.ExecuteScalarAsync(cancellationToken);
        }
        finally
        {
            await db.Database.CloseConnectionAsync();
        }
    }

    private async Task<SchemaReadiness> ReadSchemaAsync(CancellationToken cancellationToken)
    {
        var (connection, wasClosed) = await PostgresAdminHelpers.OpenAsync(db, cancellationToken);
        try
        {
            await using var command = PostgresAdminHelpers.CreateCommand(connection, """
                select to_regclass('public.nguoi_dung') is not null,
                       to_regclass('public.khoa_hoc') is not null,
                       to_regclass('auth.users') is not null,
                       exists (
                         select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'nguoi_dung'
                           and column_name in ('is_locked', 'lock_version')
                         having count(*) = 2
                       ),
                       exists (
                         select 1 from information_schema.columns
                         where table_schema = 'public' and table_name = 'khoa_hoc'
                           and column_name in ('visibility_version', 'ngay_cap_nhat')
                         having count(*) = 2
                       ),
                       to_regclass('public.don_hang_demo') is not null
                """);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (!await reader.ReadAsync(cancellationToken))
                return new SchemaReadiness(false, false, false, false, false, false);
            return new SchemaReadiness(
                reader.GetBoolean(0),
                reader.GetBoolean(1),
                reader.GetBoolean(2),
                reader.GetBoolean(3),
                reader.GetBoolean(4),
                reader.GetBoolean(5));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            return new SchemaReadiness(false, false, false, false, false, false);
        }
        finally
        {
            await PostgresAdminHelpers.CloseAsync(connection, wasClosed);
        }
    }

    private bool HasSupabaseStorageConfig() =>
        Uri.TryCreate(configuration["SUPABASE_URL"]?.TrimEnd('/') + "/", UriKind.Absolute, out var uri) &&
        uri.Scheme == Uri.UriSchemeHttps &&
        !string.IsNullOrWhiteSpace(configuration["SUPABASE_SERVICE_ROLE_KEY"]);

    private async Task<bool> CheckStorageBucketAsync(string bucket, CancellationToken cancellationToken)
    {
        var url = configuration["SUPABASE_URL"]?.TrimEnd('/');
        var key = configuration["SUPABASE_SERVICE_ROLE_KEY"];
        if (string.IsNullOrWhiteSpace(url) || string.IsNullOrWhiteSpace(key)) return false;

        try
        {
            using var timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
            timeout.CancelAfter(TimeSpan.FromSeconds(5));
            using var request = new HttpRequestMessage(HttpMethod.Get,
                $"{url}/storage/v1/bucket/{Uri.EscapeDataString(bucket)}");
            request.Headers.Add("apikey", key);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", key);
            using var response = await clients.CreateClient().SendAsync(request, timeout.Token);
            return response.IsSuccessStatusCode;
        }
        catch (Exception exception) when (exception is not OperationCanceledException ||
            !cancellationToken.IsCancellationRequested)
        {
            return false;
        }
    }

    private static string ClassifyDatabaseError(Exception exception)
    {
        for (var current = exception; current is not null; current = current.InnerException)
        {
            if (current is PostgresException postgres)
            {
                return postgres.SqlState switch
                {
                    PostgresErrorCodes.InvalidPassword => "auth_failed",
                    PostgresErrorCodes.InvalidAuthorizationSpecification => "auth_failed",
                    PostgresErrorCodes.UndefinedTable or PostgresErrorCodes.UndefinedColumn => "schema_missing",
                    _ => "postgres_error"
                };
            }

            if (current is SocketException) return "dns_or_network";
            if (current is TimeoutException) return "timeout";
        }

        return "unavailable";
    }

    private static string? DatabaseHint(string? kind) => kind switch
    {
        "auth_failed" => "Kiểm tra mật khẩu database hiện tại trong SUPABASE_DB_URL.",
        "dns_or_network" => "Kiểm tra host/port; mạng IPv4-only cần dùng Supabase pooler.",
        "schema_missing" => "Áp dụng migration Sprint 6 đã được review.",
        "timeout" => "Kiểm tra kết nối mạng tới Supabase và thử lại.",
        _ => null
    };

    private sealed record SchemaReadiness(
        bool UsersTable,
        bool CoursesTable,
        bool AuthUsersTable,
        bool AdminLockColumns,
        bool CourseVisibilityColumns,
        bool DemoOrdersTable);
}
