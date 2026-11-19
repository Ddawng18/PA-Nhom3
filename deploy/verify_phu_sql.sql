-- PHU SPRINT 6 VERIFY (read-only, Supabase SQL Editor)
-- Chạy sau khi áp hai file SQL Supabase (admin_management + progress_completion_rule). Không sửa dữ liệu.

-- 1) Bảng bắt buộc
select name, to_regclass('public.' || name) is not null as exists
from unnest(array[
  'nguoi_dung','khoa_hoc','chuong','bai_hoc','ghi_danh','tien_do_bai_hoc',
  'bai_tap','bai_nop','ket_qua_cham','lich_su_trang_thai','thong_bao','don_hang_demo'
]) as t(name)
order by name;

-- 2) Cột quản trị/khóa học
select table_name, column_name
from information_schema.columns
where table_schema = 'public'
  and (
    (table_name = 'nguoi_dung' and column_name in ('is_locked','locked_reason','locked_at','lock_version'))
    or (table_name = 'khoa_hoc' and column_name in ('visibility_version','gia_vnd','ngay_cap_nhat','trang_thai'))
  )
order by table_name, column_name;

-- 3) Hàm RLS helper
select p.proname, p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('linea_account_is_locked','linea_is_admin')
order by p.proname;

-- 4) Policy đọc dashboard
select tablename, policyname
from pg_policies
where schemaname = 'public'
  and tablename in ('nguoi_dung','khoa_hoc','chuong','bai_hoc','ghi_danh','tien_do_bai_hoc')
order by tablename, policyname;

-- 5) CHECK lịch sử trạng thái phải có BAI_NOP và DON_HANG
select pg_get_constraintdef(oid) as history_check
from pg_constraint
where conrelid = 'public.lich_su_trang_thai'::regclass
  and contype = 'c'
  and pg_get_constraintdef(oid) ilike '%loai_doi_tuong%';

-- 6) Đếm nhanh
select
  (select count(*) from public.nguoi_dung) as users,
  (select count(*) from public.nguoi_dung where is_locked) as locked_users,
  (select count(*) from public.khoa_hoc) as courses,
  (select count(*) from public.khoa_hoc where trang_thai = 'AN') as hidden_courses,
  (select count(*) from public.ghi_danh) as enrollments,
  (select count(*) from public.tien_do_bai_hoc) as progress_rows,
  (select count(*) from public.bai_nop) as submissions,
  (select count(*) from public.don_hang_demo) as demo_orders;

-- 7) D05: đủ điều kiện hoàn thành nhưng chưa HOAN_THANH
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
)
select e.ma_nguoi_dung, e.ma_khoa_hoc, 'SHOULD_BE_COMPLETE' as issue
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
  and e.trang_thai <> 'HOAN_THANH';

-- 8) D05: HOAN_THANH nhưng thiếu bài bắt buộc/bài nộp bắt buộc
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
)
select e.ma_nguoi_dung, e.ma_khoa_hoc, 'HOAN_THANH_BUT_MISSING' as issue
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
  );
