import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { getCourse, saveCourseInfo, submitCourse } from "../lib/courseApi";
import { AdminApiError } from "../lib/adminApi";
import { supabase } from "../lib/supabase";
import { loadCourseEditorVersion, saveCourseEditor } from "../lib/courseEditorApi";
import { type CourseInfo } from "../logic/courseEditor";

const rowIdSchema = z.union([z.string(), z.number().int()]);
const courseSchema = z.object({
  ma_khoa_hoc: rowIdSchema,
  ma_giao_vien: z.string(),
  tieu_de: z.string(),
  cap_do: z.string(),
  chu_de: z.string(),
  mo_ta: z.string(),
  anh_dai_dien: z.string().nullable(),
  trang_thai: z.string(),
});
const chapterSchema = z.object({
  ma_chuong: rowIdSchema,
  ma_khoa_hoc: rowIdSchema,
  tieu_de: z.string(),
  thu_tu: z.number().int().positive(),
});
const lessonSchema = z.object({
  ma_bai_hoc: rowIdSchema,
  ma_chuong: rowIdSchema,
  tieu_de: z.string(),
  thu_tu: z.number().int().positive(),
  noi_dung_van_ban: z.string().nullable(),
  duong_dan_anh: z.string().nullable(),
  lien_ket_video: z.string().nullable(),
  bat_buoc: z.boolean(),
});
const assignmentSchema = z.object({
  ma_bai_tap: rowIdSchema,
  ma_bai_hoc: rowIdSchema,
  de_bai: z.string(),
  han_nop: z.string().nullable(),
  bat_buoc: z.boolean(),
});
const attachmentSchema = z.object({
  ma_tep: rowIdSchema,
  ma_bai_hoc: rowIdSchema,
  ten_tep: z.string(),
  duong_dan: z.string(),
  loai_tep: z.enum(["IMAGE", "DOCUMENT", "REFERENCE"]),
  dung_luong: z.number(),
});
const rubricSchema = z.object({
  ma_tieu_chi: rowIdSchema,
  ma_bai_tap: rowIdSchema,
  ten_tieu_chi: z.string(),
  ty_trong: z.number().int(),
  thu_tu: z.number().int().positive(),
});

export type CourseEditorAttachment = z.infer<typeof attachmentSchema>;
export type CourseEditorRubric = z.infer<typeof rubricSchema>;
export type CourseEditorAssignment = {
  ma_bai_tap: string | number | null;
  de_bai: string;
  han_nop: string | null;
  bat_buoc: boolean;
  tieu_chi: CourseEditorRubric[];
};
export type CourseEditorLesson = {
  ma_bai_hoc: string | number | null;
  ma_chuong: string | number;
  tieu_de: string;
  thu_tu: number;
  noi_dung_van_ban: string;
  duong_dan_anh: string;
  lien_ket_video: string;
  bat_buoc: boolean;
  bai_tap: CourseEditorAssignment | null;
  tep_dinh_kem: CourseEditorAttachment[];
};
export type CourseEditorChapter = {
  ma_chuong: string | number | null;
  ma_khoa_hoc: string | number;
  tieu_de: string;
  thu_tu: number;
  bai_hoc: CourseEditorLesson[];
};
export type CourseEditorModel = {
  ma_khoa_hoc: string | number;
  ma_giao_vien: string;
  tieu_de: string;
  cap_do: string;
  chu_de: string;
  mo_ta: string;
  anh_dai_dien: string;
  trang_thai: string;
  chuong: CourseEditorChapter[];
};

type EditorState = {
  course: CourseEditorModel | null;
  version: string | null;
  loading: boolean;
  error: string | null;
  notFound: boolean;
  rubricUnavailable: boolean;
};

const genericLoadError = "Không thể tải khóa học. Vui lòng kiểm tra kết nối và thử lại.";
const saveErrorMessage = "Chưa thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.";
const isMissingRubricTable = (message: string) => message.includes("tieu_chi_cham_diem")
  && (message.includes("does not exist") || message.includes("Could not find the table") || message.includes("schema cache"));

