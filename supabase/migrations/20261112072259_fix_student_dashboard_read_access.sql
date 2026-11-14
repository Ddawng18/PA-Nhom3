grant select on public.ghi_danh, public.tien_do_bai_hoc to authenticated;

create policy "dashboard_read_own_enrollments"
on public.ghi_danh for select to authenticated
using (ma_nguoi_dung = (select auth.uid()));

create policy "dashboard_read_own_progress"
on public.tien_do_bai_hoc for select to authenticated
using (ma_nguoi_dung = (select auth.uid()));

create policy "dashboard_read_enrolled_published_courses"
on public.khoa_hoc for select to authenticated
using (
    trang_thai = 'DA_DANG'
    and exists (
        select 1 from public.ghi_danh g
        where g.ma_khoa_hoc = khoa_hoc.ma_khoa_hoc
          and g.ma_nguoi_dung = (select auth.uid())
          and g.trang_thai in ('DANG_HOC', 'HOAN_THANH')
    )
);

create policy "dashboard_read_enrolled_chapters"
on public.chuong for select to authenticated
using (
    exists (
        select 1 from public.khoa_hoc k
        where k.ma_khoa_hoc = chuong.ma_khoa_hoc
          and k.trang_thai = 'DA_DANG'
          and exists (
              select 1 from public.ghi_danh g
              where g.ma_khoa_hoc = k.ma_khoa_hoc
                and g.ma_nguoi_dung = (select auth.uid())
                and g.trang_thai in ('DANG_HOC', 'HOAN_THANH')
          )
    )
);

create policy "dashboard_read_enrolled_lessons"
on public.bai_hoc for select to authenticated
using (
    exists (
        select 1 from public.chuong c
        where c.ma_chuong = bai_hoc.ma_chuong
    )
);

create policy "dashboard_read_enrolled_teacher_profiles"
on public.nguoi_dung for select to authenticated
using (
    exists (
        select 1 from public.khoa_hoc k
        where k.ma_giao_vien = nguoi_dung.id
          and k.trang_thai = 'DA_DANG'
          and exists (
              select 1 from public.ghi_danh g
              where g.ma_khoa_hoc = k.ma_khoa_hoc
                and g.ma_nguoi_dung = (select auth.uid())
                and g.trang_thai in ('DANG_HOC', 'HOAN_THANH')
          )
    )
);
