grant select, insert, update on public.tien_do_bai_hoc to authenticated;

drop policy if exists "Users can read their own lesson progress" on public.tien_do_bai_hoc;
drop policy if exists "Users can write their own lesson progress" on public.tien_do_bai_hoc;
drop policy if exists "Users can update their own lesson progress" on public.tien_do_bai_hoc;

create policy "Users can read their own lesson progress"
  on public.tien_do_bai_hoc
  for select
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()));

create policy "Users can write their own lesson progress"
  on public.tien_do_bai_hoc
  for insert
  to authenticated
  with check (
    ma_nguoi_dung = (select auth.uid())
    and trang_thai in ('CHUA_HOC', 'DANG_HOC', 'DA_HOAN_THANH')
  );

create policy "Users can update their own lesson progress"
  on public.tien_do_bai_hoc
  for update
  to authenticated
  using (ma_nguoi_dung = (select auth.uid()))
  with check (
    ma_nguoi_dung = (select auth.uid())
    and trang_thai in ('CHUA_HOC', 'DANG_HOC', 'DA_HOAN_THANH')
  );
