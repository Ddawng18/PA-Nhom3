using Microsoft.EntityFrameworkCore.Migrations;

namespace Linea.Api.Migrations;

public partial class TeacherProfileWithdrawal : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        -- Keep standalone EF databases aligned with the course fields already provisioned by Supabase.
        alter table public.khoa_hoc
            add column if not exists ket_qua text[] not null default '{}',
            add column if not exists phan_hoi_mau text,
            add column if not exists kieu_bia varchar(20) not null default 'auto',
            add column if not exists ma_ban_goc bigint references public.khoa_hoc(ma_khoa_hoc) on delete set null;

        alter table public.ho_so_giao_vien
            drop constraint if exists ho_so_giao_vien_trang_thai_check,
            add constraint ho_so_giao_vien_trang_thai_check
                check (trang_thai in ('CHO_DUYET','CAN_BO_SUNG','DA_DUYET','TU_CHOI','DA_RUT'));

        -- Older installs have an automatically named check on the review timestamp.
        do $$
        declare
            review_check text;
        begin
            for review_check in
                select conname from pg_constraint
                where conrelid = 'public.ho_so_giao_vien'::regclass
                  and contype = 'c'
                  and pg_get_constraintdef(oid) like '%ngay_duyet IS NOT NULL%'
                  and pg_get_constraintdef(oid) like '%CHO_DUYET%'
            loop
                execute format('alter table public.ho_so_giao_vien drop constraint %I', review_check);
            end loop;
        end $$;

        alter table public.ho_so_giao_vien
            add constraint ho_so_giao_vien_review_timestamp_check
                check (trang_thai in ('CHO_DUYET','DA_RUT') or ngay_duyet is not null);
        """);

    protected override void Down(MigrationBuilder migrationBuilder) => migrationBuilder.Sql("""
        alter table public.ho_so_giao_vien
            drop constraint ho_so_giao_vien_trang_thai_check,
            drop constraint ho_so_giao_vien_review_timestamp_check,
            add constraint ho_so_giao_vien_trang_thai_check
                check (trang_thai in ('CHO_DUYET','CAN_BO_SUNG','DA_DUYET','TU_CHOI')),
            add constraint ho_so_giao_vien_review_timestamp_check
                check (trang_thai = 'CHO_DUYET' or ngay_duyet is not null);
        """);
}
