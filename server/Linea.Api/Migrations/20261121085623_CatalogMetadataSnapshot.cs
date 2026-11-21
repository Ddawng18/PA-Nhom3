using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations
{
    /// <inheritdoc />
    public partial class CatalogMetadataSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Supabase may have already applied these columns separately.
            migrationBuilder.Sql("""
                alter table public.khoa_hoc add column if not exists thoi_luong varchar(50);
                alter table public.khoa_hoc add column if not exists ngay_khai_giang date;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Preserve any catalog data managed by the Supabase migration.
        }
    }
}
