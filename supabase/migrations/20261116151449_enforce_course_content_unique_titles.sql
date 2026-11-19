-- Preserve existing names. Any existing duplicates abort this migration.
-- Deferred uniqueness permits renaming/swapping titles in one editor transaction.
set local lock_timeout = '5s';
alter table public.khoa_hoc add column if not exists tieu_de_chuan_hoa text generated always as (lower(btrim(tieu_de))) stored;
alter table public.chuong add column if not exists tieu_de_chuan_hoa text generated always as (lower(btrim(tieu_de))) stored;
alter table public.bai_hoc add column if not exists tieu_de_chuan_hoa text generated always as (lower(btrim(tieu_de))) stored;
do $$
begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.khoa_hoc'::regclass and conname = 'uq_khoa_hoc_teacher_title') then
    alter table public.khoa_hoc add constraint uq_khoa_hoc_teacher_title unique (ma_giao_vien, tieu_de_chuan_hoa) deferrable initially deferred;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.chuong'::regclass and conname = 'uq_chuong_course_title') then
    alter table public.chuong add constraint uq_chuong_course_title unique (ma_khoa_hoc, tieu_de_chuan_hoa) deferrable initially deferred;
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.bai_hoc'::regclass and conname = 'uq_bai_hoc_chapter_title') then
    alter table public.bai_hoc add constraint uq_bai_hoc_chapter_title unique (ma_chuong, tieu_de_chuan_hoa) deferrable initially deferred;
  end if;
end $$;
