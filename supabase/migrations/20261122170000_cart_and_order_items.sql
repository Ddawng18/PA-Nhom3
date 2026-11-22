create table if not exists public.gio_hang (
  ma_nguoi_dung uuid not null references public.nguoi_dung(id) on delete cascade,
  ma_khoa_hoc bigint not null references public.khoa_hoc(ma_khoa_hoc) on delete cascade,
  ngay_them timestamptz not null default now(),
  primary key (ma_nguoi_dung, ma_khoa_hoc)
);

create table if not exists public.chi_tiet_don_hang (
  ma_chi_tiet bigint generated always as identity primary key,
  ma_don_hang bigint not null references public.don_hang_demo(ma_don_hang) on delete cascade,
  ma_khoa_hoc bigint not null references public.khoa_hoc(ma_khoa_hoc),
  ten_khoa_hoc varchar(200) not null,
  don_gia_vnd bigint not null check (don_gia_vnd >= 0),
  thu_tu integer not null check (thu_tu > 0),
  unique (ma_don_hang, ma_khoa_hoc)
);

create index if not exists idx_chi_tiet_don_hang_order on public.chi_tiet_don_hang(ma_don_hang);
create index if not exists idx_gio_hang_user on public.gio_hang(ma_nguoi_dung);

insert into public.chi_tiet_don_hang (ma_don_hang, ma_khoa_hoc, ten_khoa_hoc, don_gia_vnd, thu_tu)
select o.ma_don_hang, o.ma_khoa_hoc, k.tieu_de, o.gia_vnd, 1
from public.don_hang_demo o
join public.khoa_hoc k on k.ma_khoa_hoc = o.ma_khoa_hoc
where not exists (
  select 1 from public.chi_tiet_don_hang i where i.ma_don_hang = o.ma_don_hang
);

alter table public.don_hang_demo drop constraint if exists don_hang_demo_trang_thai_check;
alter table public.don_hang_demo add constraint don_hang_demo_trang_thai_check
  check (trang_thai in ('PENDING','SUCCEEDED','FAILED','CANCELLED','PAID_REVIEW'));
