create table if not exists public.tieu_chi_cham_diem (
  ma_tieu_chi bigint generated always as identity primary key,
  ma_bai_tap bigint not null references public.bai_tap on delete cascade,
  ten_tieu_chi varchar(255) not null check (btrim(ten_tieu_chi) <> ''),
  ty_trong integer not null check (ty_trong between 1 and 100),
  thu_tu integer not null check (thu_tu > 0)
);

alter table public.tieu_chi_cham_diem enable row level security;
revoke all on table public.tieu_chi_cham_diem from public, anon, authenticated;
