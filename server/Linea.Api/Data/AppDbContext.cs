using Linea.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Linea.Api.Data;

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<User> Users => Set<User>();
    public DbSet<Course> Courses => Set<Course>();

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

        var course = modelBuilder.Entity<Course>();
        course.ToTable("courses");
        course.HasKey(item => item.Id);
        course.Property(item => item.Name).HasMaxLength(200).IsRequired();
        course.Property(item => item.Description).HasMaxLength(4000);
        course.Property(item => item.CoverImageUrl).HasMaxLength(1000);
        course.Property(item => item.Status).HasConversion<string>().HasMaxLength(20).IsRequired();
        course.Property(item => item.OwnerId).HasMaxLength(255).IsRequired();
        course.HasIndex(item => item.OwnerId);
        course.HasIndex(item => item.Status);
        course.Property(item => item.CreatedAt).HasDefaultValueSql("timezone('utc', now())");
        course.Property(item => item.UpdatedAt).HasDefaultValueSql("timezone('utc', now())");
    }
}
