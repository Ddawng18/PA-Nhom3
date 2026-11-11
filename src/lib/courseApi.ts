import { z } from "zod";
import { requestAdminApi } from "./adminApi";
import type { CourseInfo } from "../logic/courseEditor";

export const courseRowSchema = z.object({
  ma_khoa_hoc: z.number().int().safe(), ma_giao_vien: z.string(), tieu_de: z.string(),
  cap_do: z.string(), chu_de: z.string(), mo_ta: z.string(), anh_dai_dien: z.string().nullable(), trang_thai: z.string(), ngay_tao: z.string(),
});
const listSchema = z.object({ items: z.array(courseRowSchema), totalCount: z.number().int() });
export async function getCourse(token: string, id: string, signal?: AbortSignal) {
  return courseRowSchema.parse(await requestAdminApi(`/api/courses/${encodeURIComponent(id)}`, { token, signal }));
}
export async function listCourses(token: string, signal?: AbortSignal) {
  const rows: z.infer<typeof courseRowSchema>[] = [];
  for (let page = 1; ; page++) {
    const result = listSchema.parse(await requestAdminApi("/api/courses", { token, signal }, { page, pageSize: 100 }));
    rows.push(...result.items);
    if (rows.length >= result.totalCount || result.items.length === 0) return rows;
  }
}
export async function saveCourseInfo(token: string, id: string | undefined, values: CourseInfo) {
  return courseRowSchema.parse(await requestAdminApi(id ? `/api/courses/${encodeURIComponent(id)}` : "/api/courses", {
    token, method: id ? "PUT" : "POST", body: values,
  }));
}
export async function submitCourse(token: string, id: string | number) {
  return requestAdminApi(`/api/courses/${encodeURIComponent(id)}/submit`, { token, method: "POST" });
}
