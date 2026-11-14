import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";

const idSchema = z.union([z.string().regex(/^\d+$/), z.number().int().safe()]).transform(String);
const enrollmentSchema = z.object({
  ma_khoa_hoc: idSchema,
  trang_thai: z.enum(["DANG_HOC", "HOAN_THANH", "DA_HUY"]),
});
const courseSchema = z.object({
  ma_khoa_hoc: idSchema,
  tieu_de: z.string(),
  cap_do: z.string().nullable(),
});

export type StudentCourseStatus = "in-progress" | "completed";
export type StudentCourse = {
  id: string;
  title: string;
  level: string | null;
  status: StudentCourseStatus;
  available: boolean;
};

export function mapStudentCourses(enrollmentRows: unknown, courseRows: unknown): StudentCourse[] {
  const enrollments = z.array(enrollmentSchema).parse(enrollmentRows);
  const courses = new Map(z.array(courseSchema).parse(courseRows).map(course => [course.ma_khoa_hoc, course]));
  return enrollments.filter(enrollment => enrollment.trang_thai !== "DA_HUY").map(enrollment => {
    const course = courses.get(enrollment.ma_khoa_hoc);
    return {
      id: enrollment.ma_khoa_hoc,
      title: course?.tieu_de ?? "Khóa học tạm thời không hiển thị",
      level: course?.cap_do ?? null,
      status: enrollment.trang_thai === "HOAN_THANH" ? "completed" : "in-progress",
      available: Boolean(course),
    };
  });
}

export async function loadStudentCourses(client: Pick<SupabaseClient, "from">, userId: string, signal: AbortSignal) {
  const enrollmentResult = await client.from("ghi_danh")
    .select("ma_khoa_hoc, trang_thai")
    .eq("ma_nguoi_dung", userId)
    .in("trang_thai", ["DANG_HOC", "HOAN_THANH"])
    .order("ngay_ghi_danh", { ascending: false })
    .abortSignal(signal);
  if (enrollmentResult.error) throw enrollmentResult.error;
  const enrollments = z.array(enrollmentSchema).parse(enrollmentResult.data);
  if (enrollments.length === 0) return [];

  // Keep URL filters bounded when an account has many enrollments.
  const ids = [...new Set(enrollments.map(enrollment => enrollment.ma_khoa_hoc))];
  const courses: z.infer<typeof courseSchema>[] = [];
  for (let offset = 0; offset < ids.length; offset += 100) {
    const result = await client.from("khoa_hoc")
      .select("ma_khoa_hoc, tieu_de, cap_do")
      .in("ma_khoa_hoc", ids.slice(offset, offset + 100))
      .abortSignal(signal);
    if (result.error) throw result.error;
    courses.push(...z.array(courseSchema).parse(result.data));
  }
  return mapStudentCourses(enrollments, courses);
}
