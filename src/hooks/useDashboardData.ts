import { useEffect, useState } from "react";
import { z } from "zod";
import { completedLessonStatus } from "../data/dashboardStatuses";
import { pickCurrentEnrollment } from "../logic/dashboard";
import { supabase } from "../lib/supabase";

const idSchema = z.union([
  z.number().int(),
  z.string().regex(/^\d+$/),
]);

const enrollmentSchema = z.object({
  ma_khoa_hoc: idSchema,
  trang_thai: z.string(),
  ngay_ghi_danh: z.string().datetime({ offset: true }),
});

const courseSchema = z.object({
  ma_khoa_hoc: idSchema,
  ma_giao_vien: z.string(),
  tieu_de: z.string(),
  cap_do: z.string().nullable(),
});

const teacherSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
});

const chapterSchema = z.object({
  ma_chuong: idSchema,
});

const lessonSchema = z.object({
  ma_bai_hoc: idSchema,
});

const completedProgressSchema = z.object({
  ma_bai_hoc: idSchema,
});

export type DashboardCourse = {
  title: string;
  level: string | null;
  teacherName: string | null;
  totalLessons: number;
  completedLessons: number;
  percent: number;
};

export type DashboardData = {
  course: DashboardCourse | null;
  completedLessonCount: number;
};

type DashboardState = {
  userId: string | null;
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
};

const loadErrorMessage = "Không thể tải dữ liệu học tập. Vui lòng thử lại sau.";
const invalidDataMessage = "Dữ liệu học tập không đúng định dạng. Vui lòng thử lại sau.";
const configurationErrorMessage = "Ứng dụng chưa được cấu hình Supabase. Không thể tải dữ liệu học tập.";

function requireParsed<T>(result: z.ZodSafeParseResult<T>): T {
  if (!result.success) throw new Error(invalidDataMessage);
  return result.data;
}

export function useDashboardData(userId: string | null) {
  const [state, setState] = useState<DashboardState>({
    userId: null,
    data: null,
    loading: Boolean(userId),
    error: null,
  });

  useEffect(() => {
    let active = true;

    if (!userId) {
      setState({ userId: null, data: null, loading: false, error: null });
      return () => {
        active = false;
      };
    }

    setState({ userId, data: null, loading: true, error: null });

    async function loadDashboard() {
      const client = supabase;
      if (!client) {
        if (active) {
          setState({ userId, data: null, loading: false, error: configurationErrorMessage });
        }
        return;
      }

      try {
        const { data: enrollmentRows, error: enrollmentError } = await client
          .from("ghi_danh")
          .select("ma_khoa_hoc, trang_thai, ngay_ghi_danh")
          .eq("ma_nguoi_dung", userId)
          .order("ngay_ghi_danh", { ascending: false });

        if (enrollmentError) throw enrollmentError;
        const enrollments = requireParsed(z.array(enrollmentSchema).safeParse(enrollmentRows));
        const currentEnrollment = pickCurrentEnrollment(enrollments);
        let course: DashboardCourse | null = null;
        let lessonIds: (number | string)[] = [];

        if (currentEnrollment) {
          const { data: courseRow, error: courseError } = await client
            .from("khoa_hoc")
            .select("ma_khoa_hoc, ma_giao_vien, tieu_de, cap_do")
            .eq("ma_khoa_hoc", currentEnrollment.ma_khoa_hoc)
            .maybeSingle();

          if (courseError) throw courseError;
          if (!courseRow) throw new Error(loadErrorMessage);
          const parsedCourse = requireParsed(courseSchema.safeParse(courseRow));

          const { data: teacherRow, error: teacherError } = await client
            .from("nguoi_dung")
            .select("id, display_name")
            .eq("id", parsedCourse.ma_giao_vien)
            .maybeSingle();

          if (teacherError) throw teacherError;
          const teacher = teacherRow
            ? requireParsed(teacherSchema.safeParse(teacherRow))
            : null;

          const { data: chapterRows, error: chapterError } = await client
            .from("chuong")
            .select("ma_chuong")
            .eq("ma_khoa_hoc", parsedCourse.ma_khoa_hoc);

          if (chapterError) throw chapterError;
          const chapters = requireParsed(z.array(chapterSchema).safeParse(chapterRows));
          if (chapters.length) {
            const { data: lessonRows, error: lessonError } = await client
              .from("bai_hoc")
              .select("ma_bai_hoc")
              .in("ma_chuong", chapters.map((chapter) => chapter.ma_chuong));

            if (lessonError) throw lessonError;
            lessonIds = requireParsed(z.array(lessonSchema).safeParse(lessonRows))
              .map((lesson) => lesson.ma_bai_hoc);
          }

          course = {
            title: parsedCourse.tieu_de,
            level: parsedCourse.cap_do,
            teacherName: teacher?.display_name?.trim() || null,
            totalLessons: lessonIds.length,
            completedLessons: 0,
            percent: 0,
          };
        }

        const { data: progressRows, error: progressError } = await client
          .from("tien_do_bai_hoc")
          .select("ma_bai_hoc")
          .eq("ma_nguoi_dung", userId)
          .eq("trang_thai", completedLessonStatus);

        if (progressError) throw progressError;
        const completedProgress = requireParsed(
          z.array(completedProgressSchema).safeParse(progressRows)
        );
        const completedIds = new Set(completedProgress.map((row) => String(row.ma_bai_hoc)));
        const completedLessonCount = completedProgress.length;

        if (course) {
          course.completedLessons = lessonIds.filter((id) => completedIds.has(String(id))).length;
          course.percent = course.totalLessons === 0
            ? 0
            : Math.round(course.completedLessons / course.totalLessons * 100);
        }

        if (active) {
          setState({
            userId,
            data: { course, completedLessonCount },
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (!active) return;
        const message = error instanceof Error && error.message === invalidDataMessage
          ? invalidDataMessage
          : loadErrorMessage;
        setState({ userId, data: null, loading: false, error: message });
      }
    }

    void loadDashboard();

    return () => {
      active = false;
    };
  }, [userId]);

  const matchesUser = state.userId === userId;
  return {
    data: matchesUser ? state.data : null,
    loading: Boolean(userId) && (!matchesUser || state.loading),
    error: matchesUser ? state.error : null,
  };
}
