using System.IdentityModel.Tokens.Jwt;
using System.Net.Http.Headers;
using System.Security.Claims;
using System.Text;
using Linea.Api.Data;
using Linea.Api.Security;
using Linea.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

DatabaseConfiguration.LoadDotEnvFile();

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
builder.Services.AddHttpClient();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(DatabaseConfiguration.GetConnectionString(builder.Configuration)));
// Validate database configuration before starting the HTTP server.
_ = DatabaseConfiguration.GetConnectionString(builder.Configuration);

var useLegacyAuth = builder.Environment.IsDevelopment() && builder.Configuration["AUTH_MODE"] == "legacy";
var jwtKey = builder.Configuration["JWT_KEY"];
if (useLegacyAuth && (string.IsNullOrWhiteSpace(jwtKey) || Encoding.UTF8.GetByteCount(jwtKey) < 32))
{
    throw new InvalidOperationException(
        "JWT_KEY is missing or shorter than 32 bytes. Set JWT_KEY in the environment before starting the API.");
}
if (string.IsNullOrWhiteSpace(jwtKey))
    jwtKey = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32));

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
builder.Services.AddScoped<ActiveAccountHandler>();
builder.Services.AddScoped<LearningProgressService>();
builder.Services.AddScoped<AdminManagementService>();
builder.Services.AddScoped<AdminOrderService>();
builder.Services.AddSingleton<AssignmentStorage>();

builder.Services
    .AddAuthentication(useLegacyAuth ? JwtBearerDefaults.AuthenticationScheme : "Supabase")
    .AddScheme<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions, SupabaseAuthenticationHandler>("Supabase", _ => { })
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

                var accounts = context.HttpContext.RequestServices.GetRequiredService<ActiveAccountHandler>();
                var status = await accounts.CheckAsync(userId, context.HttpContext.RequestAborted);

                if (!status.Available)
                {
                    context.Fail("The account state could not be verified.");
                    return;
                }

                if (!status.Found || status.IsLocked)
                {
                    context.Fail("The account is unavailable or locked.");
                    return;
                }

                var tokenRole = context.Principal?.FindFirstValue("role");
                if (!string.Equals(tokenRole, status.Role, StringComparison.OrdinalIgnoreCase))
                {
                    context.Fail("The account role has changed. Sign in again.");
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

// This endpoint uses Supabase Auth directly; the older /api/auth endpoints use
// a separate legacy account store and are not interchangeable with it.
app.MapGet("/api/account/me", async (HttpRequest request, IConfiguration configuration,
    IHttpClientFactory clients, CancellationToken cancellationToken) =>
{
    if (!AuthenticationHeaderValue.TryParse(request.Headers.Authorization, out var header) ||
        !string.Equals(header.Scheme, "Bearer", StringComparison.OrdinalIgnoreCase) ||
        string.IsNullOrWhiteSpace(header.Parameter)) return Results.Unauthorized();

    var projectUrl = configuration["SUPABASE_URL"];
    var publicKey = configuration["SUPABASE_PUBLISHABLE_KEY"];
    if (!Uri.TryCreate(projectUrl?.TrimEnd('/') + "/", UriKind.Absolute, out var uri) ||
        uri.Scheme != Uri.UriSchemeHttps || string.IsNullOrWhiteSpace(publicKey))
        return Results.Problem("Chưa cấu hình kết nối Supabase cho API.", statusCode: 503);

    var client = clients.CreateClient("supabase-account");
    client.BaseAddress = uri;
    var result = await new SupabaseAccountService(client, publicKey).GetAccountAsync(header.Parameter, cancellationToken);
    if (result.Unavailable) return Results.Problem("Không thể xác minh tài khoản lúc này.", statusCode: 503);
    if (result.Account is null) return Results.Unauthorized();
    if (result.Account.IsLocked)
        return Results.Problem("Tài khoản đã bị khóa.", statusCode: StatusCodes.Status403Forbidden);
    var accountDb = request.HttpContext.RequestServices.GetRequiredService<AppDbContext>();
    if (accountDb.Database.IsNpgsql())
    {
        var status = await request.HttpContext.RequestServices.GetRequiredService<ActiveAccountHandler>()
            .CheckAsync(result.Account.Id, cancellationToken);
        if (!status.Available)
            return Results.Problem("Không thể xác minh trạng thái tài khoản lúc này.", statusCode: 503);
        if (!status.Found || status.IsLocked)
            return Results.Problem("Tài khoản đã bị khóa hoặc không còn hiệu lực.",
                statusCode: StatusCodes.Status403Forbidden);
    }
    return Results.Ok(result.Account);
});

app.MapGet("/api/health", async (AppDbContext db, IConfiguration configuration, IHttpClientFactory clients, CancellationToken cancellationToken) =>
{
    if (!useLegacyAuth)
    {
        var url = configuration["SUPABASE_URL"];
        var key = configuration["SUPABASE_PUBLISHABLE_KEY"];
        if (!Uri.TryCreate(url?.TrimEnd('/') + "/auth/v1/settings", UriKind.Absolute, out var uri) ||
            uri.Scheme != Uri.UriSchemeHttps || string.IsNullOrWhiteSpace(key))
            return Results.Problem("Chưa cấu hình Supabase.", statusCode: 503);
        try
        {
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Headers.Add("apikey", key);
            using var response = await clients.CreateClient().SendAsync(request, cancellationToken);
            if (!response.IsSuccessStatusCode)
                return Results.Problem("Không thể kết nối Supabase Auth.", statusCode: 503);

            var databaseConnected = await db.Database.CanConnectAsync(cancellationToken);
            return Results.Ok(new
            {
                status = databaseConnected ? "ok" : "degraded",
                auth = "connected",
                database = databaseConnected ? "connected" : "unavailable",
                databaseMode = db.Database.IsNpgsql() ? "postgres" : "sqlite",
                preflight = "/api/health/preflight"
            });
        }
        catch (HttpRequestException)
        {
            return Results.Problem("Không thể kết nối Supabase Auth.", statusCode: 503);
        }
    }
    var connected = await db.Database.CanConnectAsync(cancellationToken);
    return connected
        ? Results.Ok(new { status = "ok", database = "connected" })
        : Results.Problem("Không thể kết nối cơ sở dữ liệu.", statusCode: StatusCodes.Status503ServiceUnavailable);
});

var runMigrations = string.Equals(
        builder.Configuration["RUN_MIGRATIONS"],
        "true",
        StringComparison.OrdinalIgnoreCase);

if (runMigrations)
{
    await using var scope = app.Services.CreateAsyncScope();
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    if (db.Database.IsNpgsql())
    {
        // Sprint 6 admin/order columns and the D05 completion backfill are kept
        // as reviewed, idempotent SQL so they do not modify the EF model snapshot.
        await db.Database.ExecuteSqlRawAsync(
            ReadEmbeddedSql("Linea.Api.Data.Sql.admin-management.sql"), app.Lifetime.ApplicationStopping);
        await db.Database.ExecuteSqlRawAsync(
            ReadEmbeddedSql("Linea.Api.Data.Sql.progress-completion-d05.sql"), app.Lifetime.ApplicationStopping);
    }
    await DbSeeder.SeedAdminAsync(
        scope.ServiceProvider,
        app.Configuration,
        app.Logger);
}

app.Run();

static string ReadEmbeddedSql(string name)
{
    using var stream = typeof(AppDbContext).Assembly.GetManifestResourceStream(name)
        ?? throw new InvalidOperationException($"Missing embedded SQL resource {name}.");
    using var reader = new StreamReader(stream);
    return reader.ReadToEnd();
}

public partial class Program;
