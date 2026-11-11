using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Linea.Api.Data;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Npgsql;

LoadDotEnvFile();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var supabaseDbUrl = builder.Configuration["SUPABASE_DB_URL"];
if (!string.IsNullOrWhiteSpace(supabaseDbUrl))
{
    builder.Services.AddDbContext<AppDbContext>(options =>
        options.UseNpgsql(BuildPostgresConnectionString(supabaseDbUrl)));
}
else
{
    var rawConnectionString = builder.Configuration["DB_CONNECTION"] ?? "Data Source=linea-dev.db";
    var sqliteBuilder = new SqliteConnectionStringBuilder(rawConnectionString);
    if (!string.IsNullOrWhiteSpace(sqliteBuilder.DataSource) &&
        sqliteBuilder.DataSource != ":memory:" &&
        !Path.IsPathRooted(sqliteBuilder.DataSource))
    {
        sqliteBuilder.DataSource = Path.Combine(builder.Environment.ContentRootPath, sqliteBuilder.DataSource);
    }

    builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(sqliteBuilder.ToString()));
}

var jwtKey = builder.Configuration["JWT_KEY"];
if (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32)
{
    throw new InvalidOperationException(
        "JWT_KEY is missing or shorter than 32 bytes. Set JWT_KEY in the environment before starting the API.");
}

var jwtOptions = new JwtOptions
{
    Key = jwtKey,
    Issuer = builder.Configuration["JWT_ISSUER"] ?? "linea-api",
    Audience = builder.Configuration["JWT_AUDIENCE"] ?? "linea-client",
    ExpiryMinutes = int.TryParse(builder.Configuration["JWT_EXPIRY_MINUTES"], out var minutes)
        ? minutes
        : 60
};
builder.Services.AddSingleton(jwtOptions);

builder.Services.AddSingleton<IPasswordHasher, BcryptPasswordHasher>();
builder.Services.AddSingleton<ITokenService, TokenService>();
builder.Services.AddScoped<ICourseService, CourseService>();
builder.Services.AddSingleton<SignedUrlService>();
builder.Services.AddSingleton<IEmailSender, SmtpEmailSender>();
builder.Services.AddSingleton<IPortfolioStorage>(services =>
{
    var configuration = services.GetRequiredService<IConfiguration>();
    if (!string.IsNullOrWhiteSpace(configuration["SUPABASE_SERVICE_ROLE_KEY"]) &&
        !string.IsNullOrWhiteSpace(configuration["SUPABASE_URL"]))
    {
        return ActivatorUtilities.CreateInstance<SupabasePortfolioStorage>(services);
    }

    return ActivatorUtilities.CreateInstance<LocalPortfolioStorage>(services);
});
builder.Services.AddScoped<AccountDirectory>();

builder.Services
    .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwtOptions.Issuer,
            ValidateAudience = true,
            ValidAudience = jwtOptions.Audience,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtOptions.Key)),
            ValidateLifetime = true,
            ClockSkew = TimeSpan.FromSeconds(30),
            NameClaimType = "name",
            RoleClaimType = "role"
        };
        options.Events = new JwtBearerEvents
        {
            OnTokenValidated = async context =>
            {
                var subject = context.Principal?.FindFirstValue(JwtRegisteredClaimNames.Sub);
                if (!Guid.TryParse(subject, out var userId))
                {
                    context.Fail("The token subject is invalid.");
                    return;
                }

                var db = context.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
                var user = await db.Users
                    .AsNoTracking()
                    .SingleOrDefaultAsync(candidate => candidate.Id == userId);

                if (user is null || user.IsLocked)
                {
                    context.Fail("The account is unavailable or locked.");
                }
            },
            OnChallenge = async context =>
            {
                context.HandleResponse();
                if (context.Response.HasStarted)
                {
                    return;
                }

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status401Unauthorized,
                    Title = "Chưa xác thực",
                    Detail = "Thiếu hoặc không hợp lệ access token."
                });
            },
            OnForbidden = async context =>
            {
                if (context.Response.HasStarted)
                {
                    return;
                }

                context.Response.StatusCode = StatusCodes.Status403Forbidden;
                context.Response.ContentType = "application/problem+json";
                await context.Response.WriteAsJsonAsync(new ProblemDetails
                {
                    Status = StatusCodes.Status403Forbidden,
                    Title = "Không có quyền truy cập",
                    Detail = "Bạn không có quyền truy cập chức năng này."
                });
            }
        };
    });

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(AuthPolicies.StudentOnly, policy => policy.RequireRole("student"));
    options.AddPolicy(AuthPolicies.TeacherAccess, policy => policy.RequireRole("teacher", "admin"));
    options.AddPolicy(AuthPolicies.AdminOnly, policy => policy.RequireRole("admin"));
});

