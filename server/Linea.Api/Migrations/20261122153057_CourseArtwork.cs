using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations
{
    /// <inheritdoc />
    public partial class CourseArtwork : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<List<string>>(
                name: "anh_giang_vien",
                table: "khoa_hoc",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.AddColumn<List<string>>(
                name: "anh_hoc_vien",
                table: "khoa_hoc",
                type: "text[]",
                nullable: false,
                defaultValueSql: "'{}'::text[]");

            migrationBuilder.Sql("""
                alter table public.khoa_hoc
                    add constraint khoa_hoc_anh_giang_vien_limit check (cardinality(anh_giang_vien) <= 5),
                    add constraint khoa_hoc_anh_hoc_vien_limit check (cardinality(anh_hoc_vien) <= 5);
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "anh_giang_vien",
                table: "khoa_hoc");

            migrationBuilder.DropColumn(
                name: "anh_hoc_vien",
                table: "khoa_hoc");
        }
    }
}
