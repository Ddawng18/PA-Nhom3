using Linea.Api.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations;

[DbContext(typeof(AppDbContext))]
[Migration("20261104010000_MakePasswordHashRequired")]
public partial class MakePasswordHashRequired : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // Fresh databases already create PasswordHash as NOT NULL. This operation
        // tightens existing PostgreSQL/Supabase databases; SQLite dev databases
        // are disposable and are recreated from the initial migration.
        if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "users",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldMaxLength: 255,
                oldNullable: true);
        }
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
        {
            migrationBuilder.AlterColumn<string>(
                name: "PasswordHash",
                table: "users",
                maxLength: 255,
                nullable: true,
                oldClrType: typeof(string),
                oldMaxLength: 255,
                oldNullable: false);
        }
    }
}
