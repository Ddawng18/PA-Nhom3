import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import {
  AdminApiError,
  AdminApiTimeoutError,
  approveCourse,
  approveTeacherProfile,
  getPortfolioSignedUrl,
  getTeacherProfile,
  getTeacherProfiles,
  rejectCourse,
  rejectTeacherProfile,
  UnsupportedCourseApprovalError,
  type PortfolioFile,
  type TeacherProfileDetail,
  type TeacherProfileListItem,
} from "../lib/adminApi";
import { mapApiError } from "../logic/approvals";
import { supabase } from "../lib/supabase";

const courseRowSchema = z.object({
  ma_khoa_hoc: z.number().int().safe(),
  ma_giao_vien: z.string(),
  tieu_de: z.string(),
  cap_do: z.string(),
  chu_de: z.string(),
  anh_dai_dien: z.string().url().refine((value) => new URL(value).protocol === "https:").nullable(),
  ngay_tao: z.string().datetime({ offset: true }),
  trang_thai: z.string(),
});

const teacherNameSchema = z.object({
  id: z.string(),
  display_name: z.string().nullable(),
});

const chapterSchema = z.object({
  ma_chuong: z.number().int().safe(),
  ma_khoa_hoc: z.number().int().safe(),
  tieu_de: z.string(),
  thu_tu: z.number().int(),
});

const lessonSchema = z.object({
  ma_bai_hoc: z.number().int().safe(),
  ma_chuong: z.number().int().safe(),
  tieu_de: z.string(),
  thu_tu: z.number().int(),
});

export type ApprovalCourse = z.infer<typeof courseRowSchema> & {
  teacherName: string;
  chapters: Array<z.infer<typeof chapterSchema> & { lessons: z.infer<typeof lessonSchema>[] }>;
  lessonCount: number;
};

type ApprovalCounts = { teachers: number; courses: number; total: number };
type ApiResult = { error: string | null };
type CourseMutation = "approve-course" | "reject-course";
type TeacherMutation = "approve-teacher" | "reject-teacher";

const emptyCounts: ApprovalCounts = { teachers: 0, courses: 0, total: 0 };
const invalidDataError = "Dữ liệu nhận được không đúng định dạng. Vui lòng thử lại.";
const loadError = "Chưa thể tải danh sách. Vui lòng thử lại.";

function getApiErrorMessage(error: unknown): string {
  if (error instanceof AdminApiTimeoutError) return error.message;
  if (error instanceof UnsupportedCourseApprovalError) return error.message;
  if (error instanceof AdminApiError) return mapApiError(error.status, error.code);
  if (error instanceof Error && error.message === "Chưa cấu hình địa chỉ máy chủ.") return error.message;
  return mapApiError(0);
}

function getSupabaseErrorMessage(error: { code?: string; status?: number }): string {
  if (error.status === 401) return mapApiError(401);
  if (error.status === 403 || error.code === "42501") return mapApiError(403);
  return loadError;
}

