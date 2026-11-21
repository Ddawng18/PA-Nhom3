-- Indexes for the teacher workspace, admin audit and community queries.
-- Keep these additive so rollback only drops the named indexes.

create index if not exists ix_khoa_hoc_teacher_status
  on public.khoa_hoc (ma_giao_vien, trang_thai);
create index if not exists ix_ghi_danh_course_status
  on public.ghi_danh (ma_khoa_hoc, trang_thai);
create index if not exists ix_bai_nop_assignment_status_updated
  on public.bai_nop (ma_bai_tap, trang_thai, ngay_cap_nhat desc);
create index if not exists ix_ket_qua_cham_grader
  on public.ket_qua_cham (ma_nguoi_cham);
create index if not exists ix_thong_bao_user_read_created
  on public.thong_bao (ma_nguoi_dung, da_doc, ngay_tao desc);
create index if not exists ix_lich_su_object_occurred
  on public.lich_su_trang_thai (loai_doi_tuong, ma_doi_tuong, ngay_thuc_hien desc);
create index if not exists ix_community_posts_author_created
  on public.community_posts (author_id, created_at desc, id desc);
