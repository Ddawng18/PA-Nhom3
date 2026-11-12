grant select on public.chuong to authenticated;
grant select on public.bai_hoc to authenticated;
grant select on public.tien_do_bai_hoc to authenticated;

create policy "Enrolled students can read course chapters"
  on public.chuong
  for select
  to authenticated
  using (exists (
    select 1
      from public.ghi_danh enrollment
     where enrollment.ma_khoa_hoc = chuong.ma_khoa_hoc
       and enrollment.ma_nguoi_dung = (select auth.uid())
       and enrollment.trang_thai in ('DANG_HOC', 'HOAN_THANH')
  ));

create policy "Enrolled students can read course lessons"
  on public.bai_hoc
  for select
  to authenticated
  using (exists (
    select 1
      from public.chuong chapter
      join public.ghi_danh enrollment on enrollment.ma_khoa_hoc = chapter.ma_khoa_hoc
     where chapter.ma_chuong = bai_hoc.ma_chuong
       and enrollment.ma_nguoi_dung = (select auth.uid())
       and enrollment.trang_thai in ('DANG_HOC', 'HOAN_THANH')
  ));

create policy "Users can read their own lesson progress"
  on public.tien_do_bai_hoc
  for select
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()));

create policy "Users can write their own lesson progress"
  on public.tien_do_bai_hoc
  for insert
  to authenticated
  with check (ma_nguoi_dung = (select auth.uid()) and trang_thai in ('CHUA_HOC', 'DANG_HOC', 'DA_HOAN_THANH'));

create policy "Users can update their own lesson progress"
  on public.tien_do_bai_hoc
  for update
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()))
  with check (ma_nguoi_dung = (select auth.uid()) and trang_thai in ('CHUA_HOC', 'DANG_HOC', 'DA_HOAN_THANH'));
