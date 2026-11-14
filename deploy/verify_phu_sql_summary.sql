-- PHU SPRINT 6 VERIFY SUMMARY (read-only, one result row)
-- Chạy trong Supabase SQL Editor. Kỳ vọng: tất cả boolean = true,
-- d05_should_complete_not_completed = 0, d05_completed_but_missing = 0.

with required_lessons as (
  select c.ma_khoa_hoc, l.ma_bai_hoc
  from public.bai_hoc l
  join public.chuong c using (ma_chuong)
  where l.bat_buoc
),
required_assignments as (
  select c.ma_khoa_hoc, a.ma_bai_tap
  from public.bai_tap a
  join public.bai_hoc l using (ma_bai_hoc)
  join public.chuong c using (ma_chuong)
  where a.bat_buoc
),
d05_should_complete as (
  select e.ma_nguoi_dung, e.ma_khoa_hoc
  from public.ghi_danh e
  where e.trang_thai <> 'DA_HUY'
    and exists (select 1 from required_lessons rl where rl.ma_khoa_hoc = e.ma_khoa_hoc)
    and not exists (
      select 1 from required_lessons rl
      where rl.ma_khoa_hoc = e.ma_khoa_hoc
        and not exists (
          select 1 from public.tien_do_bai_hoc p
          where p.ma_bai_hoc = rl.ma_bai_hoc
            and p.ma_nguoi_dung = e.ma_nguoi_dung
            and p.trang_thai = 'DA_HOAN_THANH'
        )
    )
    and not exists (
      select 1 from required_assignments ra
      where ra.ma_khoa_hoc = e.ma_khoa_hoc
        and not exists (
          select 1 from public.bai_nop s
          where s.ma_bai_tap = ra.ma_bai_tap
            and s.ma_nguoi_dung = e.ma_nguoi_dung
        )
    )
    and e.trang_thai <> 'HOAN_THANH'
),
d05_completed_but_missing as (
  select e.ma_nguoi_dung, e.ma_khoa_hoc
  from public.ghi_danh e
  where e.trang_thai = 'HOAN_THANH'
    and (
      not exists (select 1 from required_lessons rl where rl.ma_khoa_hoc = e.ma_khoa_hoc)
      or exists (
        select 1 from required_lessons rl
        where rl.ma_khoa_hoc = e.ma_khoa_hoc
          and not exists (
            select 1 from public.tien_do_bai_hoc p
            where p.ma_bai_hoc = rl.ma_bai_hoc
              and p.ma_nguoi_dung = e.ma_nguoi_dung
              and p.trang_thai = 'DA_HOAN_THANH'
          )
      )
      or exists (
        select 1 from required_assignments ra
        where ra.ma_khoa_hoc = e.ma_khoa_hoc
          and not exists (
            select 1 from public.bai_nop s
            where s.ma_bai_tap = ra.ma_bai_tap
              and s.ma_nguoi_dung = e.ma_nguoi_dung
          )
      )
    )
)
select
  (to_regclass('public.nguoi_dung') is not null) as users_table,
  (to_regclass('public.khoa_hoc') is not null) as courses_table,
  (to_regclass('auth.users') is not null) as auth_users_table,
  (
    select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'nguoi_dung'
      and column_name in ('is_locked', 'lock_version')
  ) as admin_lock_columns,
  (
    select count(*) = 2 from information_schema.columns
    where table_schema = 'public' and table_name = 'khoa_hoc'
      and column_name in ('visibility_version', 'ngay_cap_nhat')
  ) as course_visibility_columns,
  (to_regclass('public.don_hang_demo') is not null) as demo_orders_table,
  (to_regprocedure('public.linea_account_is_locked()') is not null) as account_lock_function,
  (to_regprocedure('public.linea_is_admin()') is not null) as admin_function,
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.lich_su_trang_thai'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%BAI_NOP%'
      and pg_get_constraintdef(oid) ilike '%DON_HANG%'
  ) as history_check_includes_new_types,
  (select count(*) from public.nguoi_dung) as users,
  (select count(*) from public.nguoi_dung where is_locked) as locked_users,
  (select count(*) from public.khoa_hoc) as courses,
  (select count(*) from public.khoa_hoc where trang_thai = 'AN') as hidden_courses,
  (select count(*) from public.ghi_danh) as enrollments,
  (select count(*) from public.tien_do_bai_hoc) as progress_rows,
  (select count(*) from public.bai_nop) as submissions,
  (select count(*) from public.don_hang_demo) as demo_orders,
  (select count(*) from d05_should_complete) as d05_should_complete_not_completed,
  (select count(*) from d05_completed_but_missing) as d05_completed_but_missing;
