alter table public.khoa_hoc
  add column if not exists ma_ban_goc bigint references public.khoa_hoc(ma_khoa_hoc) on delete set null;
