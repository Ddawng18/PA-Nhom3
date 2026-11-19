-- Keep gateway sessions on their originating provider; never simulate a gateway payment.
begin;
alter table public.don_hang_demo
  add column if not exists payment_provider text not null default 'DEMO'
    check (payment_provider in ('DEMO', 'VNPAY_SANDBOX', 'ZALOPAY_SANDBOX')),
  add column if not exists provider_transaction_id text,
  add column if not exists payment_url text;
create unique index if not exists don_hang_demo_provider_transaction_unique
  on public.don_hang_demo (payment_provider, provider_transaction_id)
  where provider_transaction_id is not null;
-- Orders remain server-only; adding a gateway does not expose the table via Data API.
alter table public.don_hang_demo enable row level security;
revoke all on public.don_hang_demo from public, anon, authenticated;
commit;
