do $$
declare
  minh_anh_id uuid;
  ha_linh_id uuid;
begin
  select id
    into minh_anh_id
    from public.nguoi_dung
   where display_name = 'Minh Anh'
     and role = 'teacher'
   order by id
   limit 1;

  select id
    into ha_linh_id
    from public.nguoi_dung
   where display_name = 'Hà Linh'
     and role = 'teacher'
   order by id
   limit 1;

  if minh_anh_id is null or ha_linh_id is null then
    raise exception 'Không tìm thấy hồ sơ teacher Minh Anh và/hoặc Hà Linh trong public.nguoi_dung.';
  end if;

  insert into public.khoa_hoc (
    ma_giao_vien,
    tieu_de,
    cap_do,
    chu_de,
    mo_ta,
    trang_thai
  )
  select seed.ma_giao_vien, seed.tieu_de, seed.cap_do, seed.chu_de, seed.mo_ta, 'DA_DANG'
    from (
      values
        (minh_anh_id, 'Kiểm soát nét', 'CO_BAN', 'Vẽ cơ bản',
          'Làm chủ nét vẽ, lực tay và nhịp điệu để nét nào cũng có chủ đích.'),
        (minh_anh_id, 'Hình khối và dựng hình', 'CO_BAN', 'Vẽ cơ bản',
          'Từ hình khối đơn giản đến cách dựng vật thể có chiều sâu.'),
        (ha_linh_id, 'Phối cảnh và không gian', 'TRUNG_CAP', 'Phong cảnh',
          'Hiểu phối cảnh để tạo ra những không gian cân bằng và có chiều sâu.'),
        (ha_linh_id, 'Ánh sáng và sắc độ', 'TRUNG_CAP', 'Màu sắc',
          'Quan sát ánh sáng và chuyển nó thành sắc độ rõ ràng trong tranh.'),
        (minh_anh_id, 'Nhân vật và nét viền', 'CO_BAN', 'Minh họa nhân vật',
          'Xây dựng nhân vật có cá tính từ hình dáng, tỷ lệ và nét viền.'),
        (minh_anh_id, 'Gesture và dáng chuyển động', 'NANG_CAO', 'Minh họa nhân vật',
          'Nắm bắt chuyển động và nhịp điệu để nhân vật có sức sống tự nhiên.'),
        (ha_linh_id, 'Màu kỹ thuật số cho minh họa', 'TRUNG_CAP', 'Màu sắc',
          'Xây dựng bảng màu và hoàn thiện một minh họa kỹ thuật số.')
    ) as seed(ma_giao_vien, tieu_de, cap_do, chu_de, mo_ta)
   where not exists (
     select 1
       from public.khoa_hoc existing
      where existing.ma_giao_vien = seed.ma_giao_vien
        and existing.tieu_de = seed.tieu_de
   );
end
$$;
