using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Linea.Api.Data;

public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        DatabaseConfiguration.LoadDotEnvFile();
        var configuration = new ConfigurationBuilder()
            .AddEnvironmentVariables()
            .Build();
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql(DatabaseConfiguration.GetConnectionString(configuration))
            .Options;

        return new AppDbContext(options);
    }
}
