-- The API is the sole writer for enrollments and lesson progress. Restrictive
-- policies override older permissive policies while leaving SELECT grants intact.
-- Rollback: DROP the eight policies named below; the older policies remain.
create policy api_only_enrollment_insert on public.ghi_danh
  as restrictive for insert to anon, authenticated with check (false);
create policy api_only_enrollment_update on public.ghi_danh
  as restrictive for update to anon, authenticated using (false) with check (false);
create policy api_only_enrollment_delete on public.ghi_danh
  as restrictive for delete to anon, authenticated using (false);
create policy active_enrollment_select on public.ghi_danh
  as restrictive for select to authenticated using (not public.linea_account_is_locked());

create policy api_only_progress_insert on public.tien_do_bai_hoc
  as restrictive for insert to anon, authenticated with check (false);
create policy api_only_progress_update on public.tien_do_bai_hoc
  as restrictive for update to anon, authenticated using (false) with check (false);
create policy api_only_progress_delete on public.tien_do_bai_hoc
  as restrictive for delete to anon, authenticated using (false);
create policy active_progress_select on public.tien_do_bai_hoc
  as restrictive for select to authenticated using (not public.linea_account_is_locked());
