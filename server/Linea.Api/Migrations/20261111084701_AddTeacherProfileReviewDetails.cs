using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Linea.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddTeacherProfileReviewDetails : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.Sql(
                    """
                    alter table public.ho_so_giao_vien add column if not exists ly_do_bo_sung text;
                    alter table public.ho_so_giao_vien add column if not exists ma_ly_do varchar(50);
                    alter table public.ho_so_giao_vien add column if not exists ghi_chu_noi_bo text;
                    alter table public.ho_so_giao_vien add column if not exists truong_can_bo_sung text;

                    alter table public.lich_su_trang_thai add column if not exists ma_ly_do varchar(50);
                    alter table public.lich_su_trang_thai add column if not exists ghi_chu_noi_bo text;
                    alter table public.lich_su_trang_thai add column if not exists truong_can_bo_sung text;

                    alter table public.ho_so_giao_vien drop constraint if exists ho_so_giao_vien_trang_thai_check;
                    alter table public.ho_so_giao_vien
                        add constraint ho_so_giao_vien_trang_thai_check
                        check (trang_thai in ('CHO_DUYET','CAN_BO_SUNG','DA_DUYET','TU_CHOI'));

                    alter table public.ho_so_giao_vien drop constraint if exists ho_so_giao_vien_ly_do_bo_sung_check;
                    alter table public.ho_so_giao_vien
                        add constraint ho_so_giao_vien_ly_do_bo_sung_check
                        check (trang_thai <> 'CAN_BO_SUNG' or nullif(btrim(ly_do_bo_sung),'') is not null);
                    """);
                return;
            }

            migrationBuilder.AddColumn<string>(
                name: "ghi_chu_noi_bo",
                table: "lich_su_trang_thai",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ma_ly_do",
                table: "lich_su_trang_thai",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "truong_can_bo_sung",
                table: "lich_su_trang_thai",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ghi_chu_noi_bo",
                table: "ho_so_giao_vien",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ly_do_bo_sung",
                table: "ho_so_giao_vien",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "ma_ly_do",
                table: "ho_so_giao_vien",
                type: "TEXT",
                maxLength: 50,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "truong_can_bo_sung",
                table: "ho_so_giao_vien",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            if (ActiveProvider.Contains("Npgsql", StringComparison.OrdinalIgnoreCase))
            {
                migrationBuilder.Sql(
                    """
                    alter table public.ho_so_giao_vien drop constraint if exists ho_so_giao_vien_trang_thai_check;
                    update public.ho_so_giao_vien
                    set trang_thai = 'TU_CHOI',
                        ly_do_tu_choi = coalesce(ly_do_tu_choi, ly_do_bo_sung, 'Cần bổ sung thông tin.'),
                        ngay_duyet = coalesce(ngay_duyet, now())
                    where trang_thai = 'CAN_BO_SUNG';
                    alter table public.ho_so_giao_vien
                        add constraint ho_so_giao_vien_trang_thai_check
                        check (trang_thai in ('CHO_DUYET','DA_DUYET','TU_CHOI'));
                    alter table public.ho_so_giao_vien drop constraint if exists ho_so_giao_vien_ly_do_bo_sung_check;

                    alter table public.ho_so_giao_vien drop column if exists ly_do_bo_sung;
                    alter table public.ho_so_giao_vien drop column if exists ma_ly_do;
                    alter table public.ho_so_giao_vien drop column if exists ghi_chu_noi_bo;
                    alter table public.ho_so_giao_vien drop column if exists truong_can_bo_sung;

                    alter table public.lich_su_trang_thai drop column if exists ma_ly_do;
                    alter table public.lich_su_trang_thai drop column if exists ghi_chu_noi_bo;
                    alter table public.lich_su_trang_thai drop column if exists truong_can_bo_sung;
                    """);
                return;
            }

            migrationBuilder.DropColumn(
                name: "ghi_chu_noi_bo",
                table: "lich_su_trang_thai");

            migrationBuilder.DropColumn(
                name: "ma_ly_do",
                table: "lich_su_trang_thai");

            migrationBuilder.DropColumn(
                name: "truong_can_bo_sung",
                table: "lich_su_trang_thai");

            migrationBuilder.DropColumn(
                name: "ghi_chu_noi_bo",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "ly_do_bo_sung",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "ma_ly_do",
                table: "ho_so_giao_vien");

            migrationBuilder.DropColumn(
                name: "truong_can_bo_sung",
                table: "ho_so_giao_vien");
        }
    }
}
