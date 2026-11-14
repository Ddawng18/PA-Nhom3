-- Deployment script, NOT executed by the review task.
-- Deploy matching API + frontend FIRST. Run with the schema owner on Supabase.
-- Backend must connect with its dedicated trusted server role, never anon/authenticated.
-- Take a backup of grants/policies before running. Do not restore broad grants as a quick rollback.
begin;
-- Fail closed if the example bucket IDs were not adapted to this environment.
do $$ begin
  if not exists (select 1 from storage.buckets where id = 'course-media' and public)
     or not exists (select 1 from storage.buckets where id = 'course-attachments' and not public) then
    raise exception 'Set actual media/attachment bucket IDs in this script; require public media and private attachments';
  end if;
end $$;
do $$
declare
  target_table text;
  target_column text;
begin
  foreach target_table in array array['nguoi_dung', 'khoa_hoc', 'chuong', 'bai_hoc', 'bai_tap', 'tep_dinh_kem_bai_hoc', 'tieu_chi_cham_diem']
  loop
    if to_regclass(format('public.%I', target_table)) is null then
      raise exception 'Required Sprint 6 table missing: %', target_table;
    end if;
    execute format('alter table public.%I enable row level security', target_table);
    execute format('revoke insert, update, delete on public.%I from public, anon, authenticated', target_table);
    -- Table-level REVOKE alone does not remove historical column-level grants.
    for target_column in select column_name from information_schema.columns
      where table_schema = 'public' and table_name = target_table
    loop
      execute format('revoke insert (%I), update (%I), references (%I) on public.%I from public, anon, authenticated',
        target_column, target_column, target_column, target_table);
    end loop;
  end loop;
end $$;

-- Set these to the ACTUAL Render bucket IDs before executing this section.
-- Read policies are deliberately preserved: private attachment reads still require a scoped policy.
-- Restrictive policies block writes even when a legacy permissive policy exists.
drop policy if exists course_media_api_insert on storage.objects;
create policy course_media_api_insert on storage.objects as restrictive for insert to anon, authenticated
with check (bucket_id not in ('course-media', 'course-attachments'));
drop policy if exists course_media_api_update on storage.objects;
create policy course_media_api_update on storage.objects as restrictive for update to anon, authenticated
using (bucket_id not in ('course-media', 'course-attachments'))
with check (bucket_id not in ('course-media', 'course-attachments'));
drop policy if exists course_media_api_delete on storage.objects;
create policy course_media_api_delete on storage.objects as restrictive for delete to anon, authenticated
using (bucket_id not in ('course-media', 'course-attachments'));
commit;

-- Read-only verification after deployment: all results below must be false.
select role_name, table_name, privilege,
  has_table_privilege(role_name, format('public.%I', table_name), privilege) as table_write,
  has_any_column_privilege(role_name, format('public.%I', table_name), privilege) as column_write
from unnest(array['anon','authenticated']) as role_name
cross join unnest(array['nguoi_dung','khoa_hoc','chuong','bai_hoc','bai_tap','tep_dinh_kem_bai_hoc','tieu_chi_cham_diem']) as table_name
cross join unnest(array['INSERT','UPDATE']) as privilege;
