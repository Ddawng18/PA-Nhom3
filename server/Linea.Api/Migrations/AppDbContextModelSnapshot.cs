using System;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;

#nullable disable

namespace Linea.Api.Migrations;

[DbContext(typeof(AppDbContext))]
internal sealed class AppDbContextModelSnapshot : ModelSnapshot
{
    protected override void BuildModel(ModelBuilder modelBuilder)
    {
        modelBuilder.HasAnnotation("ProductVersion", "9.0.22");

        modelBuilder.Entity("Linea.Api.Models.User", builder =>
        {
            builder.Property<Guid>("Id")
                .ValueGeneratedOnAdd();

            builder.Property<DateTimeOffset>("CreatedAt");

            builder.Property<string>("DisplayName")
                .HasMaxLength(100);

            builder.Property<string>("Email")
                .IsRequired()
                .HasMaxLength(254);

            builder.Property<bool>("IsLocked");

            builder.Property<string>("PasswordHash")
                .IsRequired()
                .HasMaxLength(255);

            builder.Property<string>("Role")
                .IsRequired()
                .HasMaxLength(16)
                .HasDefaultValue("Student");

            builder.Property<DateTimeOffset>("UpdatedAt");

            builder.HasKey("Id");

            builder.HasIndex("Email")
                .IsUnique();

            builder.ToTable("users");
        });
    }
}
