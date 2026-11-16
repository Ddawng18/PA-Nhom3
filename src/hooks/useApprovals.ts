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
  requestAdminApi,
  UnsupportedCourseApprovalError,
  type PortfolioFile,
  type TeacherProfileDetail,
  type TeacherProfileListItem,
} from "../lib/adminApi";
import { mapApiError } from "../logic/approvals";

const pendingCourseSchema = z.object({
  id: z.number().int().safe(), teacherId: z.string(), title: z.string(),
  teacherName: z.string().nullable(), teacherEmail: z.string().nullable(),
  level: z.string(), topic: z.string(), status: z.string(),
  chapterCount: z.number().int(), createdAt: z.string(),
  coverImage: z.string().nullable().optional(),
});
const pendingCoursePageSchema = z.object({ items: z.array(pendingCourseSchema), totalCount: z.number().int() });
export type ApprovalCourse = {
  ma_khoa_hoc: number; ma_giao_vien: string; tieu_de: string; cap_do: string;
  chu_de: string; trang_thai: string; ngay_tao: string;
  anh_dai_dien: string | null; teacherName: string; chapterCount: number;
};

type ApprovalCounts = { teachers: number; courses: number; total: number };
type ApiResult = { error: string | null };
type CourseMutation = "approve-course" | "reject-course";
type TeacherMutation = "approve-teacher" | "reject-teacher";

const emptyCounts: ApprovalCounts = { teachers: 0, courses: 0, total: 0 };
const loadError = "Chưa thể tải danh sách. Vui lòng thử lại.";

function getApiErrorMessage(error: unknown): string {
  if (error instanceof AdminApiTimeoutError) return error.message;
  if (error instanceof UnsupportedCourseApprovalError) return error.message;
  if (error instanceof AdminApiError) return mapApiError(error.status, error.code);
  if (error instanceof Error && error.message === "Chưa cấu hình địa chỉ máy chủ.") return error.message;
  return mapApiError(0);
}

async function loadCourseRows(token: string, signal: AbortSignal): Promise<ApprovalCourse[]> {
  const rows: ApprovalCourse[] = [];
  for (let page = 1; ; page++) {
    const result = pendingCoursePageSchema.parse(await requestAdminApi("/api/admin/courses", { token, signal }, {
      status: "CHO_DUYET", page, pageSize: 100,
    }));
    rows.push(...result.items.map(course => ({
      ma_khoa_hoc: course.id, ma_giao_vien: course.teacherId, tieu_de: course.title,
      cap_do: course.level, chu_de: course.topic, trang_thai: course.status,
      ngay_tao: course.createdAt, anh_dai_dien: course.coverImage ?? null,
      teacherName: course.teacherName?.trim() || course.teacherEmail || "Giáo viên LINEA",
      chapterCount: course.chapterCount,
    })));
    if (rows.length >= result.totalCount || result.items.length === 0) return rows;
  }
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
  const refresh = useCallback(() => {
    setDetails({}); setDetailErrors({}); setSignedUrls({}); setImageErrors({});
    setReloadKey((value) => value + 1);
  }, []);

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
    loadCourseRows(token, controller.signal)
      .then((rows) => {
        if (controller.signal.aborted) return;
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
      setTeacherItems(current => current.filter(item => item.id !== id));
      setTeacherTotal(current => Math.max(0, current - 1));
      setCounts(current => ({ ...current, teachers: Math.max(0, current.teachers - 1), total: Math.max(0, current.total - 1) }));
      setDetails(current => { const next = { ...current }; delete next[id]; return next; });
      return { error: null };
    } catch (error) {
      const message = getApiErrorMessage(error);
      return { error: message };
    }
  }, [token]);

  const runCourseMutation = useCallback(async (
    type: CourseMutation,
    courseId: number,
    reason?: string
  ): Promise<ApiResult> => {
    if (!token) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };
    try {
      if (type === "approve-course") await approveCourse(token, courseId);
      else await rejectCourse(token, courseId, reason ?? "");
      setCourses(current => current.filter(course => course.ma_khoa_hoc !== courseId));
      setCounts(current => ({ ...current, courses: Math.max(0, current.courses - 1), total: Math.max(0, current.total - 1) }));
      return { error: null };
    } catch (error) {
      return { error: getApiErrorMessage(error) };
    }
  }, [token]);

  const pageCount = Math.max(teacherPage, Math.ceil(teacherTotal / 20));

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
