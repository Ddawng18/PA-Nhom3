using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations
{
    /// <inheritdoc />
    public partial class TeacherApplicationDetailsAndCv : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "chuyen_mon",
                table: "ho_so_giao_vien",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ngon_ngu",
                table: "ho_so_giao_vien",
                type: "character varying(160)",
                maxLength: 160,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "phuong_phap",
                table: "ho_so_giao_vien",
                type: "character varying(1500)",
                maxLength: 1500,
                nullable: true);

            migrationBuilder.AddColumn<string[]>(
                name: "cv_tags",
                table: "ho_so_giao_vien",
                type: "text[]",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "cv_ho_so_giao_vien",
                columns: table => new
                {
                    ma_ho_so = table.Column<long>(type: "bigint", nullable: false),
                    noi_dung = table.Column<byte[]>(type: "bytea", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_cv_ho_so_giao_vien", x => x.ma_ho_so);
                    table.ForeignKey(
                        name: "FK_cv_ho_so_giao_vien_ho_so_giao_vien_ma_ho_so",
                        column: x => x.ma_ho_so,
                        principalTable: "ho_so_giao_vien",
                        principalColumn: "ma_ho_so",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.Sql("""
                alter table public.cv_ho_so_giao_vien enable row level security;
                revoke all on public.cv_ho_so_giao_vien from public;
                do $$
                begin
                    if exists (select 1 from pg_roles where rolname = 'anon') then
                        revoke all on public.cv_ho_so_giao_vien from anon;
                    end if;
                    if exists (select 1 from pg_roles where rolname = 'authenticated') then
                        revoke all on public.cv_ho_so_giao_vien from authenticated;
                    end if;
                end $$;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "cv_ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "chuyen_mon",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "ngon_ngu",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "phuong_phap",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "cv_tags",
                table: "ho_so_giao_vien");
        }
    }
}
