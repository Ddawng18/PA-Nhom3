grant select on public.khoa_hoc to authenticated;
grant select, insert, update on public.ghi_danh to authenticated;

create policy "Published courses are readable"
  on public.khoa_hoc
  for select
  to authenticated
  using (trang_thai = 'DA_DANG' or ma_giao_vien = (select auth.uid()));

create policy "Users can read their own enrollments"
  on public.ghi_danh
  for select
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()));

create policy "Users can enroll themselves"
  on public.ghi_danh
  for insert
  to authenticated
  with check (ma_nguoi_dung = (select auth.uid()) and trang_thai = 'DANG_HOC');

create policy "Users can update their own enrollments"
  on public.ghi_danh
  for update
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()))
  with check (ma_nguoi_dung = (select auth.uid()));
