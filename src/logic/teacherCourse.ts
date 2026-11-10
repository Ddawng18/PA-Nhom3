import { z } from "zod";
import { courseLevels, courseStatuses } from "../data/teacherCourseOptions";

const videoUrlSchema = z.string().refine(
  (value) => value.length === 0 || z.string().url().safeParse(value).success,
  "Vui lòng nhập URL video hợp lệ."
);

export const lessonFormSchema = z.object({
  id: z.string(),
  tieu_de: z.string(),
  thu_tu: z.number().int().positive(),
  noi_dung_van_ban: z.string(),
  duong_dan_anh: z.string(),
  lien_ket_video: videoUrlSchema,
  bat_buoc: z.boolean(),
});

export const chapterFormSchema = z.object({
  id: z.string(),
  tieu_de: z.string(),
  thu_tu: z.number().int().positive(),
  bai_hoc: z.array(lessonFormSchema),
});

export const teacherCourseFormSchema = z.object({
  tieu_de: z.string()
    .trim()
    .min(1, "Vui lòng nhập tiêu đề khóa học.")
    .max(200, "Tiêu đề không được vượt quá 200 ký tự."),
  cap_do: z.enum(courseLevels, { error: "Vui lòng chọn cấp độ." }),
  chu_de: z.string(),
  mo_ta: z.string().max(2000, "Mô tả không được vượt quá 2000 ký tự."),
  anh_dai_dien: z.string(),
  trang_thai: z.enum(courseStatuses, { error: "Vui lòng chọn trạng thái." }),
  chuong: z.array(chapterFormSchema),
});

export type TeacherCourseFormValues = z.infer<typeof teacherCourseFormSchema>;

export function resequence<T extends { thu_tu: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, thu_tu: index + 1 }));
}

export function moveAndResequence<T extends { thu_tu: number }>(
  items: T[],
  index: number,
  direction: -1 | 1
): T[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) {
    return resequence(items);
  }

  const nextItems = [...items];
  [nextItems[index], nextItems[nextIndex]] = [nextItems[nextIndex], nextItems[index]];
  return resequence(nextItems);
}

export type TeacherRouteState = {
  loading: boolean;
  role: string | null;
  error: string | null;
};

export function getTeacherRouteDecision(
  state: TeacherRouteState
): "loading" | "error" | "redirect" | "allowed" {
  if (state.loading) return "loading";
  if (state.error) return "error";
  return state.role === "teacher" ? "allowed" : "redirect";
}