export function useCourseEditor(courseId: string | undefined, userId: string) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<EditorState>({
    course: null,
    version: null,
    loading: Boolean(courseId),
    error: null,
    notFound: false,
    rubricUnavailable: false,
  });
  const [attempt, setAttempt] = useState(0);

  const reload = useCallback(() => setAttempt((value) => value + 1), []);

  useEffect(() => {
    let active = true;
    if (!courseId) {
      setState({ course: null, version: null, loading: false, error: null, notFound: false, rubricUnavailable: false });
      return () => {
        active = false;
      };
    }
    if (!supabase) {
      setState({ course: null, version: null, loading: false, error: genericLoadError, notFound: false, rubricUnavailable: false });
      return () => {
        active = false;
      };
    }
    setState({ course: null, version: null, loading: true, error: null, notFound: false, rubricUnavailable: false });
    void (async () => {
      try {
        if (!token) throw new Error(genericLoadError);
        const courseRow = await getCourse(token, courseId);
        const parsedCourse = courseSchema.safeParse(courseRow);
        if (!parsedCourse.success) throw new Error(genericLoadError);
        if (parsedCourse.data.ma_giao_vien !== userId) {
          if (active) setState({ course: null, version: null, loading: false, error: null, notFound: true, rubricUnavailable: false });
          return;
        }
        const course = parsedCourse.data;
        const { data: chapterRows, error: chapterError } = await supabase
          .from("chuong")
          .select("ma_chuong, ma_khoa_hoc, tieu_de, thu_tu")
          .eq("ma_khoa_hoc", course.ma_khoa_hoc)
          .order("thu_tu");
        if (chapterError) throw chapterError;
        const parsedChapters = z.array(chapterSchema).safeParse(chapterRows);
        if (!parsedChapters.success) throw new Error(genericLoadError);
        const chapterIds = parsedChapters.data.map((chapter) => chapter.ma_chuong);
        let parsedLessons: z.infer<typeof lessonSchema>[] = [];
        if (chapterIds.length) {
          const { data: lessonRows, error: lessonError } = await supabase
            .from("bai_hoc")
            .select("ma_bai_hoc, ma_chuong, tieu_de, thu_tu, noi_dung_van_ban, duong_dan_anh, lien_ket_video, bat_buoc")
            .in("ma_chuong", chapterIds)
            .order("thu_tu");
          if (lessonError) throw lessonError;
          const parsed = z.array(lessonSchema).safeParse(lessonRows);
          if (!parsed.success) throw new Error(genericLoadError);
          parsedLessons = parsed.data;
        }
        const lessonIds = parsedLessons.map((lesson) => lesson.ma_bai_hoc);
        let parsedAssignments: z.infer<typeof assignmentSchema>[] = [];
        let parsedAttachments: CourseEditorAttachment[] = [];
        if (lessonIds.length) {
          const [assignmentResult, attachmentResult] = await Promise.all([
            supabase.from("bai_tap").select("ma_bai_tap, ma_bai_hoc, de_bai, han_nop, bat_buoc").in("ma_bai_hoc", lessonIds),
            supabase.from("tep_dinh_kem_bai_hoc").select("ma_tep, ma_bai_hoc, ten_tep, duong_dan, loai_tep, dung_luong").in("ma_bai_hoc", lessonIds),
          ]);
          if (assignmentResult.error) throw assignmentResult.error;
          if (attachmentResult.error) throw attachmentResult.error;
          const parsedAssignmentsResult = z.array(assignmentSchema).safeParse(assignmentResult.data);
          const parsedAttachmentsResult = z.array(attachmentSchema).safeParse(attachmentResult.data);
          if (!parsedAssignmentsResult.success || !parsedAttachmentsResult.success) throw new Error(genericLoadError);
          parsedAssignments = parsedAssignmentsResult.data;
          parsedAttachments = parsedAttachmentsResult.data;
        }
        const assignmentIds = parsedAssignments.map((assignment) => assignment.ma_bai_tap);
        let parsedRubrics: CourseEditorRubric[] = [];
        let rubricUnavailable = false;
        if (assignmentIds.length) {
          const { data: rubricRows, error: rubricError } = await supabase
            .from("tieu_chi_cham_diem")
            .select("ma_tieu_chi, ma_bai_tap, ten_tieu_chi, ty_trong, thu_tu")
            .in("ma_bai_tap", assignmentIds)
            .order("thu_tu");
          if (rubricError) {
            if (isMissingRubricTable(rubricError.message)) rubricUnavailable = true;
            else throw rubricError;
          } else {
            const parsed = z.array(rubricSchema).safeParse(rubricRows);
            if (!parsed.success) throw new Error(genericLoadError);
            parsedRubrics = parsed.data;
          }
        }
        const chapters: CourseEditorChapter[] = parsedChapters.data.map((chapter) => ({
          ...chapter,
          bai_hoc: parsedLessons.filter((lesson) => lesson.ma_chuong === chapter.ma_chuong).map((lesson) => {
            const assignment = parsedAssignments.find((item) => item.ma_bai_hoc === lesson.ma_bai_hoc);
            return {
              ...lesson,
              noi_dung_van_ban: lesson.noi_dung_van_ban ?? "",
              duong_dan_anh: lesson.duong_dan_anh ?? "",
              lien_ket_video: lesson.lien_ket_video ?? "",
              bai_tap: assignment ? {
                ma_bai_tap: assignment.ma_bai_tap,
                de_bai: assignment.de_bai,
                han_nop: assignment.han_nop,
                bat_buoc: assignment.bat_buoc,
                tieu_chi: parsedRubrics.filter((item) => item.ma_bai_tap === assignment.ma_bai_tap),
              } : null,
              tep_dinh_kem: parsedAttachments.filter((item) => item.ma_bai_hoc === lesson.ma_bai_hoc),
            };
          }),
        }));
        if (active) {
          const version = await loadCourseEditorVersion(token, course.ma_khoa_hoc);
          setState({
            course: {
              ...course,
              anh_dai_dien: course.anh_dai_dien ?? "",
              chuong: chapters,
            },
            version,
            loading: false,
            error: null,
            notFound: false,
            rubricUnavailable,
          });
        }
      } catch (error) {
        if (active) setState({ course: null, version: null, loading: false, error: error instanceof AdminApiError && error.status === 404 ? null : genericLoadError, notFound: error instanceof AdminApiError && error.status === 404, rubricUnavailable: false });
      }
    })();
    return () => {
      active = false;
    };
  }, [courseId, userId, token, attempt]);

  const saveCourse = useCallback(async (values: CourseInfo) => {
    if (!token) throw new Error(saveErrorMessage);
    const saved = await saveCourseInfo(token, courseId, values);
    reload();
    return String(saved.ma_khoa_hoc);
  }, [courseId, token, reload]);

  const assertEditable = useCallback(() => {
    if (!state.course || state.course.trang_thai !== "NHAP" || state.course.ma_giao_vien !== userId) {
      throw new Error("Không thể sửa khóa học ở trạng thái hiện tại.");
    }
    if (!supabase) throw new Error(saveErrorMessage);
    return state.course;
  }, [state.course, userId]);

  const saveChapter = useCallback(async (chapter: CourseEditorChapter) => {
    const course = assertEditable();
    if (!token) throw new Error(saveErrorMessage);
    const nextCourse = {
      ...course,
      chuong: chapter.ma_chuong === null
        ? [...course.chuong, { ...chapter, ma_khoa_hoc: course.ma_khoa_hoc }]
        : course.chuong.map((item) => item.ma_chuong === chapter.ma_chuong ? chapter : item),
    };
    const saved = await saveCourseEditor(token, nextCourse, state.version ?? "");
    reload();
    const index = nextCourse.chuong.findIndex((item) => item === chapter || item.ma_chuong === chapter.ma_chuong);
    return saved.chapterIds[index] ?? chapter.ma_chuong;
  }, [assertEditable, reload, state.version, token]);

  const saveLesson = useCallback(async (lesson: CourseEditorLesson) => {
    const course = assertEditable();
    if (!token || !state.version) throw new Error(saveErrorMessage);
    const nextCourse = {
      ...course,
      chuong: course.chuong.map((chapter) => ({
        ...chapter,
        bai_hoc: chapter.bai_hoc.map((item) => item.ma_bai_hoc === lesson.ma_bai_hoc ? lesson : item),
      })),
    };
    const chapter = nextCourse.chuong.find((item) => item.ma_chuong === lesson.ma_chuong);
    if (!chapter) throw new Error(saveErrorMessage);
    if (!chapter.bai_hoc.some((item) => item === lesson)) chapter.bai_hoc = [...chapter.bai_hoc, lesson];
    const saved = await saveCourseEditor(token, nextCourse, state.version);
    reload();
    const index = nextCourse.chuong.flatMap((item) => item.bai_hoc).findIndex((item) => item === lesson);
    return saved.lessonIds[index] ?? lesson.ma_bai_hoc;
  }, [assertEditable, reload, state.version, token]);

  const saveLessonImage = useCallback(async (lessonId: string | number, url: string) => {
    const course = assertEditable();
    if (!token || !state.version) throw new Error(saveErrorMessage);
    const nextCourse = {
      ...course,
      chuong: course.chuong.map((chapter) => ({
        ...chapter,
        bai_hoc: chapter.bai_hoc.map((lesson) => lesson.ma_bai_hoc === lessonId
          ? { ...lesson, duong_dan_anh: url }
          : lesson),
      })),
    };
    await saveCourseEditor(token, nextCourse, state.version);
    reload();
  }, [assertEditable, reload, state.version, token]);

  const reorderItems = useCallback(async (
    table: "chuong" | "bai_hoc",
    items: Array<{ id: string | number; thu_tu: number }>,
    parentId: string | number
  ) => {
    const course = assertEditable();
    if (!token || !state.version) throw new Error(saveErrorMessage);
    const orderById = new Map(items.map((item) => [item.id, item.thu_tu]));
    const nextCourse = {
      ...course,
      chuong: course.chuong.map((chapter) => ({
        ...chapter,
        thu_tu: table === "chuong" && chapter.ma_chuong !== null
          ? orderById.get(chapter.ma_chuong) ?? chapter.thu_tu
          : chapter.thu_tu,
        bai_hoc: table === "bai_hoc" && chapter.ma_chuong === parentId
          ? chapter.bai_hoc.map((lesson) => ({
            ...lesson,
            thu_tu: lesson.ma_bai_hoc === null
              ? lesson.thu_tu
              : orderById.get(lesson.ma_bai_hoc) ?? lesson.thu_tu,
          }))
          : chapter.bai_hoc,
      })),
    };
    await saveCourseEditor(token, nextCourse, state.version);
    reload();
  }, [assertEditable, reload, state.version, token]);

  const reorderChapters = useCallback((items: Array<{ id: string | number; thu_tu: number }>) => {
    const course = assertEditable();
    return reorderItems("chuong", items, course.ma_khoa_hoc);
  }, [assertEditable, reorderItems]);

  const reorderLessons = useCallback((chapterId: string | number, items: Array<{ id: string | number; thu_tu: number }>) => {
    return reorderItems("bai_hoc", items, chapterId);
  }, [reorderItems]);

  const deleteLesson = useCallback(async (lessonId: string | number) => {
    const course = assertEditable();
    if (!token || !state.version) throw new Error(saveErrorMessage);
    const nextCourse = {
      ...course,
      chuong: course.chuong.map((chapter) => ({
        ...chapter,
        bai_hoc: chapter.bai_hoc.filter((lesson) => lesson.ma_bai_hoc !== lessonId),
      })),
    };
    await saveCourseEditor(token, nextCourse, state.version);
    reload();
  }, [assertEditable, reload, state.version, token]);

  const deleteChapter = useCallback(async (chapterId: string | number) => {
    const course = assertEditable();
    if (!token || !state.version) throw new Error(saveErrorMessage);
    const nextCourse = { ...course, chuong: course.chuong.filter((chapter) => chapter.ma_chuong !== chapterId) };
    await saveCourseEditor(token, nextCourse, state.version);
    reload();
  }, [assertEditable, reload, state.version, token]);

  const submitForReview = useCallback(async () => {
    const course = assertEditable();
    if (!token) throw new Error(saveErrorMessage);
    await submitCourse(token, course.ma_khoa_hoc);
    reload();
  }, [assertEditable, token, reload]);

  return {
    ...state,
    reload,
    saveCourse,
    saveChapter,
    saveLesson,
    saveLessonImage,
    deleteChapter,
    deleteLesson,
    reorderChapters,
    reorderLessons,
    submitForReview,
  };
}