async function loadCourseRows(signal: AbortSignal): Promise<ApprovalCourse[]> {
  if (!supabase) throw new Error("Ứng dụng chưa được cấu hình Supabase.");
  const { data: rawCourses, error: coursesError } = await supabase
    .from("khoa_hoc")
    .select("ma_khoa_hoc, ma_giao_vien, tieu_de, cap_do, chu_de, anh_dai_dien, ngay_tao, trang_thai")
    .eq("trang_thai", "CHO_DUYET")
    .order("ngay_tao", { ascending: true })
    .abortSignal(signal);
  if (coursesError) throw new Error(getSupabaseErrorMessage(coursesError));
  const parsedCourses = z.array(courseRowSchema).safeParse(rawCourses);
  if (!parsedCourses.success) throw new Error(invalidDataError);
  if (!parsedCourses.data.length) return [];

  const teacherIds = [...new Set(parsedCourses.data.map((course) => course.ma_giao_vien))];
  const { data: rawTeachers, error: teachersError } = await supabase
    .from("nguoi_dung")
    .select("id, display_name")
    .in("id", teacherIds)
    .abortSignal(signal);
  if (teachersError) throw new Error(getSupabaseErrorMessage(teachersError));
  const parsedTeachers = z.array(teacherNameSchema).safeParse(rawTeachers);
  if (!parsedTeachers.success) throw new Error(invalidDataError);
  const teacherNames = new Map(parsedTeachers.data.map((teacher) => [
    teacher.id,
    teacher.display_name?.trim() || "Giáo viên LINEA",
  ]));

  const { data: rawChapters, error: chaptersError } = await supabase
    .from("chuong")
    .select("ma_chuong, ma_khoa_hoc, tieu_de, thu_tu")
    .in("ma_khoa_hoc", parsedCourses.data.map((course) => course.ma_khoa_hoc))
    .order("thu_tu", { ascending: true })
    .abortSignal(signal);
  if (chaptersError) throw new Error(getSupabaseErrorMessage(chaptersError));
  const parsedChapters = z.array(chapterSchema).safeParse(rawChapters);
  if (!parsedChapters.success) throw new Error(invalidDataError);

  const chapterIds = parsedChapters.data.map((chapter) => chapter.ma_chuong);
  let lessons: z.infer<typeof lessonSchema>[] = [];
  if (chapterIds.length) {
    const { data: rawLessons, error: lessonsError } = await supabase
      .from("bai_hoc")
      .select("ma_bai_hoc, ma_chuong, tieu_de, thu_tu")
      .in("ma_chuong", chapterIds)
      .order("thu_tu", { ascending: true })
      .abortSignal(signal);
    if (lessonsError) throw new Error(getSupabaseErrorMessage(lessonsError));
    const parsedLessons = z.array(lessonSchema).safeParse(rawLessons);
    if (!parsedLessons.success) throw new Error(invalidDataError);
    lessons = parsedLessons.data;
  }

  const chaptersByCourse = new Map<number, ApprovalCourse["chapters"]>();
  for (const chapter of parsedChapters.data) {
    const courseChapters = chaptersByCourse.get(chapter.ma_khoa_hoc) ?? [];
    courseChapters.push({
      ...chapter,
      lessons: lessons.filter((lesson) => lesson.ma_chuong === chapter.ma_chuong),
    });
    chaptersByCourse.set(chapter.ma_khoa_hoc, courseChapters);
  }

  return parsedCourses.data.map((course) => {
    const chapters = chaptersByCourse.get(course.ma_khoa_hoc) ?? [];
    return {
      ...course,
      teacherName: teacherNames.get(course.ma_giao_vien) ?? "Giáo viên LINEA",
      chapters,
      lessonCount: chapters.reduce((total, chapter) => total + chapter.lessons.length, 0),
    };
  });
}

