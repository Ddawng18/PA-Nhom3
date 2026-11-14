import { useCallback, useEffect, useState } from "react";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import { getCourse, saveCourseInfo, submitCourse } from "../lib/courseApi";
import { AdminApiError } from "../lib/adminApi";
import { supabase } from "../lib/supabase";
import { removeCourseMedia } from "../lib/courseStorage";
import { saveCourseEditor } from "../lib/courseEditorApi";
import { buildReorderPlan, type CourseInfo } from "../logic/courseEditor";

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
  loading: boolean;
  error: string | null;
  notFound: boolean;
  rubricUnavailable: boolean;
};

const genericLoadError = "Không thể tải khóa học. Vui lòng kiểm tra kết nối và thử lại.";
const missingCourseMessage = "Không tìm thấy khóa học hoặc bạn không có quyền truy cập.";
const saveErrorMessage = "Chưa thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.";
const isMissingRubricTable = (message: string) => message.includes("tieu_chi_cham_diem")
  && (message.includes("does not exist") || message.includes("Could not find the table") || message.includes("schema cache"));

export function useCourseEditor(courseId: string | undefined, userId: string) {
  const { session } = useAuth();
  const token = session?.access_token;
  const [state, setState] = useState<EditorState>({
    course: null,
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
      setState({ course: null, loading: false, error: null, notFound: false, rubricUnavailable: false });
      return () => {
        active = false;
      };
    }
    if (!supabase) {
      setState({ course: null, loading: false, error: genericLoadError, notFound: false, rubricUnavailable: false });
      return () => {
        active = false;
      };
    }
    setState({ course: null, loading: true, error: null, notFound: false, rubricUnavailable: false });
    void (async () => {
      try {
        if (!token) throw new Error(genericLoadError);
        const courseRow = await getCourse(token, courseId);
        const parsedCourse = courseSchema.safeParse(courseRow);
        if (!parsedCourse.success) throw new Error(genericLoadError);
        if (parsedCourse.data.ma_giao_vien !== userId) {
          if (active) setState({ course: null, loading: false, error: null, notFound: true, rubricUnavailable: false });
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
          setState({
            course: {
              ...course,
              anh_dai_dien: course.anh_dai_dien ?? "",
              chuong: chapters,
            },
            loading: false,
            error: null,
            notFound: false,
            rubricUnavailable,
          });
        }
      } catch (error) {
        if (active) setState({ course: null, loading: false, error: error instanceof AdminApiError && error.status === 404 ? null : genericLoadError, notFound: error instanceof AdminApiError && error.status === 404, rubricUnavailable: false });
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
    await saveCourseEditor(token, nextCourse);
    reload();
    return chapter.ma_chuong;
  }, [assertEditable, reload, token]);

  const saveLesson = useCallback(async (lesson: CourseEditorLesson) => {
    assertEditable();
    const values = {
      ma_chuong: lesson.ma_chuong,
      tieu_de: lesson.tieu_de.trim(),
      thu_tu: lesson.thu_tu,
      noi_dung_van_ban: lesson.noi_dung_van_ban,
      duong_dan_anh: lesson.duong_dan_anh || null,
      lien_ket_video: lesson.lien_ket_video || null,
      bat_buoc: lesson.bat_buoc,
    };
    let lessonId = lesson.ma_bai_hoc;
    if (lessonId === null) {
      const { data, error } = await supabase!.from("bai_hoc").insert(values).select("ma_bai_hoc").single();
      if (error || !rowIdSchema.safeParse(data?.ma_bai_hoc).success) throw new Error(saveErrorMessage);
      lessonId = data.ma_bai_hoc;
    } else {
      const { data, error } = await supabase!.from("bai_hoc").update(values)
        .eq("ma_bai_hoc", lessonId).select("ma_bai_hoc").maybeSingle();
      if (error || !z.object({ ma_bai_hoc: rowIdSchema }).safeParse(data).success) throw new Error(saveErrorMessage);
    }
    if (lesson.bai_tap) {
      const assignmentValues = {
        ma_bai_hoc: lessonId,
        de_bai: lesson.bai_tap.de_bai.trim(),
        han_nop: lesson.bai_tap.han_nop || null,
        bat_buoc: lesson.bai_tap.bat_buoc,
      };
      let assignmentId = lesson.bai_tap.ma_bai_tap;
      if (assignmentId === null) {
        const { data, error } = await supabase!.from("bai_tap").insert(assignmentValues).select("ma_bai_tap").single();
        if (error || !rowIdSchema.safeParse(data?.ma_bai_tap).success) throw new Error(saveErrorMessage);
        assignmentId = data.ma_bai_tap;
      } else {
        const { data, error } = await supabase!.from("bai_tap").update(assignmentValues)
          .eq("ma_bai_tap", assignmentId).select("ma_bai_tap").maybeSingle();
        if (error || !z.object({ ma_bai_tap: rowIdSchema }).safeParse(data).success) throw new Error(saveErrorMessage);
      }
      const deleteResult = await supabase!.from("tieu_chi_cham_diem").delete().eq("ma_bai_tap", assignmentId);
      if (deleteResult.error && !isMissingRubricTable(deleteResult.error.message)) throw new Error(saveErrorMessage);
      if (deleteResult.error && lesson.bai_tap.tieu_chi.length) {
        setState((current) => ({ ...current, rubricUnavailable: true }));
      } else if (lesson.bai_tap.tieu_chi.length) {
        const { error } = await supabase!.from("tieu_chi_cham_diem").insert(
          lesson.bai_tap.tieu_chi.map(({ ten_tieu_chi, ty_trong, thu_tu }) => ({
            ma_bai_tap: assignmentId,
            ten_tieu_chi,
            ty_trong,
            thu_tu,
          }))
        );
        if (error && isMissingRubricTable(error.message)) setState((current) => ({ ...current, rubricUnavailable: true }));
        else if (error) throw new Error(saveErrorMessage);
      }
    } else if (lessonId !== null) {
      const { data: assignmentRows, error: assignmentLoadError } = await supabase!.from("bai_tap")
        .select("ma_bai_tap").eq("ma_bai_hoc", lessonId);
      if (assignmentLoadError) throw new Error(saveErrorMessage);
      const assignments = z.array(z.object({ ma_bai_tap: rowIdSchema })).safeParse(assignmentRows);
      if (!assignments.success) throw new Error(saveErrorMessage);
      if (assignments.data.length) {
        const ids = assignments.data.map((item) => item.ma_bai_tap);
        const rubricDelete = await supabase!.from("tieu_chi_cham_diem").delete().in("ma_bai_tap", ids);
        if (rubricDelete.error && !isMissingRubricTable(rubricDelete.error.message)) throw new Error(saveErrorMessage);
        const assignmentDelete = await supabase!.from("bai_tap").delete().in("ma_bai_tap", ids);
        if (assignmentDelete.error) throw new Error(saveErrorMessage);
      }
    }
    reload();
    return lessonId;
  }, [assertEditable, reload]);

  const saveLessonImage = useCallback(async (lessonId: string | number, url: string) => {
    assertEditable();
    const { data, error } = await supabase!.from("bai_hoc").update({ duong_dan_anh: url })
      .eq("ma_bai_hoc", lessonId).select("ma_bai_hoc").maybeSingle();
    if (error || !z.object({ ma_bai_hoc: rowIdSchema }).safeParse(data).success) throw new Error(saveErrorMessage);
    reload();
  }, [assertEditable, reload]);

  const reorderItems = useCallback(async (
    table: "chuong" | "bai_hoc",
    items: Array<{ id: string | number; thu_tu: number }>,
    parentKey: "ma_khoa_hoc" | "ma_chuong",
    parentId: string | number
  ) => {
    assertEditable();
    const [temporary, finalOrder] = buildReorderPlan(items);
    try {
      for (const step of temporary) {
        const key = table === "chuong" ? "ma_chuong" : "ma_bai_hoc";
        const { data, error } = await supabase!.from(table).update({ thu_tu: step.thu_tu })
          .eq(table === "chuong" ? "ma_chuong" : "ma_bai_hoc", step.id)
          .eq(parentKey, parentId).select(key).maybeSingle();
        if (error || !z.object({ [key]: rowIdSchema }).safeParse(data).success) throw error ?? new Error(saveErrorMessage);
      }
      for (const step of finalOrder) {
        const key = table === "chuong" ? "ma_chuong" : "ma_bai_hoc";
        const { data, error } = await supabase!.from(table).update({ thu_tu: step.thu_tu })
          .eq(table === "chuong" ? "ma_chuong" : "ma_bai_hoc", step.id)
          .eq(parentKey, parentId).select(key).maybeSingle();
        if (error || !z.object({ [key]: rowIdSchema }).safeParse(data).success) throw error ?? new Error(saveErrorMessage);
      }
      reload();
    } catch {
      reload();
      throw new Error("Không thể đổi thứ tự lúc này. Vui lòng thử lại.");
    }
  }, [assertEditable, reload]);

  const reorderChapters = useCallback((items: Array<{ id: string | number; thu_tu: number }>) => {
    const course = assertEditable();
    return reorderItems("chuong", items, "ma_khoa_hoc", course.ma_khoa_hoc);
  }, [assertEditable, reorderItems]);

  const reorderLessons = useCallback((chapterId: string | number, items: Array<{ id: string | number; thu_tu: number }>) => {
    return reorderItems("bai_hoc", items, "ma_chuong", chapterId);
  }, [reorderItems]);

  const deleteLesson = useCallback(async (lessonId: string | number) => {
    assertEditable();
    if (!supabase) throw new Error(saveErrorMessage);
    try {
      const { data: assignments, error: assignmentLoadError } = await supabase
        .from("bai_tap").select("ma_bai_tap").eq("ma_bai_hoc", lessonId);
      if (assignmentLoadError) throw assignmentLoadError;
      const parsedAssignments = z.array(z.object({ ma_bai_tap: rowIdSchema })).safeParse(assignments);
      if (!parsedAssignments.success) throw new Error(saveErrorMessage);
      if (parsedAssignments.data.length) {
        const assignmentIds = parsedAssignments.data.map((item) => item.ma_bai_tap);
        const { error: rubricError } = await supabase.from("tieu_chi_cham_diem").delete().in("ma_bai_tap", assignmentIds);
        if (rubricError && !isMissingRubricTable(rubricError.message)) throw rubricError;
      }
      const { data: attachments, error: attachmentError } = await supabase
        .from("tep_dinh_kem_bai_hoc").select("ma_tep, duong_dan").eq("ma_bai_hoc", lessonId);
      if (attachmentError) throw attachmentError;
      const parsedAttachments = z.array(z.object({ ma_tep: rowIdSchema, duong_dan: z.string() })).safeParse(attachments);
      if (!parsedAttachments.success) throw new Error(saveErrorMessage);
      if (parsedAttachments.data.length) {
        const { error } = await supabase.from("tep_dinh_kem_bai_hoc").delete().in("ma_tep", parsedAttachments.data.map((item) => item.ma_tep));
        if (error) throw error;
        await removeCourseMedia(parsedAttachments.data.map((item) => item.duong_dan), "attachments");
      }
      if (parsedAssignments.data.length) {
        const { error } = await supabase.from("bai_tap").delete().in("ma_bai_tap", parsedAssignments.data.map((item) => item.ma_bai_tap));
        if (error) throw error;
      }
      const { error } = await supabase.from("bai_hoc").delete().eq("ma_bai_hoc", lessonId);
      if (error) throw error;
      const chapter = state.course?.chuong.find((item) => item.bai_hoc.some((lesson) => lesson.ma_bai_hoc === lessonId));
      const remainingLessons = chapter?.bai_hoc
        .filter((lesson) => lesson.ma_bai_hoc !== lessonId)
        .filter((lesson): lesson is CourseEditorLesson & { ma_bai_hoc: string | number } => lesson.ma_bai_hoc !== null)
        .map((lesson) => ({ id: lesson.ma_bai_hoc, thu_tu: lesson.thu_tu })) ?? [];
      if (chapter?.ma_chuong && remainingLessons.length) {
        await reorderItems("bai_hoc", remainingLessons, "ma_chuong", chapter.ma_chuong);
      }
      reload();
    } catch (error) {
      if (error instanceof Error && error.message === "Không thể đổi thứ tự lúc này. Vui lòng thử lại.") throw error;
      throw new Error("Không thể xóa nội dung này vì đã có dữ liệu liên quan.");
    }
  }, [assertEditable, reload, reorderItems, state.course]);

  const deleteChapter = useCallback(async (chapterId: string | number) => {
    const course = assertEditable();
    const chapter = course.chuong.find((item) => item.ma_chuong === chapterId);
    if (!chapter || !supabase) throw new Error(missingCourseMessage);
    try {
      for (const lesson of chapter.bai_hoc) {
        let assignmentIds: Array<string | number> = [];
        if (lesson.bai_tap?.ma_bai_tap !== null && lesson.bai_tap) {
          const { error } = await supabase.from("tieu_chi_cham_diem").delete().eq("ma_bai_tap", lesson.bai_tap.ma_bai_tap);
          if (error && !isMissingRubricTable(error.message)) throw error;
          assignmentIds = [lesson.bai_tap.ma_bai_tap];
        }
        const { data: attachmentRows, error: attachmentLoadError } = await supabase
          .from("tep_dinh_kem_bai_hoc").select("ma_tep, duong_dan").eq("ma_bai_hoc", lesson.ma_bai_hoc);
        if (attachmentLoadError) throw attachmentLoadError;
        const parsedAttachments = z.array(z.object({ ma_tep: rowIdSchema, duong_dan: z.string() })).safeParse(attachmentRows);
        if (!parsedAttachments.success) throw new Error(saveErrorMessage);
        const { data: attachments, error: attachmentError } = await supabase
          .from("tep_dinh_kem_bai_hoc").delete().eq("ma_bai_hoc", lesson.ma_bai_hoc).select("ma_tep");
        if (attachmentError) throw attachmentError;
        const deletedAttachments = z.array(z.object({ ma_tep: rowIdSchema })).safeParse(attachments);
        if (!deletedAttachments.success) throw new Error(saveErrorMessage);
        if (parsedAttachments.data.length) await removeCourseMedia(parsedAttachments.data.map((item) => item.duong_dan), "attachments");
        if (assignmentIds.length) {
          const { error } = await supabase.from("bai_tap").delete().in("ma_bai_tap", assignmentIds);
          if (error) throw error;
        }
        const { error: lessonError } = await supabase.from("bai_hoc").delete().eq("ma_bai_hoc", lesson.ma_bai_hoc);
        if (lessonError) throw lessonError;
      }
      const { error } = await supabase.from("chuong").delete()
        .eq("ma_chuong", chapterId).eq("ma_khoa_hoc", course.ma_khoa_hoc);
      if (error) throw error;
      const remainingChapters = course.chuong.filter((item) => item.ma_chuong !== chapterId)
        .filter((item): item is CourseEditorChapter & { ma_chuong: string | number } => item.ma_chuong !== null)
        .map((item) => ({ id: item.ma_chuong, thu_tu: item.thu_tu }));
      if (remainingChapters.length) await reorderItems("chuong", remainingChapters, "ma_khoa_hoc", course.ma_khoa_hoc);
      reload();
    } catch (error) {
      if (error instanceof Error && error.message === "Không thể đổi thứ tự lúc này. Vui lòng thử lại.") throw error;
      throw new Error("Không thể xóa nội dung này vì đã có dữ liệu liên quan.");
    }
  }, [assertEditable, reload, reorderItems]);

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
