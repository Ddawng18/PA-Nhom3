-- CAT-01: optional catalog metadata entered by the owning teacher.
alter table public.khoa_hoc add column if not exists thoi_luong varchar(50);
alter table public.khoa_hoc add column if not exists ngay_khai_giang date;
