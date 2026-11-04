using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.Json;
using Linea.Api.Data;
using Linea.Api.Services;
using Linea.Api.Security;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
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
        var port = GetFreePort();
        var baseUrl = $"http://127.0.0.1:{port}";
        var logs = new StringBuilder();

        using var apiProcess = StartApi(apiProject, port, dbPath);
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

            var suite = new SmokeSuite(client, dbPath);
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

    private static Process StartApi(string apiProject, int port, string dbPath)
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
        startInfo.Environment["SUPABASE_DB_URL"] = string.Empty;
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

internal sealed class SmokeSuite(HttpClient client, string dbPath)
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
            ("admin cannot lock their own account", SelfLockAsync)
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
