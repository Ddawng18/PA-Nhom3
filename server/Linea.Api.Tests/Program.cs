using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Linea.Api.Data;
using Linea.Api.Models;
using Linea.Api.Services;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Tests;

internal static class Program
{
    private const string DefaultPassword = "MatKhau123!";
    private const string AdminEmail = "admin@linea.local";
    private const string AdminPassword = "AdminPass123!";
    private const string TestJwtKey = "test-only-signing-key-with-at-least-32-bytes";

    private static async Task<int> Main()
    {
        var apiProject = FindApiProject();
        var dbPath = Path.Combine(Path.GetTempPath(), $"linea-smoke-{Guid.NewGuid():N}.db");
        var docsPath = Path.Combine(Path.GetTempPath(), $"linea-teacher-docs-{Guid.NewGuid():N}");
        var emailPath = Path.Combine(Path.GetTempPath(), $"linea-email-{Guid.NewGuid():N}");
        var port = GetFreePort();
        var baseUrl = $"http://127.0.0.1:{port}";
        var logs = new StringBuilder();

        using var apiProcess = StartApi(apiProject, port, dbPath, docsPath, emailPath);
        apiProcess.OutputDataReceived += (_, args) =>
        {
            if (args.Data is not null)
            {
                lock (logs) logs.AppendLine(args.Data);
            }
        };
        apiProcess.ErrorDataReceived += (_, args) =>
        {
            if (args.Data is not null)
            {
                lock (logs) logs.AppendLine(args.Data);
            }
        };
        apiProcess.BeginOutputReadLine();
        apiProcess.BeginErrorReadLine();

        using var client = new HttpClient
        {
            BaseAddress = new Uri(baseUrl),
            Timeout = TimeSpan.FromSeconds(30)
        };

        try
        {
            if (!await WaitForHealthAsync(client, TimeSpan.FromSeconds(90)))
            {
                Console.WriteLine("FAIL API did not become ready.");
                lock (logs) Console.WriteLine(logs.ToString());
                return 1;
            }

            var suite = new SmokeSuite(client, dbPath, emailPath);
            return await suite.RunAsync();
        }
        finally
        {
            try
            {
                if (!apiProcess.HasExited)
                {
                    apiProcess.Kill(entireProcessTree: true);
                    await apiProcess.WaitForExitAsync();
                }
            }
            catch
            {
                // Best-effort cleanup.
            }

            SqliteConnection.ClearAllPools();
            foreach (var path in new[] { dbPath, $"{dbPath}-shm", $"{dbPath}-wal" })
            {
                try
                {
                    if (File.Exists(path)) File.Delete(path);
                }
                catch
                {
                    // Best-effort cleanup.
                }
            }

            try
            {
                if (Directory.Exists(docsPath)) Directory.Delete(docsPath, recursive: true);
            }
            catch
            {
                // Best-effort cleanup.
            }

            try
            {
                if (Directory.Exists(emailPath)) Directory.Delete(emailPath, recursive: true);
            }
            catch
            {
                // Best-effort cleanup.
            }
        }
    }

    private static string FindApiProject()
    {
        var directory = new DirectoryInfo(AppContext.BaseDirectory);
        while (directory is not null)
        {
            var candidate = Path.Combine(directory.FullName, "server", "Linea.Api", "Linea.Api.csproj");
            if (File.Exists(candidate)) return candidate;

            candidate = Path.Combine(directory.FullName, "Linea.Api", "Linea.Api.csproj");
            if (File.Exists(candidate)) return candidate;

            directory = directory.Parent;
        }

        throw new InvalidOperationException("Could not locate server/Linea.Api/Linea.Api.csproj.");
    }

    private static Process StartApi(string apiProject, int port, string dbPath, string docsPath, string emailPath)
    {
        var configuration =
            typeof(Program).Assembly.GetCustomAttribute<AssemblyConfigurationAttribute>()?.Configuration
            ?? "Debug";

        var startInfo = new ProcessStartInfo("dotnet")
        {
            WorkingDirectory = Path.GetDirectoryName(apiProject)!,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        startInfo.ArgumentList.Add("run");
        startInfo.ArgumentList.Add("--project");
        startInfo.ArgumentList.Add(apiProject);
        startInfo.ArgumentList.Add("--configuration");
        startInfo.ArgumentList.Add(configuration);
        startInfo.ArgumentList.Add("--no-build");
        startInfo.ArgumentList.Add("--no-restore");
        startInfo.ArgumentList.Add("--no-launch-profile");

        startInfo.Environment["ASPNETCORE_ENVIRONMENT"] = "Development";
        startInfo.Environment["ASPNETCORE_URLS"] = $"http://127.0.0.1:{port}";
        startInfo.Environment["JWT_KEY"] = TestJwtKey;
        startInfo.Environment["AUTH_MODE"] = "legacy";
        startInfo.Environment["JWT_ISSUER"] = "linea-api-tests";
        startInfo.Environment["JWT_AUDIENCE"] = "linea-client-tests";
        startInfo.Environment["DB_CONNECTION"] = $"Data Source={dbPath}";
        startInfo.Environment["TEACHER_DOCS_PATH"] = docsPath;
        startInfo.Environment["EMAIL_OUTBOX_PATH"] = emailPath;
        startInfo.Environment["SUPABASE_DB_URL"] = string.Empty;
        startInfo.Environment["SUPABASE_SERVICE_ROLE_KEY"] = string.Empty;
        startInfo.Environment["CLIENT_ORIGIN"] = "http://localhost:5173";
        startInfo.Environment["SEED_ADMIN_EMAIL"] = AdminEmail;
        startInfo.Environment["SEED_ADMIN_PASSWORD"] = AdminPassword;

        return Process.Start(startInfo)
               ?? throw new InvalidOperationException("Could not start the API process.");
    }

    private static async Task<bool> WaitForHealthAsync(HttpClient client, TimeSpan timeout)
    {
        var deadline = DateTimeOffset.UtcNow.Add(timeout);
        while (DateTimeOffset.UtcNow < deadline)
        {
            try
            {
                using var response = await client.GetAsync("/api/health");
                if (response.IsSuccessStatusCode) return true;
            }
            catch (HttpRequestException)
            {
                // API is still starting.
            }
            catch (TaskCanceledException)
            {
                // API is still starting.
            }

            await Task.Delay(500);
        }

        return false;
    }

    private static int GetFreePort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }
}

