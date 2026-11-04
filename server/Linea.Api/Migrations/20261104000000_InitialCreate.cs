using System;
using Linea.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261104000000_InitialCreate")]
public partial class InitialCreate : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "users",
            columns: table => new
            {
                Id = table.Column<Guid>(nullable: false),
                Email = table.Column<string>(maxLength: 254, nullable: false),
                DisplayName = table.Column<string>(maxLength: 100, nullable: true),
                PasswordHash = table.Column<string>(maxLength: 255, nullable: true),
                Role = table.Column<string>(maxLength: 16, nullable: false, defaultValue: "Student"),
                IsLocked = table.Column<bool>(nullable: false),
                CreatedAt = table.Column<DateTimeOffset>(nullable: false),
                UpdatedAt = table.Column<DateTimeOffset>(nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_users", x => x.Id);
            });

        migrationBuilder.CreateIndex(
            name: "IX_users_Email",
            table: "users",
            column: "Email",
            unique: true);

        if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            migrationBuilder.Sql("ALTER TABLE \"users\" ENABLE ROW LEVEL SECURITY;");
            migrationBuilder.Sql("REVOKE ALL ON TABLE \"users\" FROM anon, authenticated;");
        }
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "users");
    }
}
