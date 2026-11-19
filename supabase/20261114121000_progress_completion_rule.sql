-- S6-07 / D05 completion backfill, owned by Phú.
-- Rule: complete when the course has at least one required lesson, every required
-- lesson is DA_HOAN_THANH, and every required assignment has a stored submission.
-- A submission does NOT have to be graded. DA_HUY enrollments are never changed.
-- This migration is additive: it keeps attendance/progress/grades and only
-- reconciles the enrollment status and completion timestamp.

with completion as (
  select
    e.ma_nguoi_dung,
    e.ma_khoa_hoc,
    exists (
      select 1
      from public.bai_hoc l
      join public.chuong c using (ma_chuong)
      where c.ma_khoa_hoc = e.ma_khoa_hoc and l.bat_buoc
    )
    and not exists (
      select 1
      from public.bai_hoc l
      join public.chuong c using (ma_chuong)
      where c.ma_khoa_hoc = e.ma_khoa_hoc
        and l.bat_buoc
        and not exists (
          select 1
          from public.tien_do_bai_hoc p
          where p.ma_bai_hoc = l.ma_bai_hoc
            and p.ma_nguoi_dung = e.ma_nguoi_dung
            and p.trang_thai = 'DA_HOAN_THANH'
        )
    )
    and not exists (
      select 1
      from public.bai_tap a
      join public.bai_hoc l using (ma_bai_hoc)
      join public.chuong c using (ma_chuong)
      where c.ma_khoa_hoc = e.ma_khoa_hoc
        and a.bat_buoc
        and not exists (
          select 1
          from public.bai_nop s
          where s.ma_bai_tap = a.ma_bai_tap
            and s.ma_nguoi_dung = e.ma_nguoi_dung
        )
    ) as complete
  from public.ghi_danh e
  where e.trang_thai <> 'DA_HUY'
)
update public.ghi_danh e
set trang_thai = case when c.complete then 'HOAN_THANH' else 'DANG_HOC' end,
    ngay_hoan_thanh = case
      when c.complete then coalesce(e.ngay_hoan_thanh, now())
      else null
    end
from completion c
where e.ma_nguoi_dung = c.ma_nguoi_dung
  and e.ma_khoa_hoc = c.ma_khoa_hoc;