export function useApprovals(active: boolean, isAdmin: boolean, token: string | undefined) {
  const [teacherItems, setTeacherItems] = useState<TeacherProfileListItem[]>([]);
  const [teacherTotal, setTeacherTotal] = useState(0);
  const [teacherPage, setTeacherPage] = useState(1);
  const [teacherStatus, setTeacherStatus] = useState("CHO_DUYET");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState<string | null>(null);
  const [courses, setCourses] = useState<ApprovalCourse[]>([]);
  const [courseLoading, setCourseLoading] = useState(false);
  const [courseError, setCourseError] = useState<string | null>(null);
  const [counts, setCounts] = useState(emptyCounts);
  const [details, setDetails] = useState<Record<number, TeacherProfileDetail>>({});
  const [detailErrors, setDetailErrors] = useState<Record<number, string>>({});
  const [signedUrls, setSignedUrls] = useState<Record<number, { url: string; expiresAt: string }>>({});
  const [imageErrors, setImageErrors] = useState<Record<number, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
      setTeacherPage(1);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!active || !isAdmin || !token) return;
    const controller = new AbortController();
    setTeacherLoading(true);
    setTeacherError(null);
    getTeacherProfiles(token, {
      status: teacherStatus,
      q: debouncedSearch,
      page: teacherPage,
      pageSize: 20,
    }, controller.signal)
      .then((response) => {
        setTeacherItems(response.items);
        setTeacherTotal(response.total);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setTeacherError(getApiErrorMessage(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setTeacherLoading(false);
      });
    return () => controller.abort();
  }, [active, isAdmin, token, teacherStatus, debouncedSearch, teacherPage, reloadKey]);

  useEffect(() => {
    if (!active || !isAdmin || !token) return;
    const controller = new AbortController();
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 30_000);
    setCourseLoading(true);
    setCourseError(null);
    loadCourseRows(controller.signal)
      .then((rows) => {
        setCourses(rows);
        setCounts((current) => ({ ...current, courses: rows.length, total: current.teachers + rows.length }));
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted && !timedOut) return;
        setCourseError(timedOut
          ? "Máy chủ đang phản hồi chậm hoặc đang khởi động. Vui lòng thử lại sau ít phút."
          : error instanceof Error && error.message ? error.message : loadError);
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (!controller.signal.aborted || timedOut) setCourseLoading(false);
      });
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [active, isAdmin, token, reloadKey]);

  useEffect(() => {
    if (!active || !isAdmin || !token) return;
    const controller = new AbortController();
    getTeacherProfiles(token, {
      status: "CHO_DUYET",
      q: "",
      page: 1,
      pageSize: 1,
    }, controller.signal)
      .then((response) => {
        setCounts((current) => ({
          teachers: response.total,
          courses: current.courses,
          total: response.total + current.courses,
        }));
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setTeacherError((current) => current ?? getApiErrorMessage(error));
      });
    return () => controller.abort();
  }, [active, isAdmin, token, reloadKey]);

  const loadSignedUrls = useCallback(async (profileId: number, files: PortfolioFile[], accessToken = token) => {
    if (!accessToken) return;
    await Promise.all(files.map(async (file) => {
      setImageErrors((current) => ({ ...current, [file.id]: "" }));
      try {
        const signed = await getPortfolioSignedUrl(accessToken, profileId, file.id);
        if (new URL(signed.url).protocol !== "https:") throw new Error("Liên kết ảnh không an toàn.");
        setSignedUrls((current) => ({ ...current, [file.id]: signed }));
      } catch (error) {
        setImageErrors((current) => ({ ...current, [file.id]: getApiErrorMessage(error) }));
      }
    }));
  }, [token]);

  const loadTeacherDetail = useCallback(async (id: number) => {
    if (!token || details[id]) return;
    setDetailErrors((current) => ({ ...current, [id]: "" }));
    try {
      const detail = await getTeacherProfile(token, id);
      setDetails((current) => ({ ...current, [id]: detail }));
      setDetailErrors((current) => ({ ...current, [id]: "" }));
      await loadSignedUrls(id, detail.portfolioFiles, token);
    } catch (error) {
      setDetailErrors((current) => ({ ...current, [id]: getApiErrorMessage(error) }));
    }
  }, [details, loadSignedUrls, token]);

  const runTeacherMutation = useCallback(async (
    type: TeacherMutation,
    id: number,
    payload?: { reasonCode: string; reason: string }
  ): Promise<ApiResult> => {
    if (!token) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    try {
      if (type === "approve-teacher") await approveTeacherProfile(token, id);
      else if (payload) await rejectTeacherProfile(token, id, payload);
      refresh();
      return { error: null };
    } catch (error) {
      const message = getApiErrorMessage(error);
      if (error instanceof AdminApiError && error.code === "INVALID_STATUS_TRANSITION") refresh();
      return { error: message };
    }
  }, [refresh, token]);

  const runCourseMutation = useCallback(async (
    type: CourseMutation,
    courseId: number,
    reason?: string
  ): Promise<ApiResult> => {
    if (!token) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    try {
      if (type === "approve-course") await approveCourse(token, courseId);
      else await rejectCourse(token, courseId, reason ?? "");
      refresh();
      return { error: null };
    } catch (error) {
      if (error instanceof AdminApiError && error.code === "INVALID_STATUS_TRANSITION") refresh();
      return { error: getApiErrorMessage(error) };
    }
  }, [refresh, token]);

  const pageCount = Math.max(1, Math.ceil(teacherTotal / 20));
  useEffect(() => {
    if (teacherPage > pageCount) setTeacherPage(pageCount);
  }, [pageCount, teacherPage]);

  return {
    teacherItems,
    teacherTotal,
    teacherPage,
    pageCount,
    teacherStatus,
    search,
    teacherLoading,
    teacherError,
    courses,
    courseLoading,
    courseError,
    counts,
    details,
    detailErrors,
    signedUrls,
    imageErrors,
    setTeacherPage,
    setTeacherStatus,
    setSearch,
    refresh,
    loadTeacherDetail,
    loadSignedUrls,
    runTeacherMutation,
    runCourseMutation,
  };
}
