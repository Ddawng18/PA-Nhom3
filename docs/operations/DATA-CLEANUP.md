# DATA-01 - Dọn dữ liệu thử nghiệm

**Trạng thái:** đã chạy trên production ngày **21/11/2026** sau phê duyệt BA/PO.
Backup trước khi chạy:
`C:\Users\LENOVO\AppData\Local\Temp\kilo\linea-backup-20261121-0755.json`
(không commit vì chứa dữ liệu production).

## 1. Nguyên tắc đã áp dụng

- Không xóa cứng khóa học: chuyển sang `AN`, tăng `visibility_version`.
- Không xóa cứng bài cộng đồng: chuyển `status = 'HIDDEN'`.
- Không xóa tài khoản, không đụng dữ liệu người dùng thật.
- Đơn hàng demo: giữ nguyên vì bảng đã là `public.don_hang_demo` và toàn bộ
  12/12 đơn có `che_do = 'DEMO'` (nhãn demo sẵn có; bảng không có cột ghi chú).
- Ghi audit `lich_su_trang_thai` cho từng khóa/bài bị ẩn.

## 2. Kết quả đã chạy

Ẩn 14 khóa học test/junk (status → `AN`):

| ID | Tiêu đề | Trạng thái cũ |
|---|---|---|
| 12 | TEST DEMO thanh toan 20261116 | DA_DANG |
| 13 | TEST DEMO nghiem thu 0f5ba584 | DA_DANG |
| 14 | TEST DEMO thanh toan 7c7271d5 | DA_DANG |
| 15 | TEST DEMO UI thanh toan 51d6c70c | DA_DANG |
| 16 | Khóa học Test | NHAP |
| 17 | Test chức năng | NHAP |
| 20 | ádfádfasdf | DA_DANG |
| 27 | abavaavava | CHO_DUYET |
| 29 | đndndndndndndnd | NHAP |
| 30 | cákjksa bskaksb | NHAP |
| 31 | xhjzkhsbk bsabsoaosscs | NHAP |
| 32 | qqqqqqqqqqqqqqqqqqqq | NHAP |
| 33 | aaaaaaaaaaaaaaaaaaaaaaaaaa | NHAP |
| 34 | qqqqqqqqqqqqqqqqqqqqqqqqqqqqqq | DA_DANG |

Ẩn 2 bài cộng đồng test (status → `HIDDEN`):

| ID | Tiêu đề |
|---|---|
| 1 | TEST DEMO community 2ca2134a |
| 2 | TEST DAU VAO - KHONG PHAI CHU BAI VIET |

Sau khi chạy:

- Khóa `DA_DANG` còn **9** (các khóa demo/nội dung thật 4-11 và 35).
- Bài cộng đồng `VISIBLE` còn **0**.
- Đơn demo: **12/12** giữ nguyên, đã là dữ liệu demo có nhãn `che_do='DEMO'`.
- Đã ghi **16** bản ghi audit với actor `Admin Demo`.

## 3. Rollback

Chạy trong transaction, chỉ dùng khi cần khôi phục đúng các ID trên:

```sql
begin;
update public.khoa_hoc
set trang_thai = case ma_khoa_hoc
  when 27 then 'CHO_DUYET'
  when 16 then 'NHAP' when 17 then 'NHAP' when 29 then 'NHAP' when 30 then 'NHAP'
  when 31 then 'NHAP' when 32 then 'NHAP' when 33 then 'NHAP'
  else 'DA_DANG' end,
  visibility_version = visibility_version + 1,
  ngay_cap_nhat = now()
where ma_khoa_hoc in (12,13,14,15,16,17,20,27,29,30,31,32,33,34);
update public.community_posts set status = 'VISIBLE' where id in (1,2);
delete from public.lich_su_trang_thai
where ma_nguoi_thuc_hien = '1c2532d1-061b-428c-88fc-2250a9f4cbf9'
  and ly_do like 'DATA-01:%';
commit;
```

Nếu cần khôi phục toàn bộ dữ liệu, dùng file backup JSON ở trên hoặc backup
`pg_dump` của Supabase. Không xóa dữ liệu người dùng thật.

## 4. Kiểm tra sau chạy

- Guest `/courses`: chỉ còn khóa demo/nội dung thật.
- Guest `/community`: feed trống cho tới khi có bài mới.
- Admin `/admin/manage`: các khóa test ở trạng thái `AN`.
- Admin `/admin/audit`: có bản ghi `DATA-01` cho 14 khóa + 2 bài.

**Lưu ý hiển thị:** API production cũ lọc catalog theo `DA_DANG`, nên 6 khóa test
đã biến mất khỏi `/courses` ngay (production hiện còn 9 khóa). Tuy nhiên API cũ
chưa lọc `community_posts.status`, nên 2 bài test vẫn trả về cho tới khi deploy
backend mới. Không xóa cứng dữ liệu để chờ deploy.

---

## 5. Bổ sung ngày 22/11/2026

Trong lúc thực hiện Phase 0, phát hiện thêm dữ liệu thử vẫn hiển thị công khai:

- Khóa `35` — `11567 boxes` (nội dung junk).
- Khóa `39` — `[DEMO] Khóa học Digital Art mẫu cho giáo viênccccccccccc` (tiêu đề/mô tả placeholder chưa hoàn thiện).
- Bài cộng đồng `4` — nội dung spam/abusive.

Đã backup các hàng bị ảnh hưởng vào:

```text
C:\Users\LENOVO\AppData\Local\Temp\kilo\linea-phase0-backup-20261122.json
```

Đã chạy:

```sql
begin;
update public.khoa_hoc
set trang_thai = 'AN',
    visibility_version = visibility_version + 1,
    ngay_cap_nhat = now()
where ma_khoa_hoc in (35, 39);

update public.community_posts
set status = 'HIDDEN'
where id = 4;
commit;
```

Kết quả kiểm tra:

- Catalog public còn **8 khóa**; không còn `11567 boxes` hoặc khóa `[DEMO]...cccc`.
- Community API không còn bài spam id `4`.
- Khóa demo `4` vẫn giữ lại vì đã có nhãn `[DEMO]` và mô tả rõ ràng.

Rollback nếu cần:

```sql
begin;
update public.khoa_hoc
set trang_thai = 'DA_DANG',
    visibility_version = visibility_version + 1,
    ngay_cap_nhat = now()
where ma_khoa_hoc in (35, 39);

update public.community_posts
set status = 'VISIBLE'
where id = 4;
commit;
```
