alter table public.khoa_hoc
  add column if not exists ket_qua text[] not null default '{}',
  add column if not exists phan_hoi_mau text,
  add column if not exists kieu_bia varchar(20) not null default 'auto';
