using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations;

/// <summary>
/// Aligns the EF snapshot with the PostgreSQL model. This migration does not
/// assert that an existing database has the required schema; prior migrations
/// and separately managed Supabase SQL still have to be reconciled explicitly.
/// </summary>
public partial class AlignPostgresModelSnapshot : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) { }

    protected override void Down(MigrationBuilder migrationBuilder) { }
}