var allowedOrigins = (builder.Configuration["CLIENT_ORIGIN"] ?? "http://localhost:5173")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
{
    options.AddPolicy("client", policy =>
        policy.WithOrigins(allowedOrigins)
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseCors("client");
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapOpenApi();

app.MapGet("/api/health", async (AppDbContext db, CancellationToken cancellationToken) =>
{
    var connected = await db.Database.CanConnectAsync(cancellationToken);
    return connected
        ? Results.Ok(new { status = "ok", database = "connected" })
        : Results.Problem("Không thể kết nối cơ sở dữ liệu.", statusCode: StatusCodes.Status503ServiceUnavailable);
});

var runMigrations = app.Environment.IsDevelopment() ||
    string.Equals(
        builder.Configuration["RUN_MIGRATIONS"],
        "true",
        StringComparison.OrdinalIgnoreCase);

if (runMigrations)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await DbSeeder.SeedAdminAsync(
        scope.ServiceProvider,
        app.Configuration,
        app.Logger);
}

app.Run();

static string BuildPostgresConnectionString(string url)
{
    if (!url.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) &&
        !url.StartsWith("postgresql://", StringComparison.OrdinalIgnoreCase))
    {
        throw new InvalidOperationException(
            "SUPABASE_DB_URL must start with postgres:// or postgresql://.");
    }

    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
    {
        throw new InvalidOperationException("SUPABASE_DB_URL is not a valid PostgreSQL URL.");
    }

    var userInfo = uri.UserInfo.Split(':', 2);
    if (userInfo.Length < 2 || string.IsNullOrWhiteSpace(uri.Host))
    {
        throw new InvalidOperationException(
            "SUPABASE_DB_URL must include the user, password and host.");
    }

    var database = uri.AbsolutePath.Trim('/');
    var builder = new NpgsqlConnectionStringBuilder
    {
        Host = uri.Host,
        Port = uri.Port > 0 ? uri.Port : 5432,
        Database = string.IsNullOrWhiteSpace(database) ? "postgres" : database,
        Username = Uri.UnescapeDataString(userInfo[0]),
        Password = Uri.UnescapeDataString(userInfo[1]),
        SslMode = SslMode.Require,
        Timeout = 15
    };

    return builder.ConnectionString;
}

static void LoadDotEnvFile()
{
    var directory = new DirectoryInfo(AppContext.BaseDirectory);
    while (directory is not null)
    {
        var path = Path.Combine(directory.FullName, ".env");
        if (File.Exists(path))
        {
            foreach (var rawLine in File.ReadLines(path))
            {
                var line = rawLine.Trim();
                if (line.Length == 0 || line.StartsWith('#'))
                {
                    continue;
                }

                if (line.StartsWith("export ", StringComparison.Ordinal))
                {
                    line = line["export ".Length..].Trim();
                }

                var separator = line.IndexOf('=');
                if (separator <= 0)
                {
                    continue;
                }

                var key = line[..separator].Trim();
                var value = line[(separator + 1)..].Trim().Trim('"', '\'');
                if (Environment.GetEnvironmentVariable(key) is null)
                {
                    Environment.SetEnvironmentVariable(key, value);
                }
            }

            return;
        }

        directory = directory.Parent;
    }
}

public partial class Program;
