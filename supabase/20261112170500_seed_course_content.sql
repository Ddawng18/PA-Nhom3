do $$
declare
  course record;
  chapter_id bigint;
  chapter_title text;
  chapter_order integer;
  lesson_titles text[];
begin
  for course in
    select ma_khoa_hoc, tieu_de
      from public.khoa_hoc
     where tieu_de in (
       'Kiểm soát nét',
       'Hình khối và dựng hình',
       'Phối cảnh và không gian',
       'Ánh sáng và sắc độ',
       'Nhân vật và nét viền',
       'Gesture và dáng chuyển động',
       'Màu kỹ thuật số cho minh họa'
     )
  loop
    lesson_titles := case course.tieu_de
      when 'Kiểm soát nét' then array['Làm quen với nét', 'Nét thẳng và đường cong', 'Bài tập kiểm soát lực tay', 'Tổng hợp và thực hành']
      when 'Hình khối và dựng hình' then array['Hình khối cơ bản', 'Phối hợp hình khối', 'Sáng tối và thể tích', 'Dựng vật thể hoàn chỉnh']
      when 'Phối cảnh và không gian' then array['Đường chân trời', 'Một điểm tụ', 'Hai điểm tụ', 'Bài tập không gian']
      when 'Ánh sáng và sắc độ' then array['Nguồn sáng', 'Sắc độ căn bản', 'Bóng đổ', 'Bài tập tĩnh vật']
      when 'Nhân vật và nét viền' then array['Tỷ lệ nhân vật', 'Dáng và cử chỉ', 'Nét viền có chủ đích', 'Bài tập nhân vật']
      when 'Gesture và dáng chuyển động' then array['Quan sát chuyển động', 'Đường hành động', 'Dáng người', 'Bài tập gesture']
      else array['Bảng màu', 'Ánh sáng màu', 'Chất liệu', 'Hoàn thiện minh họa']
    end;

    for chapter_order in 1..4
    loop
      chapter_title := lesson_titles[chapter_order];
      select ma_chuong
        into chapter_id
        from public.chuong
       where ma_khoa_hoc = course.ma_khoa_hoc
         and thu_tu = chapter_order
       limit 1;

      if chapter_id is null then
        insert into public.chuong (ma_khoa_hoc, tieu_de, thu_tu)
        values (course.ma_khoa_hoc, chapter_title, chapter_order)
        returning ma_chuong into chapter_id;
      end if;

      if not exists (
        select 1
          from public.bai_hoc
         where ma_chuong = chapter_id
           and thu_tu = 1
      ) then
        insert into public.bai_hoc (
          ma_chuong,
          tieu_de,
          thu_tu,
          noi_dung_van_ban,
          lien_ket_video,
          bat_buoc
        )
        values (
          chapter_id,
          chapter_title,
          1,
          'Bài học hướng dẫn thực hành ' || lower(chapter_title) || '. Hãy xem kỹ nguyên tắc, thực hành theo từng bước và lưu lại kết quả của bạn.',
          'https://www.youtube.com/watch?v=M7lc1UVf-VE',
          true
        );
      end if;

      chapter_id := null;
    end loop;
  end loop;
end
$$;

update public.bai_hoc as lesson
   set lien_ket_video = 'https://www.youtube.com/watch?v=M7lc1UVf-VE'
 where lesson.ma_chuong in (
   select chapter.ma_chuong
     from public.chuong as chapter
     join public.khoa_hoc as course on course.ma_khoa_hoc = chapter.ma_khoa_hoc
    where course.tieu_de in (
      'Kiểm soát nét',
      'Hình khối và dựng hình',
      'Phối cảnh và không gian',
      'Ánh sáng và sắc độ',
      'Nhân vật và nét viền',
      'Gesture và dáng chuyển động',
      'Màu kỹ thuật số cho minh họa'
    )
 );
