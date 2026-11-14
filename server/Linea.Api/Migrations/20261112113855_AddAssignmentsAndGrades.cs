using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAssignmentsAndGrades : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                using var stream = typeof(AddAssignmentsAndGrades).Assembly.GetManifestResourceStream(
                    "Linea.Api.Data.Sql.learner-assignments.sql")
                    ?? throw new InvalidOperationException("Missing learner assignment migration resource.");
                using var reader = new System.IO.StreamReader(stream);
                migrationBuilder.Sql(reader.ReadToEnd());
                return;
            }
            migrationBuilder.CreateTable(
                name: "bai_tap",
                columns: table => new
                {
                    ma_bai_tap = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ma_bai_hoc = table.Column<long>(type: "INTEGER", nullable: false),
                    de_bai = table.Column<string>(type: "TEXT", nullable: false),
                    han_nop = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    bat_buoc = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bai_tap", x => x.ma_bai_tap);
                    table.ForeignKey(
                        name: "FK_bai_tap_bai_hoc_ma_bai_hoc",
                        column: x => x.ma_bai_hoc,
                        principalTable: "bai_hoc",
                        principalColumn: "ma_bai_hoc",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "bai_nop",
                columns: table => new
                {
                    ma_bai_nop = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ma_bai_tap = table.Column<long>(type: "INTEGER", nullable: false),
                    ma_nguoi_dung = table.Column<Guid>(type: "TEXT", nullable: false),
                    duong_dan_anh = table.Column<string>(type: "TEXT", maxLength: 500, nullable: false),
                    trang_thai = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    ngay_nop = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    ngay_cap_nhat = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_bai_nop", x => x.ma_bai_nop);
                    table.ForeignKey(
                        name: "FK_bai_nop_bai_tap_ma_bai_tap",
                        column: x => x.ma_bai_tap,
                        principalTable: "bai_tap",
                        principalColumn: "ma_bai_tap",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ket_qua_cham",
                columns: table => new
                {
                    ma_ket_qua = table.Column<long>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    ma_bai_nop = table.Column<long>(type: "INTEGER", nullable: false),
                    ma_nguoi_cham = table.Column<Guid>(type: "TEXT", nullable: false),
                    diem = table.Column<decimal>(type: "TEXT", precision: 4, scale: 2, nullable: false),
                    nhan_xet = table.Column<string>(type: "TEXT", nullable: false),
                    ngay_cham = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ket_qua_cham", x => x.ma_ket_qua);
                    table.ForeignKey(
                        name: "FK_ket_qua_cham_bai_nop_ma_bai_nop",
                        column: x => x.ma_bai_nop,
                        principalTable: "bai_nop",
                        principalColumn: "ma_bai_nop",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_bai_nop_ma_bai_tap_ma_nguoi_dung",
                table: "bai_nop",
                columns: new[] { "ma_bai_tap", "ma_nguoi_dung" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_bai_nop_ma_nguoi_dung",
                table: "bai_nop",
                column: "ma_nguoi_dung");

            migrationBuilder.CreateIndex(
                name: "IX_bai_tap_ma_bai_hoc",
                table: "bai_tap",
                column: "ma_bai_hoc");

            migrationBuilder.CreateIndex(
                name: "IX_ket_qua_cham_ma_bai_nop",
                table: "ket_qua_cham",
                column: "ma_bai_nop",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
                throw new NotSupportedException("Assignments may predate this migration. Restore schema/permissions from backup instead of dropping learner data.");
            migrationBuilder.DropTable(
                name: "ket_qua_cham");

            migrationBuilder.DropTable(
                name: "bai_nop");

            migrationBuilder.DropTable(
                name: "bai_tap");
        }
    }
}
