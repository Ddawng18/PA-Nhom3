# LINEA — Shopping cart implementation plan

## Decisions

- Cart is **server-side per account** and works across devices.
- Guest can add to a temporary local cart; it is merged into the account cart on login.
- Free and paid courses can coexist in one cart.
- Checkout charges one total for all paid items; free-only checkout enrolls immediately.
- `PAID_REVIEW` exists for a paid order whose items cannot all be granted.
- “Mua ngay” stays available; “Thêm vào giỏ” is an additional path.
- Logout clears only local UI cache; the server cart is never deleted.
- Server is the source of truth for price, availability and enrollment.

## Data

### Cart

```sql
create table public.gio_hang (
  ma_nguoi_dung uuid not null references public.nguoi_dung(id) on delete cascade,
  ma_khoa_hoc bigint not null references public.khoa_hoc(ma_khoa_hoc) on delete cascade,
  ngay_them timestamptz not null default now(),
  primary key (ma_nguoi_dung, ma_khoa_hoc)
);
```

### Order items

```sql
create table public.chi_tiet_don_hang (
  ma_chi_tiet bigint generated always as identity primary key,
  ma_don_hang bigint not null references public.don_hang_demo(ma_don_hang) on delete cascade,
  ma_khoa_hoc bigint not null references public.khoa_hoc(ma_khoa_hoc),
  ten_khoa_hoc varchar(200) not null,
  don_gia_vnd bigint not null check (don_gia_vnd >= 0),
  thu_tu integer not null check (thu_tu > 0),
  unique (ma_don_hang, ma_khoa_hoc)
);
```

Legacy orders are backfilled with one item. `don_hang_demo.ma_khoa_hoc` remains the first course for backward-compatible queries; `gia_vnd` becomes the order total. `PAID_REVIEW` is added to the order status constraint.

## API

- `GET /api/cart` — account cart with current course quote.
- `POST /api/cart/items` — add one course.
- `DELETE /api/cart/items/{courseId}` — remove one course.
- `DELETE /api/cart` — clear account cart.
- `POST /api/cart/merge` — merge guest course IDs after login.
- `POST /api/cart/quote` — public quote for guest/account items.
- `POST /api/demo-orders/checkout` — one order for multiple courses.
- Existing `/api/demo-orders` single-course endpoint remains for “Mua ngay”.

Checkout:

1. Validate 1–20 unique course IDs.
2. Lock course rows and verify public, enrollment and price.
3. If any item is invalid return `409 CART_CHANGED` with the invalid items.
4. Free-only: create `SUCCEEDED` order, enroll all, return no payment URL.
5. Paid/mixed: create `PENDING` order, insert item snapshots, return provider URL for total.
6. Finalize in one transaction; on item failure set `PAID_REVIEW`, never grant partially.
7. Provider callbacks use the same order ID and total amount; finalization is idempotent.

## Frontend

- `CartProvider`: server cart for authenticated users, guest localStorage for guests, merge on login.
- `PublicHeader`: cart icon and live count.
- Course card and detail: “Thêm vào giỏ”; detail keeps “Mua ngay” and free enrollment.
- `/cart`: items, current quote, total, remove/clear, login prompt, checkout.
- Checkout idempotency key tied to user + cart fingerprint; clear cart only after success.
- Orders page, invoice and admin order detail render multiple items.

## Edge cases

- Duplicate, max 20, enrolled, unpublished, price changed, course removed.
- Free-only, mixed, double click, callback retry, abandoned payment, logout/login.
- Two devices editing, local cache corruption, legacy single-course order.
- Payment success with unavailable item → `PAID_REVIEW`.

## Tests

- Cart store/API: add/remove/merge/dedupe/max/ownership.
- Quote: guest/auth, free/paid/mixed, enrolled, unavailable, price changes.
- Checkout: idempotency, total amount, all enrollments, double click, free-only, `PAID_REVIEW`.
- Provider: VNPAY/ZaloPay amount and callback idempotency.
- Playwright: add multiple, reload, login merge, checkout success/failure, orders display, mobile/a11y.

## Rollout

1. Additive migration + backfill.
2. Deploy backend first; verify legacy orders.
3. Deploy frontend behind `CART_ENABLED`.
4. Run sandbox checkout for 2 courses.
5. Enable broadly; monitor checkout success, item count, entitlement mismatch and `PAID_REVIEW`.
6. Rollback by disabling the flag; keep schema and order data.

## Done

- Multiple courses can be collected and purchased once.
- Cart works across devices and merges guest items.
- Server prices are authoritative.
- No duplicate order/enrollment.
- Orders and invoices show all items.
- Legacy orders still render.
- All cart/payment tests and Playwright pass.
