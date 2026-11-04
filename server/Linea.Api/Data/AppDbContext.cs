using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var user = modelBuilder.Entity<User>();

        user.ToTable("users");
        user.HasKey(item => item.Id);

        user.Property(item => item.Email)
            .HasMaxLength(254)
            .IsRequired();
        user.HasIndex(item => item.Email).IsUnique();

        user.Property(item => item.DisplayName).HasMaxLength(100);
        user.Property(item => item.PasswordHash)
            .HasMaxLength(255)
            .IsRequired();

        user.Property(item => item.Role)
            .HasConversion<string>()
            .HasMaxLength(16)
            .IsRequired()
            .HasDefaultValue(UserRole.Student);

        user.Property(item => item.CreatedAt).IsRequired();
        user.Property(item => item.UpdatedAt).IsRequired();
    }
}
