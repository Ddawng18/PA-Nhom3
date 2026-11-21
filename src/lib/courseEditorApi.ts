import { requestAdminApi } from "./adminApi";
import { z } from "zod";
import type { CourseEditorModel } from "../hooks/useCourseEditor";
import type { CourseInfo } from "../logic/courseEditor";

export async function loadCourseEditorVersion(token: string, courseId: string | number) {
  const response = await requestAdminApi(`/api/courses/${courseId}/editor/version`, { token });
  if (!response || typeof response !== "object" || !("version" in response) || typeof response.version !== "string") {
    throw new Error("Phản hồi phiên bản editor không hợp lệ.");
  }
  return response.version;
}

export async function saveCourseEditor(
  token: string,
  course: CourseEditorModel,
  expectedVersion: string,
  signal?: AbortSignal,
  courseInfo?: CourseInfo
) {
  let nextId = -1;
  const chapters = course.chuong.map((chapter) => {
    const id = chapter.ma_chuong ?? nextId--;
    return { id, title: chapter.tieu_de, order: chapter.thu_tu };
  });
  // Map by row identity: several new rows can all have a null database ID.
  const lessons = course.chuong.flatMap((chapter, chapterIndex) =>
    chapter.bai_hoc.map(lesson => ({ lesson, chapterId: chapters[chapterIndex].id })));
  const lessonRows = lessons.map(({ lesson, chapterId }) => ({
    id: lesson.ma_bai_hoc ?? nextId--, chapterId,
    title: lesson.tieu_de, order: lesson.thu_tu,
    textContent: lesson.noi_dung_van_ban || null,
    imagePath: lesson.duong_dan_anh || null,
    videoUrl: lesson.lien_ket_video || null, required: lesson.bat_buoc,
  }));
  const assignmentRows = lessons.map(({ lesson }, index) => lesson.bai_tap ? {
    id: lesson.bai_tap.ma_bai_tap ?? nextId--, lessonId: lessonRows[index].id,
    prompt: lesson.bai_tap.de_bai, deadline: lesson.bai_tap.han_nop,
    required: lesson.bai_tap.bat_buoc,
  } : null);
  const assignments = assignmentRows.filter(row => row !== null);
  const response = await requestAdminApi(`/api/courses/${course.ma_khoa_hoc}/editor`, {
    token,
    method: "PUT",
    signal,
    body: {
      chapters,
      lessons: lessonRows,
      assignments,
      attachments: lessons.flatMap(({ lesson }, index) => lesson.tep_dinh_kem.map((attachment) => ({
        id: attachment.ma_tep,
        lessonId: lessonRows[index].id,
        name: attachment.ten_tep,
        path: attachment.duong_dan,
        type: attachment.loai_tep,
        size: attachment.dung_luong,
      }))),
      rubrics: lessons.flatMap(({ lesson }, index) => lesson.bai_tap?.tieu_chi.map((rubric) => ({
        id: rubric.ma_tieu_chi,
        assignmentId: assignmentRows[index]?.id,
        name: rubric.ten_tieu_chi,
        weight: rubric.ty_trong,
        order: rubric.thu_tu,
      })) ?? []),
      expectedVersion,
      courseInfo: courseInfo ? { ...courseInfo, ngay_khai_giang: courseInfo.ngay_khai_giang || null } : null,
    },
  });
  return z.object({
    courseId: z.union([z.string(), z.number()]),
    chapters: z.number(),
    lessons: z.number(),
    chapterIds: z.array(z.number()),
    lessonIds: z.array(z.number()),
    assignmentIds: z.array(z.number()),
    version: z.string(),
  }).parse(response);
}