internal sealed class FakeSupabaseHandler(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
{
    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        => Task.FromResult(respond(request));
}

internal sealed class FakeClientFactory(Func<HttpRequestMessage, HttpResponseMessage> respond) : IHttpClientFactory
{
    public HttpClient CreateClient(string name) => new(new FakeSupabaseHandler(respond));
}

internal sealed class SmokeSuite(HttpClient client, string dbPath, string emailPath)
{
    private const string DefaultPassword = "MatKhau123!";
    private const string AdminEmail = "admin@linea.local";
    private const string AdminPassword = "AdminPass123!";

    private string? _studentEmail;
    private string? _studentId;
    private string? _studentToken;
    private string? _promotedToken;
    private string? _adminToken;
    private string? _adminId;
    private Guid _firstTeacherStudentId;
    private string? _firstTeacherStudentEmail;
    private string? _firstTeacherStudentToken;
    private string? _firstTeacherToken;
    private long _firstTeacherProfileId;
    private long _firstTeacherImageId;
    private string? _firstTeacherUploadedPath;
    private Guid _secondTeacherStudentId;
    private string? _secondTeacherStudentEmail;
    private string? _secondTeacherStudentToken;
    private long _secondTeacherProfileId;
    private string? _secondTeacherUploadedPath;
    private Guid _changesStudentId;
    private string? _changesStudentEmail;
    private string? _changesStudentToken;
    private long _changesProfileId;
    private string? _changesUploadedPath;

    private static readonly byte[] TinyPng = Convert.FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=");

    public async Task<int> RunAsync()
    {
        var tests = new (string Name, Func<Task> Run)[]
        {
            ("health reports database connected", HealthAsync),
            ("seeded admin can sign in", AdminSignInAsync),
            ("register validates input, hashes password and hides it", RegisterAsync),
            ("register forces the student role", RegisterForcesStudentRoleAsync),
            ("register rejects a duplicate email", DuplicateEmailAsync),
            ("register rejects invalid data", InvalidRegisterAsync),
            ("register rejects passwords over 72 bytes", LongPasswordAsync),
            ("login accepts the correct password", LoginSuccessAsync),
            ("login rejects a wrong password", WrongPasswordAsync),
            ("login rejects an unknown email", UnknownEmailAsync),
            ("protected endpoint rejects a missing token", MissingTokenAsync),
            ("Supabase account endpoint rejects a missing token", SupabaseMissingTokenAsync),
            ("protected endpoint rejects a malformed token", BadTokenAsync),
            ("current profile returns sanitized data", MeAsync),
            ("student is denied teacher and admin endpoints", StudentRbacAsync),
            ("student cannot change roles or lock accounts", StudentCannotMutateAccountsAsync),
            ("admin lists accounts without leaking secrets", AdminListAsync),
            ("admin rejects invalid and numeric roles", InvalidRoleAsync),
            ("Supabase verification uses the verified identity and its profile", SupabaseVerificationAsync),
            ("Supabase authentication enforces profile roles", SupabaseAuthorizationAsync),
            ("teacher role is enforced immediately after re-login", PromoteAndTeacherRbacAsync),
            ("admin can access admin and teacher endpoints", AdminRbacAsync),
            ("admin lock blocks login and invalidates existing tokens", LockFlowAsync),
            ("admin cannot lock their own account", SelfLockAsync),
            ("teacher profile endpoints require authentication and a student role", TeacherProfileAuthGuardAsync),
            ("student submits a teacher profile and remains a student", StudentSubmitsTeacherProfileAsync),
            ("pending teacher profile blocks resubmission", PendingProfileBlocksResubmissionAsync),
            ("admin approves a teacher profile and promotes the account", AdminApprovesTeacherProfileAsync),
            ("admin rejects a teacher profile and the student resubmits", AdminRejectsAndStudentResubmitsAsync),
            ("admin requests changes and the student resubmits", AdminRequestsChangesAndStudentResubmitsAsync),
            ("teacher profile permissions and portfolio privacy are enforced", TeacherProfilePermissionsAsync),
            ("signed portfolio URLs serve images and reject tampering", SignedPortfolioUrlsAsync),
            ("Supabase storage builds upload, validation and signed URL requests", SupabaseStorageRequestsAsync),
            ("portfolio upload rejects invalid type and oversized files", PortfolioUploadValidationAsync),
            ("course API enforces ownership, validation and draft privacy", CourseAccessAsync),
            ("course review updates canonical data, history and notifications atomically", CourseWorkflowAsync),
            ("D05 progress completes after required submission without grading", ProgressD05Async)
        };

        var passed = 0;
        var failed = 0;

        foreach (var (name, run) in tests)
        {
            try
            {
                await run();
                Console.WriteLine($"PASS {name}");
                passed++;
            }
            catch (Exception exception)
            {
                Console.WriteLine($"FAIL {name}: {exception.Message}");
                failed++;
            }
        }

        Console.WriteLine($"RESULT passed={passed} failed={failed}");
        return failed == 0 ? 0 : 1;
    }

    private async Task HealthAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Get, "/api/health");
        Expect(status == HttpStatusCode.OK, $"expected 200, got {(int)status}: {body}");

        using var json = JsonDocument.Parse(body);
        Expect(GetString(json.RootElement, "status") == "ok", "status is not ok");
        Expect(GetString(json.RootElement, "database") == "connected", "database is not connected");
    }

    private async Task AdminSignInAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = AdminEmail,
            password = AdminPassword
        });
        Expect(status == HttpStatusCode.OK, $"expected 200, got {(int)status}: {body}");

        using var json = JsonDocument.Parse(body);
        _adminToken = GetString(json.RootElement, "accessToken");
        _adminId = GetString(json.RootElement.GetProperty("user"), "id");
        Expect(!string.IsNullOrWhiteSpace(_adminToken), "access token is missing");
        Expect(GetString(json.RootElement.GetProperty("user"), "role") == "admin", "seeded role is not admin");
    }

    private async Task RegisterAsync()
    {
        _studentEmail = $"student-{Guid.NewGuid():N}@example.com";
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email = _studentEmail,
            displayName = "Học viên Demo",
            password = DefaultPassword
        });
        Expect(status == HttpStatusCode.Created, $"expected 201, got {(int)status}: {body}");
        Expect(!body.Contains("password", StringComparison.OrdinalIgnoreCase), "response contains the word password");
        Expect(!body.Contains("$2", StringComparison.Ordinal), "response contains a BCrypt hash");

        using var json = JsonDocument.Parse(body);
        _studentId = GetString(json.RootElement, "id");
        Expect(GetString(json.RootElement, "role") == "student", "new account is not a student");

        await using var db = CreateDb();
        var user = await db.Users.AsNoTracking().SingleAsync(candidate => candidate.Email == _studentEmail);
        Expect(user.PasswordHash is not null, "password hash is missing in the database");
        Expect(user.PasswordHash != DefaultPassword, "password was stored in plain text");
        Expect(user.PasswordHash!.StartsWith("$2", StringComparison.Ordinal), "password hash is not BCrypt");
        Expect(new BcryptPasswordHasher().Verify(DefaultPassword, user.PasswordHash!), "BCrypt verification failed");
    }

    private async Task RegisterForcesStudentRoleAsync()
    {
        var email = $"role-{Guid.NewGuid():N}@example.com";
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email,
            displayName = "Role Test",
            password = DefaultPassword,
            role = "admin"
        });
        Expect(status == HttpStatusCode.Created, $"expected 201, got {(int)status}: {body}");

        using var json = JsonDocument.Parse(body);
        Expect(GetString(json.RootElement, "role") == "student", "client-provided role was accepted");
    }

    private async Task DuplicateEmailAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email = _studentEmail,
            displayName = "Duplicate",
            password = DefaultPassword
        });
        Expect(status == HttpStatusCode.Conflict, $"expected 409, got {(int)status}: {body}");
        Expect(Detail(body).Contains("đã được đăng ký", StringComparison.Ordinal), "duplicate message is unclear");
    }

    private async Task InvalidRegisterAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email = "not-an-email",
            displayName = "",
            password = "123"
        });
        Expect(status == HttpStatusCode.BadRequest, $"expected 400, got {(int)status}: {body}");

        using var json = JsonDocument.Parse(body);
        Expect(json.RootElement.TryGetProperty("errors", out var errors), "validation errors are missing");
        var names = errors.EnumerateObject().Select(property => property.Name).ToArray();
        Expect(names.Any(name => name.Equals("Email", StringComparison.OrdinalIgnoreCase)), "email error is missing");
        Expect(names.Any(name => name.Equals("DisplayName", StringComparison.OrdinalIgnoreCase)), "display name error is missing");
        Expect(names.Any(name => name.Equals("Password", StringComparison.OrdinalIgnoreCase)), "password error is missing");
    }

    private async Task LongPasswordAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email = $"long-{Guid.NewGuid():N}@example.com",
            displayName = "Long Password",
            password = new string('ố', 25) + new string('a', 39)
        });
        Expect(status == HttpStatusCode.BadRequest, $"expected 400, got {(int)status}: {body}");
    }

    private async Task LoginSuccessAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = _studentEmail,
            password = DefaultPassword
        });
        Expect(status == HttpStatusCode.OK, $"expected 200, got {(int)status}: {body}");
        Expect(!body.Contains("$2", StringComparison.Ordinal), "login response contains a hash");

        using var json = JsonDocument.Parse(body);
        _studentToken = GetString(json.RootElement, "accessToken");
        Expect(!string.IsNullOrWhiteSpace(_studentToken), "access token is missing");
        Expect(GetString(json.RootElement, "tokenType") == "Bearer", "token type is not Bearer");
        Expect(GetString(json.RootElement.GetProperty("user"), "role") == "student", "role is not student");
    }

    private async Task WrongPasswordAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = _studentEmail,
            password = "SaiMatKhau123!"
        });
        Expect(status == HttpStatusCode.Unauthorized, $"expected 401, got {(int)status}: {body}");
        Expect(Detail(body).Contains("không đúng", StringComparison.Ordinal), "generic error message is missing");
    }

    private async Task UnknownEmailAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = $"missing-{Guid.NewGuid():N}@example.com",
            password = DefaultPassword
        });
        Expect(status == HttpStatusCode.Unauthorized, $"expected 401, got {(int)status}: {body}");
        Expect(Detail(body).Contains("không đúng", StringComparison.Ordinal), "generic error message is missing");
    }

    private async Task MissingTokenAsync()
    {
        var (status, _) = await SendAsync(HttpMethod.Get, "/api/auth/me");
        Expect(status == HttpStatusCode.Unauthorized, $"expected 401, got {(int)status}");
    }

    private async Task BadTokenAsync()
    {
        var (status, _) = await SendAsync(HttpMethod.Get, "/api/auth/me", token: "not-a-real-token");
        Expect(status == HttpStatusCode.Unauthorized, $"expected 401, got {(int)status}");
    }

    private async Task MeAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Get, "/api/auth/me", token: _studentToken);
        Expect(status == HttpStatusCode.OK, $"expected 200, got {(int)status}: {body}");
        Expect(!body.Contains("password", StringComparison.OrdinalIgnoreCase), "profile leaks password data");
        Expect(!body.Contains("$2", StringComparison.Ordinal), "profile leaks a hash");

        using var json = JsonDocument.Parse(body);
        Expect(GetString(json.RootElement, "email") == _studentEmail, "profile email does not match");
        Expect(GetString(json.RootElement, "role") == "student", "profile role does not match");
    }

    private async Task StudentRbacAsync()
    {
        var (studentStatus, _) = await SendAsync(HttpMethod.Get, "/api/student/assignments", token: _studentToken);
        var (teacherStatus, _) = await SendAsync(HttpMethod.Get, "/api/teacher/courses", token: _studentToken);
        var (adminStatus, _) = await SendAsync(HttpMethod.Get, "/api/admin/users", token: _studentToken);

        Expect(studentStatus == HttpStatusCode.OK, $"student endpoint returned {(int)studentStatus}");
        Expect(teacherStatus == HttpStatusCode.Forbidden, $"teacher endpoint returned {(int)teacherStatus}");
        Expect(adminStatus == HttpStatusCode.Forbidden, $"admin endpoint returned {(int)adminStatus}");
    }

    private async Task StudentCannotMutateAccountsAsync()
    {
        var (roleStatus, roleBody) = await SendAsync(
            HttpMethod.Patch,
            $"/api/admin/users/{_studentId}/role",
            new { role = "admin" },
            _studentToken);
        var (lockStatus, lockBody) = await SendAsync(
            HttpMethod.Patch,
            $"/api/admin/users/{_studentId}/lock",
            new { isLocked = true },
            _studentToken);

        Expect(roleStatus == HttpStatusCode.Forbidden, $"expected 403 for role change, got {(int)roleStatus}: {roleBody}");
        Expect(lockStatus == HttpStatusCode.Forbidden, $"expected 403 for lock, got {(int)lockStatus}: {lockBody}");

        var (meStatus, meBody) = await SendAsync(HttpMethod.Get, "/api/auth/me", token: _studentToken);
        Expect(meStatus == HttpStatusCode.OK, $"profile check returned {(int)meStatus}: {meBody}");

        using var me = JsonDocument.Parse(meBody);
        Expect(GetString(me.RootElement, "role") == "student", "student role was changed");
        Expect(!me.RootElement.GetProperty("isLocked").GetBoolean(), "student account was locked");
    }

    private async Task AdminListAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Get, "/api/admin/users", token: _adminToken);
        Expect(status == HttpStatusCode.OK, $"expected 200, got {(int)status}: {body}");
        Expect(!body.Contains("password", StringComparison.OrdinalIgnoreCase), "admin list leaks password data");
        Expect(!body.Contains("$2", StringComparison.Ordinal), "admin list leaks a hash");
        Expect(body.Contains(_studentEmail!, StringComparison.Ordinal), "student is missing from the admin list");
    }

    private static async Task SupabaseAuthorizationAsync()
    {
        var id = Guid.NewGuid();
        var services = new ServiceCollection();
        services.AddLogging();
        services.AddSingleton<IConfiguration>(new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["SUPABASE_URL"] = "https://supabase.example", ["SUPABASE_PUBLISHABLE_KEY"] = "public-key"
        }).Build());
        services.AddSingleton<IHttpClientFactory>(new FakeClientFactory(request =>
            request.RequestUri!.AbsolutePath == "/auth/v1/user"
                ? new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { id }) }
                : new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new[] { new { id, display_name = "Test", role = "student" } }) }));
        services.AddAuthentication("Supabase").AddScheme<AuthenticationSchemeOptions, SupabaseAuthenticationHandler>("Supabase", _ => { });
        services.AddAuthorization(options =>
        {
            options.AddPolicy("student", policy => policy.RequireRole("student"));
            options.AddPolicy("admin", policy => policy.RequireRole("admin"));
        });
        using var provider = services.BuildServiceProvider();
        var context = new DefaultHttpContext { RequestServices = provider };
        context.Request.Headers.Authorization = "Bearer signed-in-token";
        var authentication = await context.AuthenticateAsync("Supabase");
        Expect(authentication.Succeeded && authentication.Principal is not null, "Supabase authentication failed");
        var auth = provider.GetRequiredService<IAuthorizationService>();
        Expect((await auth.AuthorizeAsync(authentication.Principal!, null, "student")).Succeeded, "student denied");
        Expect(!(await auth.AuthorizeAsync(authentication.Principal!, null, "admin")).Succeeded, "student gained admin access");
    }

    private async Task SupabaseMissingTokenAsync()
    {
        var (status, body) = await SendAsync(HttpMethod.Get, "/api/account/me");
        Expect(status == HttpStatusCode.Unauthorized, $"expected 401, got {(int)status}: {body}");
    }

    private static async Task SupabaseVerificationAsync()
    {
        var userId = Guid.NewGuid();
        using var fake = new HttpClient(new FakeSupabaseHandler(request =>
        {
            Expect(request.Headers.Authorization?.Parameter == "valid-token", "missing user bearer token");
            Expect(request.Headers.Contains("apikey"), "missing publishable key");
            if (request.RequestUri!.AbsolutePath == "/auth/v1/user")
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { id = userId }) };
            Expect(request.RequestUri.Query.Contains(userId.ToString(), StringComparison.OrdinalIgnoreCase), "profile query does not use verified id");
            return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new[] { new { id = userId, display_name = "Test", role = "teacher" } }) };
        })) { BaseAddress = new Uri("https://supabase.example/") };
        var result = await new SupabaseAccountService(fake, "public-key").GetAccountAsync("valid-token", default);
        Expect(result.Account?.Id == userId && result.Account.Role == "teacher", "verified profile was not returned");

        using var rejected = new HttpClient(new FakeSupabaseHandler(_ => new HttpResponseMessage(HttpStatusCode.Unauthorized)))
            { BaseAddress = new Uri("https://supabase.example/") };
        var invalid = await new SupabaseAccountService(rejected, "public-key").GetAccountAsync("invalid-token", default);
        Expect(invalid.Account is null && !invalid.Unavailable, "invalid token was not rejected");

        using var failed = new HttpClient(new FakeSupabaseHandler(_ => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable)))
            { BaseAddress = new Uri("https://supabase.example/") };
        var unavailable = await new SupabaseAccountService(failed, "public-key").GetAccountAsync("token", default);
        Expect(unavailable.Account is null && unavailable.Unavailable, "upstream failure was not reported");

        using var locked = new HttpClient(new FakeSupabaseHandler(request =>
        {
            if (request.RequestUri!.AbsolutePath == "/auth/v1/user")
                return new HttpResponseMessage(HttpStatusCode.OK) { Content = JsonContent.Create(new { id = userId }) };
            return new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new[] { new { id = userId, display_name = "Test", role = "student", is_locked = true } })
            };
        })) { BaseAddress = new Uri("https://supabase.example/") };
        var lockedAccount = await new SupabaseAccountService(locked, "public-key").GetAccountAsync("valid-token", default);
        Expect(lockedAccount.Account is { IsLocked: true }, "locked profile was not reported");
    }

    private async Task InvalidRoleAsync()
    {
        foreach (var role in new[] { "999", "0", "unknown" })
        {
            var (status, body) = await SendAsync(HttpMethod.Patch,
                $"/api/admin/users/{_studentId}/role", new { role }, _adminToken);
            Expect(status == HttpStatusCode.BadRequest, $"role {role} returned {(int)status}: {body}");
        }
    }

    private async Task PromoteAndTeacherRbacAsync()
    {
        var (promoteStatus, promoteBody) = await SendAsync(
            HttpMethod.Patch,
            $"/api/admin/users/{_studentId}/role",
            new { role = "teacher" },
            _adminToken);
        Expect(promoteStatus == HttpStatusCode.NoContent, $"expected 204, got {(int)promoteStatus}: {promoteBody}");

        var (staleStatus, _) = await SendAsync(HttpMethod.Get, "/api/student/assignments", token: _studentToken);
        Expect(staleStatus == HttpStatusCode.Unauthorized, $"old token after role change returned {(int)staleStatus}");

        var (loginStatus, loginBody) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = _studentEmail,
            password = DefaultPassword
        });
        Expect(loginStatus == HttpStatusCode.OK, $"expected 200, got {(int)loginStatus}: {loginBody}");

        using var json = JsonDocument.Parse(loginBody);
        _promotedToken = GetString(json.RootElement, "accessToken");
        Expect(GetString(json.RootElement.GetProperty("user"), "role") == "teacher", "promoted role is not exposed");

        var (teacherStatus, _) = await SendAsync(HttpMethod.Get, "/api/teacher/courses", token: _promotedToken);
        var (adminStatus, _) = await SendAsync(HttpMethod.Get, "/api/admin/users", token: _promotedToken);
        var (studentStatus, _) = await SendAsync(HttpMethod.Get, "/api/student/assignments", token: _promotedToken);

        Expect(teacherStatus == HttpStatusCode.OK, $"teacher endpoint returned {(int)teacherStatus}");
        Expect(adminStatus == HttpStatusCode.Forbidden, $"admin endpoint returned {(int)adminStatus}");
        Expect(studentStatus == HttpStatusCode.Forbidden, $"student endpoint returned {(int)studentStatus}");

        var (demoteStatus, demoteBody) = await SendAsync(
            HttpMethod.Patch, $"/api/admin/users/{_studentId}/role", new { role = "student" }, _adminToken);
        Expect(demoteStatus == HttpStatusCode.NoContent, $"expected 204, got {(int)demoteStatus}: {demoteBody}");
        var (staleTeacherStatus, _) = await SendAsync(HttpMethod.Get, "/api/teacher/courses", token: _promotedToken);
        Expect(staleTeacherStatus == HttpStatusCode.Unauthorized, $"demoted teacher token returned {(int)staleTeacherStatus}");

        // Restore the teacher role for the later account-lock test.
        var (restoreStatus, restoreBody) = await SendAsync(
            HttpMethod.Patch, $"/api/admin/users/{_studentId}/role", new { role = "teacher" }, _adminToken);
        Expect(restoreStatus == HttpStatusCode.NoContent, $"expected 204, got {(int)restoreStatus}: {restoreBody}");
    }

    private async Task AdminRbacAsync()
    {
        var (adminStatus, _) = await SendAsync(HttpMethod.Get, "/api/admin/users", token: _adminToken);
        var (teacherStatus, _) = await SendAsync(HttpMethod.Get, "/api/teacher/dashboard", token: _adminToken);
        var (studentStatus, _) = await SendAsync(HttpMethod.Get, "/api/student/assignments", token: _adminToken);

        Expect(adminStatus == HttpStatusCode.OK, $"admin endpoint returned {(int)adminStatus}");
        Expect(teacherStatus == HttpStatusCode.OK, $"teacher endpoint returned {(int)teacherStatus}");
        Expect(studentStatus == HttpStatusCode.Forbidden, $"student endpoint returned {(int)studentStatus}");
    }

    private async Task LockFlowAsync()
    {
        var (lockStatus, lockBody) = await SendAsync(
            HttpMethod.Patch,
            $"/api/admin/users/{_studentId}/lock",
            new { isLocked = true },
            _adminToken);
        Expect(lockStatus == HttpStatusCode.NoContent, $"expected 204, got {(int)lockStatus}: {lockBody}");

        var (loginStatus, loginBody) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = _studentEmail,
            password = DefaultPassword
        });
        Expect((int)loginStatus == 423, $"expected 423, got {(int)loginStatus}: {loginBody}");
        Expect(Detail(loginBody).Contains("bị khóa", StringComparison.Ordinal), "lock message is missing");

        var (meStatus, _) = await SendAsync(HttpMethod.Get, "/api/auth/me", token: _promotedToken);
        Expect(meStatus == HttpStatusCode.Unauthorized, $"locked token returned {(int)meStatus}");
    }

    private async Task SelfLockAsync()
    {
        var (status, body) = await SendAsync(
            HttpMethod.Patch,
            $"/api/admin/users/{_adminId}/lock",
            new { isLocked = true },
            _adminToken);
        Expect(status == HttpStatusCode.BadRequest, $"expected 400, got {(int)status}: {body}");
    }

    private async Task TeacherProfileAuthGuardAsync()
    {
        var (anonymousStatus, _) = await SendAsync(HttpMethod.Get, "/api/teacher/profile/me");
        Expect(anonymousStatus == HttpStatusCode.Unauthorized,
            $"expected 401 without a token, got {(int)anonymousStatus}");

        var (adminReadStatus, adminReadBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: _adminToken);
        Expect(adminReadStatus == HttpStatusCode.Forbidden,
            $"expected 403 for admin profile read, got {(int)adminReadStatus}: {adminReadBody}");

        var (adminSubmitStatus, adminSubmitBody) = await SubmitProfileAsync(
            _adminToken!,
            new string('A', 60),
            new string('B', 20),
            Array.Empty<string>());
        Expect(adminSubmitStatus == HttpStatusCode.Forbidden,
            $"expected 403 for admin submit, got {(int)adminSubmitStatus}: {adminSubmitBody}");
    }

    private async Task StudentSubmitsTeacherProfileAsync()
    {
        var student = await RegisterStudentAsync("teacher-apply");
        _firstTeacherStudentId = student.Id;
        _firstTeacherStudentEmail = student.Email;
        _firstTeacherStudentToken = student.Token;

        var (invalidStatus, invalidBody) = await SubmitProfileAsync(
            student.Token,
            "quá ngắn",
            "ngắn",
            Array.Empty<string>());
        Expect(invalidStatus == HttpStatusCode.BadRequest,
            $"expected 400 for invalid submission, got {(int)invalidStatus}: {invalidBody}");
        using (var invalidJson = JsonDocument.Parse(invalidBody))
        {
            Expect(invalidJson.RootElement.TryGetProperty("errors", out var errors),
                "validation errors are missing");
            Expect(errors.TryGetProperty("introduction", out _), "introduction error is missing");
            Expect(errors.TryGetProperty("experience", out _), "experience error is missing");
            Expect(errors.TryGetProperty("portfolioFiles", out _), "portfolio error is missing");
        }

        var (uploadStatus, uploadBody) = await UploadPortfolioAsync(
            student.Token, TinyPng, "tac-pham.png", "image/png");
        Expect(uploadStatus == HttpStatusCode.Created,
            $"expected 201 for upload, got {(int)uploadStatus}: {uploadBody}");
        using (var uploadJson = JsonDocument.Parse(uploadBody))
        {
            _firstTeacherUploadedPath = GetString(uploadJson.RootElement, "filePath");
        }

        Expect(_firstTeacherUploadedPath!.StartsWith("teacher-docs/", StringComparison.Ordinal),
            "upload path does not use the private teacher-docs prefix");

        var (submitStatus, submitBody) = await SubmitProfileAsync(
            student.Token,
            new string('A', 60),
            new string('B', 20),
            new[] { _firstTeacherUploadedPath });
        Expect(submitStatus == HttpStatusCode.Accepted,
            $"expected 202, got {(int)submitStatus}: {submitBody}");
        Expect(EmailCount() > 0, "submission email was not written to the outbox");
        using (var submitJson = JsonDocument.Parse(submitBody))
        {
            _firstTeacherProfileId = submitJson.RootElement.GetProperty("id").GetInt64();
            Expect(GetString(submitJson.RootElement, "status") == "CHO_DUYET",
                "submitted profile is not pending");
        }

        await using var db = CreateDb();
        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleAsync(candidate => candidate.Id == _firstTeacherProfileId);
        Expect(profile.UserId == student.Id, "profile is linked to the wrong account");
        Expect(profile.Status == TeacherProfileStatus.ChoDuyet, "pending status was not stored");
        Expect(profile.ReviewedAt is null, "reviewedAt must be empty while pending");
        Expect(await db.PortfolioImages.CountAsync(image => image.ProfileId == profile.Id) == 1,
            "portfolio image was not stored");
        Expect(await db.StatusHistory.CountAsync(entry =>
                entry.ObjectType == HistoryObjectTypes.HoSoGiaoVien &&
                entry.ObjectId == profile.Id.ToString() &&
                entry.Status == TeacherProfileStatus.ChoDuyet) == 1,
            "submission history was not written");
        Expect(await db.Notifications.CountAsync(notification =>
                notification.UserId == student.Id &&
                notification.Type == NotificationTypes.HoSoGiaoVien) == 1,
            "submission notification was not written");

        var (meStatus, meBody) = await SendAsync(HttpMethod.Get, "/api/auth/me", token: student.Token);
        Expect(meStatus == HttpStatusCode.OK, $"profile check returned {(int)meStatus}: {meBody}");
        using (var meJson = JsonDocument.Parse(meBody))
        {
            Expect(GetString(meJson.RootElement, "role") == "student",
                "submitting a profile changed the account role");
        }

        var (myProfileStatus, myProfileBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: student.Token);
        Expect(myProfileStatus == HttpStatusCode.OK,
            $"profile read returned {(int)myProfileStatus}: {myProfileBody}");
        using var myProfileJson = JsonDocument.Parse(myProfileBody);
        _firstTeacherImageId = FirstPortfolioImageId(myProfileJson.RootElement);
    }

    private async Task PendingProfileBlocksResubmissionAsync()
    {
        var (status, body) = await SubmitProfileAsync(
            _firstTeacherStudentToken!,
            new string('A', 60),
            new string('B', 20),
            new[] { _firstTeacherUploadedPath! });
        Expect(status == HttpStatusCode.Conflict,
            $"expected 409, got {(int)status}: {body}");
        Expect(Detail(body)?.Contains("chờ kết quả duyệt", StringComparison.Ordinal) == true,
            "pending profile message is missing");
    }

    private async Task AdminApprovesTeacherProfileAsync()
    {
        var (emptyStatus, emptyBody) = await SendAsync(
            HttpMethod.Get,
            "/api/admin/teacher-profiles?status=DA_DUYET",
            token: _adminToken);
        Expect(emptyStatus == HttpStatusCode.OK,
            $"expected 200 for an empty admin queue, got {(int)emptyStatus}: {emptyBody}");
        using (var emptyJson = JsonDocument.Parse(emptyBody))
        {
            Expect(emptyJson.RootElement.GetProperty("items").GetArrayLength() == 0,
                "empty admin queue returned items");
            Expect(emptyJson.RootElement.GetProperty("total").GetInt32() == 0,
                "empty admin queue returned a non-zero total");
        }

        var query = Uri.EscapeDataString(_firstTeacherStudentEmail!);
        var (listStatus, listBody) = await SendAsync(
            HttpMethod.Get,
            $"/api/admin/teacher-profiles?status=CHO_DUYET&q={query}",
            token: _adminToken);
        Expect(listStatus == HttpStatusCode.OK,
            $"expected 200 for admin list, got {(int)listStatus}: {listBody}");
        var item = SingleItem(listBody, _firstTeacherProfileId);
        Expect(GetString(item, "email") == _firstTeacherStudentEmail,
            "admin queue item does not include the account email");
        Expect(GetString(item, "displayName") == "Giáo viên thử",
            "admin queue item does not include the display name");

        var (detailStatus, detailBody) = await SendAsync(
            HttpMethod.Get, $"/api/admin/teacher-profiles/{_firstTeacherProfileId}", token: _adminToken);
        Expect(detailStatus == HttpStatusCode.OK,
            $"expected 200 for admin detail, got {(int)detailStatus}: {detailBody}");
        using (var detailJson = JsonDocument.Parse(detailBody))
        {
            Expect(detailJson.RootElement.GetProperty("portfolioFiles").GetArrayLength() == 1,
                "admin detail does not include the portfolio image");
            Expect(detailJson.RootElement.GetProperty("history").GetArrayLength() == 1,
                "admin detail does not include the submission history");
        }

        var (approveStatus, approveBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_firstTeacherProfileId}/approve",
            new { note = "Hồ sơ đầy đủ, ảnh đúng chuyên môn." },
            _adminToken);
        Expect(approveStatus == HttpStatusCode.OK,
            $"expected 200 for approval, got {(int)approveStatus}: {approveBody}");
        Expect(EmailCount() >= 2, "approval email was not written to the outbox");
        using (var approveJson = JsonDocument.Parse(approveBody))
        {
            Expect(GetString(approveJson.RootElement, "status") == "DA_DUYET",
                "approval did not return DA_DUYET");
            Expect(GetString(approveJson.RootElement, "role") == "teacher",
                "approval did not return the teacher role");
        }

        await using var db = CreateDb();
        var profile = await db.TeacherProfiles
            .AsNoTracking()
            .SingleAsync(candidate => candidate.Id == _firstTeacherProfileId);
        Expect(profile.Status == TeacherProfileStatus.DaDuyet, "profile was not approved");
        Expect(profile.ReviewedAt is not null, "reviewedAt was not set");
        var user = await db.Users.AsNoTracking().SingleAsync(candidate => candidate.Id == _firstTeacherStudentId);
        Expect(user.Role == UserRole.Teacher, "account role was not promoted to teacher");
        Expect(await db.StatusHistory.CountAsync(entry =>
                entry.ObjectId == profile.Id.ToString() &&
                entry.Status == TeacherProfileStatus.DaDuyet) == 1,
            "approval history was not written");
        Expect(await db.Notifications.CountAsync(notification =>
                notification.UserId == _firstTeacherStudentId &&
                notification.Type == NotificationTypes.HoSoGiaoVien) == 2,
            "approval notification was not written");

        var (oldTokenStatus, oldTokenBody) = await SendAsync(
            HttpMethod.Get, "/api/auth/me", token: _firstTeacherStudentToken);
        Expect(oldTokenStatus == HttpStatusCode.Unauthorized,
            $"old token after approval returned {(int)oldTokenStatus}: {oldTokenBody}");

        var (loginStatus, loginBody) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email = _firstTeacherStudentEmail,
            password = DefaultPassword
        });
        Expect(loginStatus == HttpStatusCode.OK,
            $"teacher login returned {(int)loginStatus}: {loginBody}");
        using (var loginJson = JsonDocument.Parse(loginBody))
        {
            _firstTeacherToken = GetString(loginJson.RootElement, "accessToken");
            Expect(GetString(loginJson.RootElement.GetProperty("user"), "role") == "teacher",
                "new token does not carry the teacher role");
        }

        var (teacherProfileStatus, teacherProfileBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: _firstTeacherToken);
        Expect(teacherProfileStatus == HttpStatusCode.OK,
            $"approved teacher profile read returned {(int)teacherProfileStatus}: {teacherProfileBody}");

        var (againStatus, againBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_firstTeacherProfileId}/approve",
            new { },
            _adminToken);
        Expect(againStatus == HttpStatusCode.Conflict,
            $"expected 409 for repeated approval, got {(int)againStatus}: {againBody}");

        var (rejectApprovedStatus, rejectApprovedBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_firstTeacherProfileId}/reject",
            new { reasonCode = "UNCLEAR_PORTFOLIO", reason = "Ảnh tác phẩm bị mờ, vui lòng tải lại." },
            _adminToken);
        Expect(rejectApprovedStatus == HttpStatusCode.Conflict,
            $"expected 409 for rejecting an approved profile, got {(int)rejectApprovedStatus}: {rejectApprovedBody}");
    }

    private async Task AdminRejectsAndStudentResubmitsAsync()
    {
        var student = await RegisterStudentAsync("teacher-reject");
        _secondTeacherStudentId = student.Id;
        _secondTeacherStudentEmail = student.Email;
        _secondTeacherStudentToken = student.Token;

        var (uploadStatus, uploadBody) = await UploadPortfolioAsync(
            student.Token, TinyPng, "tac-pham.png", "image/png");
        Expect(uploadStatus == HttpStatusCode.Created,
            $"expected 201 for upload, got {(int)uploadStatus}: {uploadBody}");
        using (var uploadJson = JsonDocument.Parse(uploadBody))
        {
            _secondTeacherUploadedPath = GetString(uploadJson.RootElement, "filePath");
        }

        var (submitStatus, submitBody) = await SubmitProfileAsync(
            student.Token,
            new string('C', 60),
            new string('D', 20),
            new[] { _secondTeacherUploadedPath });
        Expect(submitStatus == HttpStatusCode.Accepted,
            $"expected 202, got {(int)submitStatus}: {submitBody}");
        using (var submitJson = JsonDocument.Parse(submitBody))
        {
            _secondTeacherProfileId = submitJson.RootElement.GetProperty("id").GetInt64();
        }

        var (invalidCodeStatus, invalidCodeBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_secondTeacherProfileId}/reject",
            new { reasonCode = "UNKNOWN_CODE", reason = "Ảnh tác phẩm bị mờ, vui lòng tải lại." },
            _adminToken);
        Expect(invalidCodeStatus == HttpStatusCode.BadRequest,
            $"expected 400 for an unknown reason code, got {(int)invalidCodeStatus}: {invalidCodeBody}");

        var (missingReasonStatus, missingReasonBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_secondTeacherProfileId}/reject",
            new { reasonCode = "UNCLEAR_PORTFOLIO", reason = "mờ" },
            _adminToken);
        Expect(missingReasonStatus == HttpStatusCode.BadRequest,
            $"expected 400 for a short reason, got {(int)missingReasonStatus}: {missingReasonBody}");

        const string reason = "Ảnh tác phẩm bị mờ, vui lòng tải lại ảnh rõ hơn.";
        var emailBeforeReject = EmailCount();
        var (rejectStatus, rejectBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_secondTeacherProfileId}/reject",
            new { reasonCode = "UNCLEAR_PORTFOLIO", reason, internalNote = "Đã kiểm tra ảnh." },
            _adminToken);
        Expect(rejectStatus == HttpStatusCode.OK,
            $"expected 200 for rejection, got {(int)rejectStatus}: {rejectBody}");
        Expect(EmailCount() > emailBeforeReject, "rejection email was not written to the outbox");
        using (var rejectJson = JsonDocument.Parse(rejectBody))
        {
            Expect(GetString(rejectJson.RootElement, "status") == "TU_CHOI",
                "rejection did not return TU_CHOI");
            Expect(GetString(rejectJson.RootElement, "rejectionReason") == reason,
                "rejection reason was not returned");
        }

        await using (var db = CreateDb())
        {
            var profile = await db.TeacherProfiles
                .AsNoTracking()
                .SingleAsync(candidate => candidate.Id == _secondTeacherProfileId);
            Expect(profile.Status == TeacherProfileStatus.TuChoi, "profile was not rejected");
            Expect(profile.RejectionReason == reason, "rejection reason was not stored");
            Expect(profile.ReasonCode == "UNCLEAR_PORTFOLIO", "rejection reason code was not stored");
            Expect(profile.InternalNote == "Đã kiểm tra ảnh.", "internal note was not stored");
            Expect(profile.ReviewedAt is not null, "reviewedAt was not set on rejection");
            var user = await db.Users.AsNoTracking()
                .SingleAsync(candidate => candidate.Id == _secondTeacherStudentId);
            Expect(user.Role == UserRole.Student, "rejection changed the account role");
        }

        var (myProfileStatus, myProfileBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: student.Token);
        Expect(myProfileStatus == HttpStatusCode.OK,
            $"rejected profile read returned {(int)myProfileStatus}: {myProfileBody}");
        using (var myProfileJson = JsonDocument.Parse(myProfileBody))
        {
            Expect(GetString(myProfileJson.RootElement, "status") == "TU_CHOI",
                "student cannot see the rejection status");
            Expect(GetString(myProfileJson.RootElement, "rejectionReason") == reason,
                "student cannot see the rejection reason");
        }

        var (authMeStatus, authMeBody) = await SendAsync(
            HttpMethod.Get, "/api/auth/me", token: student.Token);
        Expect(authMeStatus == HttpStatusCode.OK, $"profile check returned {(int)authMeStatus}: {authMeBody}");
        using (var authMeJson = JsonDocument.Parse(authMeBody))
        {
            Expect(GetString(authMeJson.RootElement, "role") == "student",
                "rejection promoted the account");
        }

        var emailBeforeResubmit = EmailCount();
        var (resubmitStatus, resubmitBody) = await SubmitProfileAsync(
            student.Token,
            new string('E', 60),
            new string('F', 20),
            new[] { _secondTeacherUploadedPath });
        Expect(resubmitStatus == HttpStatusCode.Accepted,
            $"expected 202 for resubmission, got {(int)resubmitStatus}: {resubmitBody}");
        Expect(EmailCount() > emailBeforeResubmit, "resubmission email was not written to the outbox");

        var (afterStatus, afterBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: student.Token);
        Expect(afterStatus == HttpStatusCode.OK, $"profile read returned {(int)afterStatus}: {afterBody}");
        using var afterJson = JsonDocument.Parse(afterBody);
        Expect(GetString(afterJson.RootElement, "status") == "CHO_DUYET",
            "resubmission did not return the profile to pending");
        Expect(string.IsNullOrEmpty(GetString(afterJson.RootElement, "rejectionReason")),
            "resubmission did not clear the current rejection reason");
        var history = afterJson.RootElement.GetProperty("history");
        Expect(history.GetArrayLength() == 3,
            $"expected 3 history entries, got {history.GetArrayLength()}");
        Expect(history.EnumerateArray().Any(entry => GetString(entry, "reason") == reason),
            "old rejection reason was not preserved in history");
    }

    private async Task AdminRequestsChangesAndStudentResubmitsAsync()
    {
        var student = await RegisterStudentAsync("teacher-changes");
        _changesStudentId = student.Id;
        _changesStudentEmail = student.Email;
        _changesStudentToken = student.Token;

        var (uploadStatus, uploadBody) = await UploadPortfolioAsync(
            student.Token, TinyPng, "tac-pham.png", "image/png");
        Expect(uploadStatus == HttpStatusCode.Created,
            $"expected 201 for upload, got {(int)uploadStatus}: {uploadBody}");
        using (var uploadJson = JsonDocument.Parse(uploadBody))
        {
            _changesUploadedPath = GetString(uploadJson.RootElement, "filePath");
        }

        var (submitStatus, submitBody) = await SubmitProfileAsync(
            student.Token,
            new string('G', 60),
            new string('H', 20),
            new[] { _changesUploadedPath });
        Expect(submitStatus == HttpStatusCode.Accepted,
            $"expected 202, got {(int)submitStatus}: {submitBody}");
        using (var submitJson = JsonDocument.Parse(submitBody))
        {
            _changesProfileId = submitJson.RootElement.GetProperty("id").GetInt64();
        }

        const string reason = "Thiếu ảnh tác phẩm theo chuyên môn đã chọn.";
        const string internalNote = "Cần kiểm tra lại ảnh.";
        var emailBefore = EmailCount();
        var (changesStatus, changesBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_changesProfileId}/request-changes",
            new
            {
                reasonCode = "MISSING_DOCUMENT",
                reason,
                fields = new[] { "portfolioFiles" },
                internalNote
            },
            _adminToken);
        Expect(changesStatus == HttpStatusCode.OK,
            $"expected 200 for request-changes, got {(int)changesStatus}: {changesBody}");
        using (var changesJson = JsonDocument.Parse(changesBody))
        {
            Expect(GetString(changesJson.RootElement, "status") == "CAN_BO_SUNG",
                "request-changes did not return CAN_BO_SUNG");
            Expect(GetString(changesJson.RootElement, "supplementReason") == reason,
                "request-changes did not return the reason");
            Expect(changesJson.RootElement.GetProperty("fields").GetArrayLength() == 1,
                "request-changes did not return fields");
        }

        Expect(EmailCount() > emailBefore, "request-changes email was not written to the outbox");

        await using (var db = CreateDb())
        {
            var profile = await db.TeacherProfiles
                .AsNoTracking()
                .SingleAsync(candidate => candidate.Id == _changesProfileId);
            Expect(profile.Status == TeacherProfileStatus.CanBoSung, "profile is not CAN_BO_SUNG");
            Expect(profile.SupplementReason == reason, "supplement reason was not stored");
            Expect(profile.ReasonCode == "MISSING_DOCUMENT", "reason code was not stored separately");
            Expect(profile.InternalNote == internalNote, "internal note was not stored separately");
            Expect(profile.FieldsToUpdate?.Contains("portfolioFiles", StringComparison.Ordinal) == true,
                "fields to update were not stored");
            Expect(profile.ReviewedAt is not null, "reviewedAt was not set for CAN_BO_SUNG");
        }

        var (detailStatus, detailBody) = await SendAsync(
            HttpMethod.Get, $"/api/admin/teacher-profiles/{_changesProfileId}", token: _adminToken);
        Expect(detailStatus == HttpStatusCode.OK,
            $"expected 200 for admin detail, got {(int)detailStatus}: {detailBody}");
        using (var detailJson = JsonDocument.Parse(detailBody))
        {
            Expect(GetString(detailJson.RootElement, "internalNote") == internalNote,
                "admin detail does not include the internal note");
            Expect(detailJson.RootElement.GetProperty("fields").GetArrayLength() == 1,
                "admin detail does not include the requested fields");
        }

        var (meStatus, meBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: student.Token);
        Expect(meStatus == HttpStatusCode.OK, $"profile read returned {(int)meStatus}: {meBody}");
        using (var meJson = JsonDocument.Parse(meBody))
        {
            Expect(GetString(meJson.RootElement, "status") == "CAN_BO_SUNG",
                "owner cannot see CAN_BO_SUNG");
            Expect(GetString(meJson.RootElement, "supplementReason") == reason,
                "owner cannot see the supplement reason");
            Expect(meJson.RootElement.GetProperty("fields").GetArrayLength() == 1,
                "owner cannot see the requested fields");
            Expect(!meJson.RootElement.TryGetProperty("internalNote", out _),
                "internal note leaked to the owner");
        }

        var emailBeforeResubmit = EmailCount();
        var (resubmitStatus, resubmitBody) = await SubmitProfileAsync(
            student.Token,
            new string('I', 60),
            new string('J', 20),
            new[] { _changesUploadedPath });
        Expect(resubmitStatus == HttpStatusCode.Accepted,
            $"expected 202 for resubmission, got {(int)resubmitStatus}: {resubmitBody}");
        Expect(EmailCount() > emailBeforeResubmit, "resubmission email was not written to the outbox");

        await using (var db = CreateDb())
        {
            var profile = await db.TeacherProfiles
                .AsNoTracking()
                .SingleAsync(candidate => candidate.Id == _changesProfileId);
            Expect(profile.Status == TeacherProfileStatus.ChoDuyet, "profile did not return to pending");
            Expect(profile.SupplementReason is null, "supplement reason was not cleared");
            Expect(profile.ReasonCode is null, "reason code was not cleared");
            Expect(profile.InternalNote is null, "internal note was not cleared");
            Expect(profile.FieldsToUpdate is null, "fields were not cleared");
        }

        var (afterStatus, afterBody) = await SendAsync(
            HttpMethod.Get, "/api/teacher/profile/me", token: student.Token);
        Expect(afterStatus == HttpStatusCode.OK, $"profile read returned {(int)afterStatus}: {afterBody}");
        using var afterJson = JsonDocument.Parse(afterBody);
        Expect(GetString(afterJson.RootElement, "status") == "CHO_DUYET",
            "resubmission did not return to pending");
        var history = afterJson.RootElement.GetProperty("history");
        Expect(history.GetArrayLength() == 3, $"expected 3 history entries, got {history.GetArrayLength()}");
        var changesEntry = history.EnumerateArray()
            .First(entry => GetString(entry, "status") == "CAN_BO_SUNG");
        Expect(GetString(changesEntry, "reason") == reason, "history lost the supplement reason");
        Expect(GetString(changesEntry, "reasonCode") == "MISSING_DOCUMENT", "history lost the reason code");
        Expect(changesEntry.GetProperty("fields").GetArrayLength() == 1, "history lost the requested fields");
    }

    private async Task SignedPortfolioUrlsAsync()
    {
        var (status, body) = await SendAsync(
            HttpMethod.Post,
            $"/api/teacher/profile/me/portfolio/{_firstTeacherImageId}/signed-url",
            token: _firstTeacherToken);
        Expect(status == HttpStatusCode.OK,
            $"expected 200 for owner signed URL, got {(int)status}: {body}");
        using var json = JsonDocument.Parse(body);
        var url = GetString(json.RootElement, "url");
        Expect(url.StartsWith("/api/teacher-docs/", StringComparison.Ordinal),
            "signed URL does not point to the document endpoint");
        Expect(DateTimeOffset.TryParse(GetString(json.RootElement, "expiresAt"), out var expiresAt),
            "signed URL expiry is missing");
        var remaining = expiresAt - DateTimeOffset.UtcNow;
        Expect(remaining > TimeSpan.FromMinutes(4) && remaining < TimeSpan.FromMinutes(6),
            "signed URL is not valid for about five minutes");

        var (downloadStatus, _) = await SendAsync(HttpMethod.Get, url);
        Expect(downloadStatus == HttpStatusCode.OK,
            $"signed URL download returned {(int)downloadStatus}");

        var tampered = url[..^1] + (url[^1] == 'A' ? 'B' : 'A');
        var (tamperedStatus, _) = await SendAsync(HttpMethod.Get, tampered);
        Expect(tamperedStatus == HttpStatusCode.Unauthorized,
            $"tampered signed URL returned {(int)tamperedStatus}");

        var (otherStatus, otherBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/teacher/profile/me/portfolio/{_firstTeacherImageId}/signed-url",
            token: _secondTeacherStudentToken);
        Expect(otherStatus == HttpStatusCode.NotFound,
            $"another user got a signed URL: {(int)otherStatus}: {otherBody}");

        var (adminStatus, adminBody) = await SendAsync(
            HttpMethod.Post,
            $"/api/admin/teacher-profiles/{_firstTeacherProfileId}/portfolio/{_firstTeacherImageId}/signed-url",
            token: _adminToken);
        Expect(adminStatus == HttpStatusCode.OK,
            $"expected 200 for admin signed URL, got {(int)adminStatus}: {adminBody}");
        using var adminJson = JsonDocument.Parse(adminBody);
        var adminUrl = GetString(adminJson.RootElement, "url");
        var (adminDownloadStatus, _) = await SendAsync(HttpMethod.Get, adminUrl);
        Expect(adminDownloadStatus == HttpStatusCode.OK,
            $"admin signed URL download returned {(int)adminDownloadStatus}");

        using var loggerFactory = LoggerFactory.Create(_ => { });
        var service = new SignedUrlService(
            new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SIGNED_URL_KEY"] = "unit-test-signing-key-with-at-least-32-bytes"
            }).Build(),
            loggerFactory.CreateLogger<SignedUrlService>());
        var expired = service.CreateToken(42, Guid.NewGuid(), DateTimeOffset.UtcNow.AddSeconds(-1));
        Expect(!service.TryValidate(expired, 42, out _, out _), "expired signed token was accepted");
    }

    private static async Task SupabaseStorageRequestsAsync()
    {
        var configuration = new ConfigurationBuilder().AddInMemoryCollection(new Dictionary<string, string?>
        {
            ["SUPABASE_URL"] = "https://supabase.example",
            ["SUPABASE_SERVICE_ROLE_KEY"] = "service-key",
            ["SUPABASE_STORAGE_BUCKET"] = "teacher-docs"
        }).Build();

        var factory = new FakeClientFactory(request =>
        {
            Expect(request.Headers.Authorization?.Parameter == "service-key",
                "storage bearer token is missing");
            var path = request.RequestUri!.AbsolutePath;
            if (request.Method == HttpMethod.Post &&
                path.StartsWith("/storage/v1/object/sign/teacher-docs/", StringComparison.Ordinal))
            {
                var body = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
                Expect(body.Contains("\"expiresIn\":300", StringComparison.Ordinal),
                    "signed URL lifetime is not five minutes");
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = JsonContent.Create(new
                    {
                        signedURL = "/object/sign/teacher-docs/abc.png?token=xyz"
                    })
                };
            }

            if (request.Method == HttpMethod.Post)
            {
                Expect(path.StartsWith("/storage/v1/object/teacher-docs/", StringComparison.Ordinal),
                    "upload path does not use the configured bucket");
                Expect(
                    request.Headers.TryGetValues("x-upsert", out var values) && values.Single() == "false",
                    "x-upsert header is missing");
                return new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(Array.Empty<byte>())
                };
            }

            if (request.Method == HttpMethod.Head)
            {
                Expect(path.StartsWith("/storage/v1/object/teacher-docs/", StringComparison.Ordinal),
                    "HEAD path does not use the configured bucket");
                var response = new HttpResponseMessage(HttpStatusCode.OK)
                {
                    Content = new ByteArrayContent(Array.Empty<byte>())
                };
                response.Content.Headers.ContentLength = TinyPng.Length;
                response.Content.Headers.ContentType = new MediaTypeHeaderValue("image/png");
                return response;
            }

            if (request.Method == HttpMethod.Get)
            {
                Expect(path.StartsWith("/storage/v1/object/teacher-docs/", StringComparison.Ordinal),
                    "GET path does not use the configured bucket");
                return new HttpResponseMessage(HttpStatusCode.PartialContent)
                {
                    Content = new ByteArrayContent(TinyPng)
                };
            }

            throw new InvalidOperationException("Unexpected Supabase Storage request.");
        });

        using var loggerFactory = LoggerFactory.Create(_ => { });
        var storage = new SupabasePortfolioStorage(
            factory,
            configuration,
            loggerFactory.CreateLogger<SupabasePortfolioStorage>());
        using var stream = new MemoryStream(TinyPng);
        var file = new FormFile(stream, 0, TinyPng.Length, "file", "tac-pham.png")
        {
            Headers = new HeaderDictionary(),
            ContentType = "image/png"
        };

        var upload = await storage.SaveAsync(file, default);
        Expect(upload.Success, upload.Message ?? "Supabase upload failed");
        var path = upload.File!.FilePath;
        Expect(path.EndsWith(".png", StringComparison.Ordinal), "storage path extension is missing");

        var validation = await storage.ValidateAsync(path, default);
        Expect(validation.Success, validation.Message ?? "Supabase validation failed");

        var signed = await storage.CreateSignedUrlAsync(
            1, Guid.NewGuid(), path, TimeSpan.FromMinutes(5), default);
        Expect(signed is not null, "signed URL was not created");
        Expect(
            signed!.Url.StartsWith("https://supabase.example/storage/v1/object/sign/", StringComparison.Ordinal),
            "signed URL has the wrong base");
    }

    private async Task TeacherProfilePermissionsAsync()
    {
        var (teacherSubmitStatus, teacherSubmitBody) = await SubmitProfileAsync(
            _firstTeacherToken!,
            new string('A', 60),
            new string('B', 20),
            Array.Empty<string>());
        Expect(teacherSubmitStatus == HttpStatusCode.Conflict,
            $"expected 409 for an approved teacher submit, got {(int)teacherSubmitStatus}: {teacherSubmitBody}");

        var (studentAdminStatus, studentAdminBody) = await SendAsync(
            HttpMethod.Get, "/api/admin/teacher-profiles", token: _secondTeacherStudentToken);
        Expect(studentAdminStatus == HttpStatusCode.Forbidden,
            $"expected 403 for a student admin queue request, got {(int)studentAdminStatus}: {studentAdminBody}");

        var (otherDownloadStatus, _) = await SendAsync(
            HttpMethod.Get,
            $"/api/teacher/profile/me/portfolio/{_firstTeacherImageId}",
            token: _secondTeacherStudentToken);
        Expect(otherDownloadStatus == HttpStatusCode.NotFound,
            $"another user downloaded a private image: {(int)otherDownloadStatus}");

        var (ownerDownloadStatus, _) = await SendAsync(
            HttpMethod.Get,
            $"/api/teacher/profile/me/portfolio/{_firstTeacherImageId}",
            token: _firstTeacherToken);
        Expect(ownerDownloadStatus == HttpStatusCode.OK,
            $"owner download returned {(int)ownerDownloadStatus}");

        var (adminDownloadStatus, adminDownloadBody) = await SendAsync(
            HttpMethod.Get,
            $"/api/admin/teacher-profiles/{_firstTeacherProfileId}/portfolio/{_firstTeacherImageId}",
            token: _adminToken);
        Expect(adminDownloadStatus == HttpStatusCode.OK,
            $"admin download returned {(int)adminDownloadStatus}: {adminDownloadBody}");
    }

    private async Task PortfolioUploadValidationAsync()
    {
        var student = await RegisterStudentAsync("teacher-upload");

        var (invalidTypeStatus, invalidTypeBody) = await UploadPortfolioAsync(
            student.Token,
            Encoding.UTF8.GetBytes("not an image"),
            "fake.png",
            "image/png");
        Expect((int)invalidTypeStatus == 415,
            $"expected 415 for an invalid image, got {(int)invalidTypeStatus}: {invalidTypeBody}");

        var oversize = new byte[10 * 1024 * 1024 + 1];
        TinyPng.CopyTo(oversize, 0);
        var (oversizeStatus, oversizeBody) = await UploadPortfolioAsync(
            student.Token, oversize, "big.png", "image/png");
        Expect((int)oversizeStatus == 413,
            $"expected 413 for an oversized image, got {(int)oversizeStatus}: {oversizeBody}");

        var (validStatus, validBody) = await UploadPortfolioAsync(
            student.Token, TinyPng, "ok.png", "image/png");
        Expect(validStatus == HttpStatusCode.Created,
            $"expected 201 for a valid image, got {(int)validStatus}: {validBody}");
    }

    private async Task<(Guid Id, string Email, string Token)> RegisterStudentAsync(string prefix)
    {
        var email = $"{prefix}-{Guid.NewGuid():N}@example.com";
        var (registerStatus, registerBody) = await SendAsync(HttpMethod.Post, "/api/auth/register", new
        {
            email,
            displayName = "Giáo viên thử",
            password = DefaultPassword
        });
        Expect(registerStatus == HttpStatusCode.Created,
            $"register returned {(int)registerStatus}: {registerBody}");
        Guid id;
        using (var registerJson = JsonDocument.Parse(registerBody))
        {
            id = Guid.Parse(GetString(registerJson.RootElement, "id"));
        }

        var (loginStatus, loginBody) = await SendAsync(HttpMethod.Post, "/api/auth/login", new
        {
            email,
            password = DefaultPassword
        });
        Expect(loginStatus == HttpStatusCode.OK,
            $"login returned {(int)loginStatus}: {loginBody}");
        using var loginJson = JsonDocument.Parse(loginBody);
        return (id, email, GetString(loginJson.RootElement, "accessToken"));
    }

    private Task<(HttpStatusCode Status, string Body)> SubmitProfileAsync(
        string token,
        string introduction,
        string experience,
        IEnumerable<string> portfolioFiles) =>
        SendAsync(
            HttpMethod.Post,
            "/api/teacher/profile/me/submit",
            new { introduction, experience, portfolioFiles },
            token);

    private async Task<(HttpStatusCode Status, string Body)> UploadPortfolioAsync(
        string token,
        byte[] content,
        string fileName,
        string contentType)
    {
        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(content);
        file.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(file, "file", fileName);

        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/teacher/profile/me/portfolio")
        {
            Content = form
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        using var response = await client.SendAsync(request);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    private long _courseId;
    private object CoursePayload(string title = "Digital art foundation") => new {
        tieu_de = title, mo_ta = new string('A', 60), cap_do = "CO_BAN", chu_de = "Digital Art",
        anh_dai_dien = "", ma_giao_vien = Guid.NewGuid(), trang_thai = "DA_DANG"
    };

    private async Task CourseAccessAsync()
    {
        var student = await RegisterStudentAsync("course-student");
        var (anonymous, _) = await SendAsync(HttpMethod.Post, "/api/courses", CoursePayload());
        Expect(anonymous == HttpStatusCode.Unauthorized, "anonymous created a course");
        var (forbidden, _) = await SendAsync(HttpMethod.Post, "/api/courses", CoursePayload(), student.Token);
        Expect(forbidden == HttpStatusCode.Forbidden, "student created a course");
        var (invalid, _) = await SendAsync(HttpMethod.Post, "/api/courses", CoursePayload(" "), _firstTeacherToken);
        Expect(invalid == HttpStatusCode.BadRequest, "blank title accepted");
        var (created, body) = await SendAsync(HttpMethod.Post, "/api/courses", CoursePayload(), _firstTeacherToken);
        Expect(created == HttpStatusCode.Created, $"create returned {(int)created}: {body}");
        using (var json = JsonDocument.Parse(body)) {
            _courseId = json.RootElement.GetProperty("ma_khoa_hoc").GetInt64();
            Expect(GetString(json.RootElement, "trang_thai") == "NHAP", "client selected the course status");
            Expect(GetString(json.RootElement, "ma_giao_vien") == _firstTeacherStudentId.ToString(), "client selected the course owner");
        }
        var (hidden, _) = await SendAsync(HttpMethod.Get, $"/api/courses/{_courseId}");
        Expect(hidden == HttpStatusCode.NotFound, "anonymous read a draft");
        var (mineStatus, _) = await SendAsync(HttpMethod.Get, "/api/courses?mine=true");
        Expect(mineStatus == HttpStatusCode.Unauthorized, "anonymous used mine filter");
        var (listStatus, listBody) = await SendAsync(HttpMethod.Get, "/api/courses?search=FOUNDATION&pageSize=1", token: _firstTeacherToken);
        Expect(listStatus == HttpStatusCode.OK, $"SQLite search failed: {listBody}");
        using (var list = JsonDocument.Parse(listBody)) Expect(list.RootElement.GetProperty("totalCount").GetInt32() == 1, "search/pagination lost canonical course");
        var (otherOwner, _) = await SendAsync(HttpMethod.Put, $"/api/courses/{_courseId}", CoursePayload(), _adminToken);
        Expect(otherOwner == HttpStatusCode.NotFound, "non-owner edited teacher draft");
        var (saved, saveBody) = await SendAsync(HttpMethod.Put, $"/api/courses/{_courseId}", CoursePayload("Updated digital art foundation"), _firstTeacherToken);
        Expect(saved == HttpStatusCode.OK, $"owner update failed: {saveBody}");
        await using var db = CreateDb();
        Expect(await db.LearningCourses.AnyAsync(item => item.Id == _courseId && item.Status == "NHAP"), "course was not stored in khoa_hoc");
        Expect(!await db.Courses.AnyAsync(), "new course was written to legacy courses");
    }

    private async Task CourseWorkflowAsync()
    {
        var (submitted, submitBody) = await SendAsync(HttpMethod.Post, $"/api/courses/{_courseId}/submit", token: _firstTeacherToken);
        Expect(submitted == HttpStatusCode.OK, $"submit failed: {submitBody}");
        var (locked, _) = await SendAsync(HttpMethod.Put, $"/api/courses/{_courseId}", CoursePayload(), _firstTeacherToken);
        Expect(locked == HttpStatusCode.Conflict, "pending course was editable");
        var (forbidden, _) = await SendAsync(HttpMethod.Post, $"/api/admin/courses/{_courseId}/approve", token: _firstTeacherToken);
        Expect(forbidden == HttpStatusCode.Forbidden, "teacher approved their course");
        var (badReason, _) = await SendAsync(HttpMethod.Post, $"/api/admin/courses/{_courseId}/reject", new { reason = "" }, _adminToken);
        Expect(badReason == HttpStatusCode.BadRequest, "rejection without reason accepted");
        var (rejected, _) = await SendAsync(HttpMethod.Post, $"/api/admin/courses/{_courseId}/reject", new { reason = "Please expand the course description." }, _adminToken);
        Expect(rejected == HttpStatusCode.OK, "admin could not return course to draft");
        var (resubmit, _) = await SendAsync(HttpMethod.Post, $"/api/courses/{_courseId}/submit", token: _firstTeacherToken);
        Expect(resubmit == HttpStatusCode.OK, "rejected course could not resubmit");
        var (approved, approveBody) = await SendAsync(HttpMethod.Post, $"/api/admin/courses/{_courseId}/approve", token: _adminToken);
        Expect(approved == HttpStatusCode.OK, $"approval failed: {approveBody}");
        var (duplicate, _) = await SendAsync(HttpMethod.Post, $"/api/admin/courses/{_courseId}/approve", token: _adminToken);
        Expect(duplicate == HttpStatusCode.Conflict, "duplicate approval succeeded");
        var (published, _) = await SendAsync(HttpMethod.Get, $"/api/courses/{_courseId}");
        Expect(published == HttpStatusCode.OK, "published course was not public");
        await using var db = CreateDb();
        Expect((await db.LearningCourses.SingleAsync(item => item.Id == _courseId)).Status == "DA_DANG", "wrong persisted status");
        Expect(await db.StatusHistory.CountAsync(item => item.ObjectType == "KHOA_HOC" && item.ObjectId == _courseId.ToString()) == 4, "missing or duplicated course history");
        Expect(await db.Notifications.CountAsync(item => item.Type == "KHOA_HOC" && item.UserId == _firstTeacherStudentId) == 2, "missing or duplicated course notifications");
    }

    private async Task ProgressD05Async()
    {
        long lessonId;
        long assignmentId;
        await using (var db = CreateDb())
        {
            try
            {
                // The legacy SQLite harness does not run the Supabase canonical
                // learner-content schema. Create the same child tables locally so
                // this smoke test exercises the API/D05 rule without touching a
                // shared database.
                await db.Database.ExecuteSqlRawAsync("""
                    create table if not exists chuong (
                      ma_chuong integer primary key autoincrement,
                      ma_khoa_hoc integer not null,
                      tieu_de text not null,
                      thu_tu integer not null
                    );
                    create table if not exists bai_hoc (
                      ma_bai_hoc integer primary key autoincrement,
                      ma_chuong integer not null,
                      tieu_de text not null,
                      thu_tu integer not null,
                      noi_dung_van_ban text,
                      duong_dan_anh text,
                      lien_ket_video text,
                      bat_buoc integer not null default 1
                    );
                    create table if not exists ghi_danh (
                      ma_nguoi_dung text not null,
                      ma_khoa_hoc integer not null,
                      trang_thai text not null,
                      ngay_ghi_danh text not null,
                      ngay_hoan_thanh text,
                      primary key (ma_nguoi_dung, ma_khoa_hoc)
                    );
                    create table if not exists tien_do_bai_hoc (
                      ma_nguoi_dung text not null,
                      ma_bai_hoc integer not null,
                      trang_thai text not null,
                      ngay_bat_dau text,
                      ngay_hoan_thanh text,
                      primary key (ma_nguoi_dung, ma_bai_hoc)
                    );
                    """);
                var chapter = new CourseChapter { CourseId = _courseId, Title = "Chương tiến độ", Order = 1 };
                db.CourseChapters.Add(chapter);
                await db.SaveChangesAsync();
                var lesson = new CourseLesson
                {
                    ChapterId = chapter.Id, Title = "Bài bắt buộc", Order = 1, Required = true
                };
                db.CourseLessons.Add(lesson);
                await db.SaveChangesAsync();
                var assignment = new Assignment
                {
                    LessonId = lesson.Id, Prompt = "Vẽ bài luyện tập", Required = true
                };
                db.Assignments.Add(assignment);
                await db.SaveChangesAsync();
                lessonId = lesson.Id;
                assignmentId = assignment.Id;
            }
            catch (Exception exception)
            {
                throw new InvalidOperationException(
                    $"could not seed progress content: {exception.InnerException?.Message ?? exception.Message}",
                    exception);
            }
        }

        var student = await RegisterStudentAsync("progress-d05");
        var (enrollStatus, enrollBody) = await SendAsync(
            HttpMethod.Post, $"/api/courses/{_courseId}/enroll", token: student.Token);
        Expect(enrollStatus == HttpStatusCode.OK, $"enroll returned {(int)enrollStatus}: {enrollBody}");

        var (beforeStatus, beforeBody) = await SendAsync(
            HttpMethod.Get, $"/api/progress?courseId={_courseId}", token: student.Token);
        Expect(beforeStatus == HttpStatusCode.OK, $"progress returned {(int)beforeStatus}: {beforeBody}");
        using (var before = JsonDocument.Parse(beforeBody))
        {
            var root = before.RootElement;
            Expect(root.GetProperty("requiredLessons").GetInt32() == 1, "required lesson count is wrong");
            Expect(root.GetProperty("completedRequiredLessons").GetInt32() == 0, "lesson started completed");
            Expect(root.GetProperty("requiredAssignments").GetInt32() == 1, "required assignment count is wrong");
            Expect(root.GetProperty("submittedRequiredAssignments").GetInt32() == 0, "submission was counted early");
            Expect(!root.GetProperty("completed").GetBoolean(), "course completed before required work");
        }

        var (lessonStatus, lessonBody) = await SendAsync(
            HttpMethod.Put,
            $"/api/courses/{_courseId}/lessons/{lessonId}/progress",
            new { trang_thai = "DA_HOAN_THANH" },
            student.Token);
        Expect(lessonStatus == HttpStatusCode.OK, $"lesson progress returned {(int)lessonStatus}: {lessonBody}");

        var (lessonsDoneStatus, lessonsDoneBody) = await SendAsync(
            HttpMethod.Get, $"/api/progress?courseId={_courseId}", token: student.Token);
        Expect(lessonsDoneStatus == HttpStatusCode.OK, $"progress returned {(int)lessonsDoneStatus}: {lessonsDoneBody}");
        using (var lessonsDone = JsonDocument.Parse(lessonsDoneBody))
        {
            var root = lessonsDone.RootElement;
            Expect(root.GetProperty("lessonPercent").GetInt32() == 100, "lesson percent is not 100");
            Expect(!root.GetProperty("completed").GetBoolean(), "course completed without required submission");
        }

        using var form = new MultipartFormDataContent();
        var file = new ByteArrayContent(TinyPng);
        file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
        form.Add(file, "file", "progress.png");
        using var request = new HttpRequestMessage(
            HttpMethod.Post, $"/api/assignments/{assignmentId}/submission")
        {
            Content = form
        };
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", student.Token);
        using var submitResponse = await client.SendAsync(request);
        var submitBody = await submitResponse.Content.ReadAsStringAsync();
        Expect(submitResponse.StatusCode == HttpStatusCode.OK,
            $"submission returned {(int)submitResponse.StatusCode}: {submitBody}");

        var (afterStatus, afterBody) = await SendAsync(
            HttpMethod.Get, $"/api/progress?courseId={_courseId}", token: student.Token);
        Expect(afterStatus == HttpStatusCode.OK, $"progress returned {(int)afterStatus}: {afterBody}");
        using (var after = JsonDocument.Parse(afterBody))
        {
            var root = after.RootElement;
            Expect(root.GetProperty("submittedRequiredAssignments").GetInt32() == 1,
                "required submission was not counted");
            Expect(root.GetProperty("gradedRequiredAssignments").GetInt32() == 0,
                "test unexpectedly graded the submission");
            Expect(root.GetProperty("completed").GetBoolean(),
                "course did not complete after required submission without grading");
            Expect(GetString(root, "enrollmentStatus") == "HOAN_THANH",
                "enrollment status did not become HOAN_THANH");
        }

        await using (var db = CreateDb())
        {
            var enrollment = await db.CourseEnrollments.SingleAsync(item =>
                item.UserId == student.Id && item.CourseId == _courseId);
            Expect(enrollment.Status == "HOAN_THANH", "database enrollment is not HOAN_THANH");
            Expect(enrollment.CompletedAt is not null, "completion timestamp is missing");
            Expect(!await db.Grades.AnyAsync(), "grading was required by the completion test");
        }
    }

    private static JsonElement SingleItem(string body, long expectedId)
    {
        using var json = JsonDocument.Parse(body);
        var items = json.RootElement.GetProperty("items");
        Expect(items.GetArrayLength() == 1, $"expected 1 queue item, got {items.GetArrayLength()}");
        var item = items[0];
        Expect(item.GetProperty("id").GetInt64() == expectedId, "queue item has the wrong id");
        return item.Clone();
    }

    private static long FirstPortfolioImageId(JsonElement profile)
    {
        var files = profile.GetProperty("portfolioFiles");
        Expect(files.GetArrayLength() > 0, "portfolio files are missing");
        return files[0].GetProperty("id").GetInt64();
    }

    private int EmailCount() =>
        Directory.Exists(emailPath) ? Directory.GetFiles(emailPath, "*.txt").Length : 0;

    private AppDbContext CreateDb()
    {
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite($"Data Source={dbPath}")
            .Options;
        return new AppDbContext(options);
    }

    private async Task<(HttpStatusCode Status, string Body)> SendAsync(
        HttpMethod method,
        string path,
        object? body = null,
        string? token = null)
    {
        using var request = new HttpRequestMessage(method, path);
        if (body is not null)
        {
            request.Content = JsonContent.Create(body);
        }

        if (!string.IsNullOrWhiteSpace(token))
        {
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        }

        using var response = await client.SendAsync(request);
        return (response.StatusCode, await response.Content.ReadAsStringAsync());
    }

    private static string GetString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) ? value.GetString() ?? string.Empty : string.Empty;

    private static string Detail(string body)
    {
        using var json = JsonDocument.Parse(body);
        return GetString(json.RootElement, "detail");
    }

    private static void Expect(bool condition, string message)
    {
        if (!condition)
        {
            throw new InvalidOperationException(message);
        }
    }
}
