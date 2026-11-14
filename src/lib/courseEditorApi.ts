import { requestAdminApi } from "./adminApi";
import type { CourseEditorModel } from "../hooks/useCourseEditor";

export async function saveCourseEditor(
  token: string,
  course: CourseEditorModel,
  signal?: AbortSignal
) {
  const lessons = course.chuong.flatMap((chapter) => chapter.bai_hoc);
  return requestAdminApi(`/api/courses/${course.ma_khoa_hoc}/editor`, {
    token,
    method: "PUT",
    signal,
    body: {
      chapters: course.chuong.map((chapter) => ({
        id: chapter.ma_chuong,
        title: chapter.tieu_de,
        order: chapter.thu_tu,
      })),
      lessons: lessons.map((lesson) => ({
        id: lesson.ma_bai_hoc,
        chapterId: lesson.ma_chuong,
        title: lesson.tieu_de,
        order: lesson.thu_tu,
        textContent: lesson.noi_dung_van_ban || null,
        imagePath: lesson.duong_dan_anh || null,
        videoUrl: lesson.lien_ket_video || null,
        required: lesson.bat_buoc,
      })),
      assignments: lessons.flatMap((lesson) => lesson.bai_tap ? [{
        id: lesson.bai_tap.ma_bai_tap,
        lessonId: lesson.ma_bai_hoc,
        prompt: lesson.bai_tap.de_bai,
        deadline: lesson.bai_tap.han_nop,
        required: lesson.bai_tap.bat_buoc,
      }] : []),
      attachments: lessons.flatMap((lesson) => lesson.tep_dinh_kem.map((attachment) => ({
        id: attachment.ma_tep,
        lessonId: lesson.ma_bai_hoc,
        name: attachment.ten_tep,
        path: attachment.duong_dan,
        type: attachment.loai_tep,
        size: attachment.dung_luong,
      }))),
      rubrics: lessons.flatMap((lesson) => lesson.bai_tap?.tieu_chi.map((rubric) => ({
        id: rubric.ma_tieu_chi,
        assignmentId: lesson.bai_tap?.ma_bai_tap,
        name: rubric.ten_tieu_chi,
        weight: rubric.ty_trong,
        order: rubric.thu_tu,
      })) ?? []),
    },
  });
}
