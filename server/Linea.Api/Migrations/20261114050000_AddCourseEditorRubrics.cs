using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations;

public partial class AddCourseEditorRubrics : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("""
            create table if not exists tieu_chi_cham_diem (
              ma_tieu_chi integer primary key,
              ma_bai_tap integer not null,
              ten_tieu_chi varchar(255) not null,
              ty_trong integer not null,
              thu_tu integer not null
            );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql("drop table if exists tieu_chi_cham_diem;");
    }
}
