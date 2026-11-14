using Npgsql;

namespace Linea.Api.Data;

public static class DatabaseConfiguration
{
    public static string GetConnectionString(IConfiguration configuration)
    {
        var url = configuration["SUPABASE_DB_URL"];
        if (string.IsNullOrWhiteSpace(url))
            throw new InvalidOperationException("SUPABASE_DB_URL is required. Set the PostgreSQL URL in .env or the environment.");
        return BuildPostgresConnectionString(url.Trim());
    }

    public static string BuildPostgresConnectionString(string url)
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

    public static void LoadDotEnvFile()
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
}
