import { z } from "zod";
import { AdminApiError, requestAdminApi } from "./adminApi";

const id = z.number().int().safe().positive();
export const learnerLessonSchema = z.object({ ma_bai_hoc: id, tieu_de: z.string(), thu_tu: z.number(), trang_thai: z.string() });
export const learningCourseSchema = z.object({
  ma_khoa_hoc: id, tieu_de: z.string(), mo_ta: z.string(), cap_do: z.string(), chu_de: z.string(),
  anh_dai_dien: z.string().nullable(), da_ghi_danh: z.boolean(), phan_tram: z.number(),
  trang_thai_ghi_danh: z.string().nullable(),
  chuong: z.array(z.object({ ma_chuong: id, tieu_de: z.string(), thu_tu: z.number(), bai_hoc: z.array(learnerLessonSchema) })),
});
export const lessonContentSchema = z.object({
  ma_bai_hoc: id, ma_khoa_hoc: id, ma_chuong: id, tieu_de: z.string(),
  noi_dung_van_ban: z.string().nullable(), duong_dan_anh: z.string().nullable(), lien_ket_video: z.string().nullable(),
  bat_buoc: z.boolean(), trang_thai: z.string(), phan_tram: z.number(),
});
export const gradeSchema = z.object({ score: z.number(), feedback: z.string(), gradedAt: z.string() });
export const submissionSchema = z.object({ id, status: z.string(), submittedAt: z.string(), updatedAt: z.string(), grade: gradeSchema.nullable() });
export const assignmentSchema = z.object({ id, lessonId: id, courseId: id, lessonTitle: z.string(), prompt: z.string(),
  deadline: z.string().nullable(), required: z.boolean(), submission: submissionSchema.nullable() });
export type LearningCourse = z.infer<typeof learningCourseSchema>;
export type LessonContent = z.infer<typeof lessonContentSchema>;
export type LearnerAssignment = z.infer<typeof assignmentSchema>;
export const myCourseSchema = z.object({ id, title: z.string(), level: z.string(), status: z.string(), available: z.boolean(),
  coverImage: z.string().nullable(), percent: z.number(), totalLessons: z.number(), completedLessons: z.number() });
export type MyCourse = z.infer<typeof myCourseSchema>;

export async function loadMyCourses(token: string, signal?: AbortSignal) {
  return z.array(myCourseSchema).parse(await requestAdminApi("/api/courses/mine", { token, signal }));
}
export async function loadLearningCourse(token: string, courseId: string, signal?: AbortSignal) {
  return learningCourseSchema.parse(await requestAdminApi(`/api/courses/${encodeURIComponent(courseId)}/learning`, { token, signal }));
}
export async function loadLesson(token: string, courseId: string, lessonId: string, signal?: AbortSignal) {
  return lessonContentSchema.parse(await requestAdminApi(`/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}`, { token, signal }));
}
export async function updateLesson(token: string, courseId: string, lessonId: string, status: "DANG_HOC" | "DA_HOAN_THANH", signal?: AbortSignal) {
  return requestAdminApi(`/api/courses/${encodeURIComponent(courseId)}/lessons/${encodeURIComponent(lessonId)}/progress`, {
    token, method: "PUT", body: { trang_thai: status }, signal,
  });
}
export async function loadAssignments(token: string, lessonId?: number, signal?: AbortSignal) {
  return z.array(assignmentSchema).parse(await requestAdminApi("/api/assignments", { token, signal }, { lessonId }));
}
export async function submitAssignment(token: string, assignmentId: number, file: File) {
  const form = new FormData(); form.append("file", file);
  return submissionSchema.parse(await requestAdminApi(`/api/assignments/${assignmentId}/submission`, { token, method: "POST", body: form }));
}
export const teacherWorkSchema = z.object({
  lessons: z.array(z.object({ id, title: z.string() })),
  assignments: z.array(z.object({ id, lessonId: id, prompt: z.string(), deadline: z.string().nullable(), required: z.boolean() })),
  submissions: z.array(submissionSchema.extend({ assignmentId: id, studentId: z.string() })),
});
export type TeacherWork = z.infer<typeof teacherWorkSchema>;
export async function loadTeacherWork(token: string, courseId: string, signal?: AbortSignal) {
  return teacherWorkSchema.parse(await requestAdminApi("/api/assignments/teacher", { token, signal }, { courseId }));
}
export async function saveGrade(token: string, submission: TeacherWork["submissions"][number], score: number, feedback: string) {
  return gradeSchema.parse(await requestAdminApi(`/api/assignments/submissions/${submission.id}/grade`, {
    token, method: "PUT", body: { score, feedback, expectedUpdatedAt: submission.updatedAt, expectedGradedAt: submission.grade?.gradedAt ?? null },
  }));
}
export function learningError(error: unknown) {
  if (error instanceof AdminApiError && !error.message) {
    if (error.status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    if (error.status === 403) return "Bạn chưa có quyền học hoặc thực hiện thao tác này. Kiểm tra tài khoản và ghi danh khóa học.";
    if (error.status === 404) return "Không tìm thấy nội dung hoặc khóa học đang tạm ẩn.";
    if (error.status === 413) return "Ảnh vượt quá giới hạn 10 MB.";
    if (error.status >= 500) return "Máy chủ chưa thể xử lý yêu cầu. Vui lòng thử lại sau.";
  }
  return error instanceof Error && error.message ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại.";
}
