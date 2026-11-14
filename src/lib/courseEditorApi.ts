import { requestAdminApi } from "./adminApi";
import { z } from "zod";
import type { CourseEditorModel } from "../hooks/useCourseEditor";

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
  signal?: AbortSignal
) {
  let nextId = -1;
  const chapterIds = new Map<string | number | null, string | number>();
  const chapters = course.chuong.map((chapter) => {
    const id = chapter.ma_chuong ?? nextId--;
    chapterIds.set(chapter.ma_chuong, id);
    return { id, title: chapter.tieu_de, order: chapter.thu_tu };
  });
  const lessons = course.chuong.flatMap((chapter) => chapter.bai_hoc);
  const lessonIds = new Map<string | number | null, string | number>();
  const lessonRows = lessons.map((lesson) => {
    const id = lesson.ma_bai_hoc ?? nextId--;
    lessonIds.set(lesson.ma_bai_hoc, id);
    return {
      id,
      chapterId: chapterIds.get(lesson.ma_chuong) ?? lesson.ma_chuong,
      title: lesson.tieu_de,
      order: lesson.thu_tu,
      textContent: lesson.noi_dung_van_ban || null,
      imagePath: lesson.duong_dan_anh || null,
      videoUrl: lesson.lien_ket_video || null,
      required: lesson.bat_buoc,
    };
  });
  const assignments = lessons.flatMap((lesson) => lesson.bai_tap ? [{
    id: lesson.bai_tap.ma_bai_tap ?? nextId--,
    lessonId: lessonIds.get(lesson.ma_bai_hoc) ?? lesson.ma_bai_hoc,
    prompt: lesson.bai_tap.de_bai,
    deadline: lesson.bai_tap.han_nop,
    required: lesson.bai_tap.bat_buoc,
  }] : []);
  const assignmentIdsByLesson = new Map<string | number | null, string | number>();
  lessons.forEach((lesson) => {
    const assignment = assignments.find((item) => item.lessonId === lessonIds.get(lesson.ma_bai_hoc));
    if (assignment) assignmentIdsByLesson.set(lesson.ma_bai_hoc, assignment.id);
  });
  const response = await requestAdminApi(`/api/courses/${course.ma_khoa_hoc}/editor`, {
    token,
    method: "PUT",
    signal,
    body: {
      chapters,
      lessons: lessonRows,
      assignments,
      attachments: lessons.flatMap((lesson) => lesson.tep_dinh_kem.map((attachment) => ({
        id: attachment.ma_tep,
        lessonId: lessonIds.get(lesson.ma_bai_hoc) ?? lesson.ma_bai_hoc,
        name: attachment.ten_tep,
        path: attachment.duong_dan,
        type: attachment.loai_tep,
        size: attachment.dung_luong,
      }))),
      rubrics: lessons.flatMap((lesson) => lesson.bai_tap?.tieu_chi.map((rubric) => ({
        id: rubric.ma_tieu_chi,
        assignmentId: assignmentIdsByLesson.get(lesson.ma_bai_hoc),
        name: rubric.ten_tieu_chi,
        weight: rubric.ty_trong,
        order: rubric.thu_tu,
      })) ?? []),
      expectedVersion,
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
