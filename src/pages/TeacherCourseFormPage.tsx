import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  FileText,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { courseLevels, courseTopics } from "../data/courseEditorOptions";
import { useCourseEditor, type CourseEditorChapter, type CourseEditorLesson, type CourseEditorModel } from "../hooks/useCourseEditor";
import { supabase } from "../lib/supabase";
import {
  canEditCourse,
  getCourseStatusLabel,
  getSubmitBlockers,
  reorder,
  validateAssignment,
  validateCourseInfo,
  validateLesson,
  validateRubric,
  validateUpload,
} from "../logic/courseEditor";
import type { CourseEditorAttachment, CourseEditorRubric } from "../hooks/useCourseEditor";
import { cleanCourseMediaName, createCourseMediaSignedUrl, isCourseAttachmentConfigured, isCourseMediaConfigured, removeCourseMedia, uploadCourseMedia } from "../lib/courseStorage";
import { requestAdminApi } from "../lib/adminApi";
import "../styles/teacher-course.css";

type LocalLesson = CourseEditorLesson & { localId: string };
type LocalChapter = Omit<CourseEditorChapter, "bai_hoc"> & { localId: string; bai_hoc: LocalLesson[] };
type LocalCourse = Omit<CourseEditorModel, "chuong"> & { chuong: LocalChapter[] };
type Confirmation = { title: string; message: string; action: () => void };

const chapterTitleSchema = z.string().trim()
  .min(1, "Vui lòng nhập tiêu đề.")
  .min(3, "Tiêu đề cần có ít nhất 3 ký tự.")
  .max(200, "Tiêu đề không được dài quá 200 ký tự.");

function getDisplayName(user: User): string {
  const metadataName = user.user_metadata.display_name;
  if (typeof metadataName === "string" && metadataName.trim()) return metadataName.trim();
  return user.email?.split("@")[0] || "Học viên LINEA";
}

function getInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function asLocalCourse(course: CourseEditorModel): LocalCourse {
  return {
    ...course,
    chuong: course.chuong.map((chapter) => ({
      ...chapter,
      localId: String(chapter.ma_chuong),
      bai_hoc: chapter.bai_hoc.map((lesson) => ({ ...lesson, localId: String(lesson.ma_bai_hoc) })),
    })),
  };
}

function emptyCourse(userId: string): LocalCourse {
  return {
    ma_khoa_hoc: "",
    ma_giao_vien: userId,
    tieu_de: "",
    cap_do: "",
    chu_de: "",
    mo_ta: "",
    anh_dai_dien: "",
    trang_thai: "NHAP",
    chuong: [],
  };
}

function newChapter(courseId: string | number): LocalChapter {
  return {
    ma_chuong: null,
    ma_khoa_hoc: courseId,
    localId: crypto.randomUUID(),
    tieu_de: "",
    thu_tu: 1,
    bai_hoc: [],
  };
}

function newLesson(chapterId: string | number, order: number): LocalLesson {
  return {
    ma_bai_hoc: null,
    ma_chuong: chapterId,
    localId: crypto.randomUUID(),
    tieu_de: "",
    thu_tu: order,
    noi_dung_van_ban: "",
    duong_dan_anh: "",
    lien_ket_video: "",
    bat_buoc: true,
    bai_tap: null,
    tep_dinh_kem: [],
  };
}

function Dialog({ confirmation, close }: { confirmation: Confirmation; close: () => void }) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>("button:not([disabled])"));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [close]);

  return (
    <div className="course-dialog-backdrop">
      <div className="course-dialog" role="dialog" aria-modal="true" aria-labelledby="course-dialog-title" tabIndex={-1} ref={dialogRef}>
        <h2 id="course-dialog-title">{confirmation.title}</h2>
        <p>{confirmation.message}</p>
        <div className="course-dialog-actions">
          <button className="button button-outline" type="button" onClick={close}>Hủy</button>
          <button className="button button-primary" type="button" onClick={confirmation.action}>Xác nhận</button>
        </div>
      </div>
    </div>
  );
}

function fileSize(size: number): string {
  return `${(size / 1048576).toLocaleString("vi-VN", { maximumFractionDigits: 1 })} MB`;
}

function fileTypeLabel(item: CourseEditorAttachment): string {
  if (item.loai_tep === "IMAGE") return item.duong_dan.toLowerCase().endsWith(".webp") ? "WEBP" : item.duong_dan.toLowerCase().endsWith(".png") ? "PNG" : "JPG";
  if (item.loai_tep === "REFERENCE") return "LINK";
  return item.duong_dan.toLowerCase().endsWith(".zip") ? "ZIP" : "PDF";
}

export default function TeacherCourseFormPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, session } = useAuth();
  const userId = user?.id ?? "";
  const editor = useCourseEditor(courseId, userId);
  const [course, setCourse] = useState<LocalCourse>(() => emptyCourse(userId));
  const [existingTopics, setExistingTopics] = useState<string[]>([]);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "content">("basic");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [rubricMemory, setRubricMemory] = useState<Record<string, CourseEditorRubric[]>>({});
  const currentPath = useRef(`${location.pathname}${location.search}${location.hash}`);
  const coverInput = useRef<HTMLInputElement>(null);
  const lessonImageInput = useRef<HTMLInputElement>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(courseId);
  const readOnly = isEditing && !editor.loading && Boolean(editor.course) && !canEditCourse(editor.course?.trang_thai ?? "", editor.course?.ma_giao_vien === userId);
  const courseSaved = Boolean(courseId);
  const selectedChapter = course.chuong.find((chapter) => chapter.localId === selectedChapterId) ?? null;
  const selectedLesson = selectedChapter?.bai_hoc.find((lesson) => lesson.localId === selectedLessonId) ?? null;

  useEffect(() => {
    if (!editor.course) return;
    const incoming = asLocalCourse(editor.course);
    if (editor.rubricUnavailable) {
      for (const chapter of incoming.chuong) {
        for (const lesson of chapter.bai_hoc) {
          const retained = rubricMemory[lesson.localId];
          if (retained && lesson.bai_tap) lesson.bai_tap.tieu_chi = retained;
        }
      }
    }
    setCourse(incoming);
    setSelectedChapterId((current) => current && editor.course?.chuong.some((chapter) => String(chapter.ma_chuong) === current)
      ? current
      : editor.course?.chuong[0] ? String(editor.course.chuong[0].ma_chuong) : null);
    setSelectedLessonId((current) => current && editor.course?.chuong.some((chapter) => chapter.bai_hoc.some((lesson) => String(lesson.ma_bai_hoc) === current))
      ? current
      : editor.course?.chuong[0]?.bai_hoc[0] ? String(editor.course.chuong[0].bai_hoc[0].ma_bai_hoc) : null);
    setHasUnsavedChanges(false);
  }, [editor.course, editor.rubricUnavailable, rubricMemory]);

  useEffect(() => {
    let active = true;
    if (!supabase) return () => {
      active = false;
    };
    void supabase.from("khoa_hoc").select("chu_de").then(({ data, error }) => {
      if (!active) return;
      if (error) {
        setTopicError("Không thể tải gợi ý chủ đề.");
        return;
      }
      const parsed = z.array(z.object({ chu_de: z.string().nullable() })).safeParse(data);
      if (!parsed.success) {
        setTopicError("Dữ liệu gợi ý chủ đề không đúng định dạng.");
        return;
      }
      setExistingTopics(parsed.data.map((item) => item.chu_de?.trim() ?? "").filter(Boolean));
      setTopicError(null);
    }, () => {
      if (active) setTopicError("Không thể tải gợi ý chủ đề.");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    function preventLeave(event: BeforeUnloadEvent) {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", preventLeave);
    return () => window.removeEventListener("beforeunload", preventLeave);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const activePath = `${location.pathname}${location.search}${location.hash}`;
    if (!hasUnsavedChanges) currentPath.current = activePath;
  }, [hasUnsavedChanges, location.hash, location.pathname, location.search]);

  useEffect(() => {
    function preventBrowserBack(event: PopStateEvent) {
      if (!hasUnsavedChanges) return;
      const targetPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      event.stopImmediatePropagation();
      window.history.pushState(null, "", currentPath.current);
      setConfirmation({
        title: "Thay đổi chưa lưu",
        message: "Bạn có thay đổi chưa lưu. Rời trang sẽ làm mất các thay đổi này.",
        action: () => {
          setConfirmation(null);
          setHasUnsavedChanges(false);
          navigate(targetPath);
        },
      });
    }
    window.addEventListener("popstate", preventBrowserBack, true);
    return () => window.removeEventListener("popstate", preventBrowserBack, true);
  }, [hasUnsavedChanges, navigate]);

  const topicOptions = useMemo(() => Array.from(new Set([...courseTopics, ...existingTopics, course.chu_de].filter(Boolean))), [course.chu_de, existingTopics]);
  const chapterCount = course.chuong.length;
  const lessonCount = course.chuong.reduce((total, chapter) => total + chapter.bai_hoc.length, 0);
  const checklist = [
    { label: "Tên và mô tả khóa học", complete: course.tieu_de.trim().length >= 5 && course.mo_ta.trim().length >= 50 },
    { label: "Ảnh bìa", complete: Boolean(course.anh_dai_dien) },
    { label: "Chủ đề và cấp độ", complete: Boolean(course.chu_de.trim() && course.cap_do) },
    { label: "Mỗi chương có ít nhất một bài học", complete: course.chuong.length > 0 && course.chuong.every((chapter) => chapter.bai_hoc.length > 0) },
  ];

  if (!user) return null;
  const displayName = getDisplayName(user);
  const editable = !readOnly && (!isEditing || course.trang_thai === "NHAP");

  function setCourseField<K extends keyof LocalCourse>(field: K, value: LocalCourse[K]) {
    setCourse((current) => ({ ...current, [field]: value }));
    setHasUnsavedChanges(true);
    setMessage(null);
    setErrors((current) => ({ ...current, [String(field)]: "" }));
  }

  function updateChapter(localId: string, updater: (chapter: LocalChapter) => LocalChapter) {
    setCourse((current) => ({
      ...current,
      chuong: current.chuong.map((chapter) => chapter.localId === localId ? updater(chapter) : chapter),
    }));
    setHasUnsavedChanges(true);
    setMessage(null);
  }

  function updateLesson(localId: string, updater: (lesson: LocalLesson) => LocalLesson) {
    setCourse((current) => ({
      ...current,
      chuong: current.chuong.map((chapter) => ({
        ...chapter,
        bai_hoc: chapter.bai_hoc.map((lesson) => lesson.localId === localId ? updater(lesson) : lesson),
      })),
    }));
    setHasUnsavedChanges(true);
    setMessage(null);
  }

  function fieldError(field: string) {
    const error = errors[field];
    return error ? <span className="teacher-field-error" id={`${field.replaceAll(".", "-")}-error`} role="alert">{error}</span> : null;
  }

  function collectIssues(result: ReturnType<typeof validateCourseInfo> | ReturnType<typeof validateLesson> | ReturnType<typeof validateAssignment> | ReturnType<typeof validateRubric>) {
    if (result.success) return {};
    const next: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "form";
      if (!next[key]) next[key] = issue.message;
    }
    return next;
  }

  async function saveCourse() {
    const validation = validateCourseInfo(course);
    if (!validation.success) {
      setErrors(collectIssues(validation));
      setMessage(null);
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const savedId = await editor.saveCourse(validation.data);
      setHasUnsavedChanges(false);
      setErrors({});
      if (!courseId) {
        navigate(`/teacher/courses/${encodeURIComponent(savedId)}/edit`, { replace: true });
        return;
      }
      setMessage("Đã lưu bản nháp.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !courseId) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const preflight = validateCourseInfo({ ...course, anh_dai_dien: "https://media.supabase.co/preflight" });
      if (!preflight.success) {
        setErrors(collectIssues(preflight));
        return;
      }
      const validation = await validateUpload("cover", file);
      if (!validation.success) {
        setUploadMessage(validation.message);
        return;
      }
      const uploaded = await uploadCourseMedia(session?.access_token ?? "", courseId, file, validation.fileKind, "media");
      const publicUrl = uploaded.publicUrl;
      if (!publicUrl) {
        await removeUploadedMedia(uploaded.path, "media");
        throw new Error("Không thể tạo địa chỉ ảnh công khai.");
      }
      const values = validateCourseInfo({ ...course, anh_dai_dien: publicUrl });
      if (!values.success) {
        await removeUploadedMedia(uploaded.path, "media");
        setErrors(collectIssues(values));
        return;
      }
      try {
        await editor.saveCourse(values.data);
      } catch (error) {
        await removeUploadedMedia(uploaded.path, "media");
        throw error;
      }
      setCourse((current) => ({ ...current, anh_dai_dien: publicUrl }));
      setHasUnsavedChanges(false);
    } catch (error) {
      setUploadMessage(error instanceof Error && error.message === "Không thể dọn tệp vừa tải lên khỏi bộ lưu trữ."
        ? error.message
        : "Không thể tải hoặc lưu ảnh lên. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadLessonImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !courseId || !selectedLesson?.ma_bai_hoc) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const validation = await validateUpload("lessonImage", file);
      if (!validation.success) {
        setUploadMessage(validation.message);
        return;
      }
      const uploaded = await uploadCourseMedia(session?.access_token ?? "", courseId, file, validation.fileKind, "media");
      const publicUrl = uploaded.publicUrl;
      if (!publicUrl) {
        await removeUploadedMedia(uploaded.path, "media");
        throw new Error("Không thể tạo địa chỉ ảnh công khai.");
      }
      try {
        await editor.saveLessonImage(selectedLesson.ma_bai_hoc, publicUrl);
      } catch (error) {
        await removeUploadedMedia(uploaded.path, "media");
        throw error;
      }
      updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, duong_dan_anh: publicUrl, ma_bai_hoc: selectedLesson.ma_bai_hoc }));
      setHasUnsavedChanges(false);
      setUploadMessage(null);
    } catch (error) {
      setUploadMessage(error instanceof Error ? error.message : "Không thể tải ảnh lên. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadAttachmentFile(file: File) {
    if (!file || !courseId || !selectedLesson?.ma_bai_hoc || !supabase || !isCourseAttachmentConfigured) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const validation = await validateUpload("attachment", file, selectedLesson.tep_dinh_kem.length);
      if (!validation.success) {
        setUploadMessage(validation.message);
        return;
      }
      const uploaded = await uploadCourseMedia(session?.access_token ?? "", courseId, file, validation.fileKind, "attachments");
      const attachment = {
        ma_bai_hoc: selectedLesson.ma_bai_hoc,
        ten_tep: await cleanCourseMediaName(file.name),
        duong_dan: uploaded.path,
        loai_tep: ["jpeg", "png", "webp"].includes(validation.fileKind) ? "IMAGE" : "DOCUMENT",
        dung_luong: file.size,
      } as const;
      if (!session?.access_token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const data = await requestAdminApi(`/api/courses/${courseId}/attachments`, {
        token: session.access_token,
        method: "POST",
        body: attachment,
      });
      const parsed = z.object({
        ma_tep: z.union([z.string(), z.number()]),
        ma_bai_hoc: z.union([z.string(), z.number()]),
        ten_tep: z.string(),
        duong_dan: z.string(),
        loai_tep: z.enum(["IMAGE", "DOCUMENT", "REFERENCE"]),
        dung_luong: z.number(),
      }).safeParse(data);
      if (!parsed.success) {
        await removeUploadedMedia(uploaded.path, "attachments");
        throw new Error("Dữ liệu tệp không đúng định dạng.");
      }
      updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, tep_dinh_kem: [...lesson.tep_dinh_kem, parsed.data] }));
      setHasUnsavedChanges(false);
    } catch (error) {
      setUploadMessage(error instanceof Error && error.message === "Không thể dọn tệp vừa tải lên khỏi bộ lưu trữ."
        ? error.message
        : "Không thể tải tệp lên. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setUploading(false);
    }
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadAttachmentFile(file);
  }

  async function removeUploadedMedia(path: string, bucketKind: "media" | "attachments") {
    try {
      if (!session?.access_token || !courseId) throw new Error("Phiên đăng nhập đã hết hạn.");
      await removeCourseMedia(session.access_token, courseId, path, bucketKind);
    } catch {
      throw new Error("Không thể dọn tệp vừa tải lên khỏi bộ lưu trữ.");
    }
  }

  async function removeAttachment(attachment: CourseEditorAttachment) {
    setSaving(true);
    try {
      if (!session?.access_token || !courseId) throw new Error("Phiên đăng nhập đã hết hạn.");
      await requestAdminApi(`/api/courses/${courseId}/attachments/${attachment.ma_tep}`, {
        token: session.access_token,
        method: "DELETE",
      });
      await removeCourseMedia(session.access_token, courseId, attachment.duong_dan, "attachments");
      if (selectedLesson) {
        updateLesson(selectedLesson.localId, (lesson) => ({
          ...lesson,
          tep_dinh_kem: lesson.tep_dinh_kem.filter((item) => item.ma_tep !== attachment.ma_tep),
        }));
      }
    } catch {
      setUploadMessage("Không thể gỡ tệp. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function saveChapter(chapter: LocalChapter) {
    const parsedTitle = chapterTitleSchema.safeParse(chapter.tieu_de);
    if (!parsedTitle.success) {
      setErrors((current) => ({ ...current, [`chapter.${chapter.localId}`]: parsedTitle.error.issues[0]?.message ?? "Vui lòng nhập tiêu đề." }));
      return;
    }
    setSaving(true);
    try {
      const id = await editor.saveChapter({ ...chapter, tieu_de: parsedTitle.data });
      setCourse((current) => ({
        ...current,
        chuong: current.chuong.map((item) => item.localId === chapter.localId ? { ...item, ma_chuong: id } : item),
      }));
      setSelectedChapterId(String(id));
      setHasUnsavedChanges(false);
      setMessage("Đã lưu chương.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function saveLesson(lesson: LocalLesson) {
    const lessonValidation = validateLesson(lesson);
    if (!lessonValidation.success) {
      setErrors(collectIssues(lessonValidation));
      return;
    }
    if (lesson.bai_tap) {
      const assignmentValidation = validateAssignment(lesson.bai_tap);
      const rubricValidation = validateRubric(lesson.bai_tap.tieu_chi);
      const nextErrors = { ...collectIssues(assignmentValidation) };
      if (!rubricValidation.success) nextErrors.tieu_chi = rubricValidation.error.issues[0]?.message ?? "Tiêu chí chấm điểm không hợp lệ.";
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
    }
    setSaving(true);
    setErrors({});
    try {
      const id = await editor.saveLesson(lesson);
      setRubricMemory((current) => ({ ...current, [String(id)]: lesson.bai_tap?.tieu_chi ?? [] }));
      setCourse((current) => ({
        ...current,
        chuong: current.chuong.map((chapter) => ({
          ...chapter,
          bai_hoc: chapter.bai_hoc.map((item) => item.localId === lesson.localId ? { ...item, ma_bai_hoc: id } : item),
        })),
      }));
      setSelectedLessonId(String(id));
      setHasUnsavedChanges(false);
      setMessage("Đã lưu bài học.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể lưu thay đổi. Vui lòng kiểm tra kết nối và thử lại.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteLesson(lesson: LocalLesson) {
    if (!lesson.ma_bai_hoc) {
      setCourse((current) => ({
        ...current,
        chuong: current.chuong.map((chapter) => ({
          ...chapter,
          bai_hoc: chapter.bai_hoc.filter((item) => item.localId !== lesson.localId).map((item, index) => ({ ...item, thu_tu: index + 1 })),
        })),
      }));
      setSelectedLessonId(null);
      setHasUnsavedChanges(true);
      return;
    }
    setSaving(true);
    try {
      await editor.deleteLesson(lesson.ma_bai_hoc);
      setSelectedLessonId(null);
      setHasUnsavedChanges(false);
      setMessage("Đã xóa bài học.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa nội dung này vì đã có dữ liệu liên quan.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteChapter(chapter: LocalChapter) {
    if (!chapter.ma_chuong) {
      setCourse((current) => ({
        ...current,
        chuong: current.chuong.filter((item) => item.localId !== chapter.localId).map((item, index) => ({ ...item, thu_tu: index + 1 })),
      }));
      setSelectedChapterId(null);
      setSelectedLessonId(null);
      setHasUnsavedChanges(true);
      return;
    }
    setSaving(true);
    try {
      await editor.deleteChapter(chapter.ma_chuong);
      setSelectedChapterId(null);
      setSelectedLessonId(null);
      setHasUnsavedChanges(false);
      setMessage("Đã xóa chương.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa nội dung này vì đã có dữ liệu liên quan.");
    } finally {
      setSaving(false);
    }
  }

  async function moveChapter(index: number, direction: -1 | 1) {
    const next = reorder(course.chuong, index, direction);
    if (next === course.chuong) return;
    setCourse((current) => ({ ...current, chuong: next }));
    setHasUnsavedChanges(true);
    if (next.every((chapter) => chapter.ma_chuong !== null)) {
      try {
        await editor.reorderChapters(next.map((chapter) => ({ id: chapter.ma_chuong as string | number, thu_tu: chapter.thu_tu })));
        setHasUnsavedChanges(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không thể đổi thứ tự lúc này. Vui lòng thử lại.");
      }
    }
  }

  async function moveLesson(chapter: LocalChapter, index: number, direction: -1 | 1) {
    const next = reorder(chapter.bai_hoc, index, direction);
    if (next === chapter.bai_hoc) return;
    updateChapter(chapter.localId, (current) => ({ ...current, bai_hoc: next }));
    if (chapter.ma_chuong && next.every((lesson) => lesson.ma_bai_hoc !== null)) {
      try {
        await editor.reorderLessons(chapter.ma_chuong, next.map((lesson) => ({ id: lesson.ma_bai_hoc as string | number, thu_tu: lesson.thu_tu })));
        setHasUnsavedChanges(false);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Không thể đổi thứ tự lúc này. Vui lòng thử lại.");
      }
    }
  }

  async function sendForReview() {
    const validation = validateCourseInfo(course);
    if (!validation.success) {
      setErrors(collectIssues(validation));
      setActiveTab("basic");
      return;
    }
    const blockers = getSubmitBlockers(course.chuong);
    if (blockers.length) {
      setMessage(blockers.join(" "));
      setActiveTab("content");
      return;
    }
    if (hasUnsavedChanges) {
      setMessage("Hãy lưu các thay đổi trước khi gửi duyệt.");
      return;
    }
    try {
      await editor.submitForReview();
      setCourse((current) => ({ ...current, trang_thai: "CHO_DUYET" }));
      setMessage("Khóa học đã được gửi duyệt.");
      setHasUnsavedChanges(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Chưa thể gửi duyệt. Vui lòng thử lại.");
    }
  }

  function askConfirmation(title: string, text: string, action: () => void) {
    setConfirmation({ title, message: text, action: () => {
      setConfirmation(null);
      action();
    } });
  }

  function handleNavigationCapture(event: MouseEvent<HTMLDivElement>) {
    if (!hasUnsavedChanges || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (!link || link.target === "_blank") return;
    const targetUrl = new URL(link.href, window.location.href);
    if (targetUrl.origin !== window.location.origin) return;
    if (targetUrl.pathname === window.location.pathname
      && targetUrl.search === window.location.search
      && targetUrl.hash === window.location.hash) return;
    event.preventDefault();
    event.stopPropagation();
    askConfirmation("Thay đổi chưa lưu", "Bạn có thay đổi chưa lưu. Rời trang sẽ làm mất các thay đổi này.", () => {
      setHasUnsavedChanges(false);
      navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    });
  }

  function updateRubric(lesson: LocalLesson, rubricRows: CourseEditorRubric[]) {
    updateLesson(lesson.localId, (current) => ({
      ...current,
      bai_tap: current.bai_tap ? { ...current.bai_tap, tieu_chi: rubricRows } : current.bai_tap,
    }));
  }

  if (isEditing && editor.loading) return <p className="auth-loading" role="status">Đang tải khóa học...</p>;
  if (editor.notFound) return <p className="teacher-access-message" role="alert">Không tìm thấy khóa học hoặc bạn không có quyền truy cập.</p>;
  if (editor.error) {
    return (
      <div className="teacher-access-message">
        <p role="alert">{editor.error}</p>
        <button className="button button-outline" type="button" onClick={editor.reload}>Thử lại</button>
      </div>
    );
  }

  return (
    <div className="settings-shell teacher-course-editor" onClickCapture={handleNavigationCapture}>
      <Sidebar user={user} displayName={displayName} initials={getInitials(displayName)} />
      <main className="settings-main teacher-form-main">
        <div className="settings-content teacher-editor-content">
          <header className="teacher-editor-header">
            <div className="teacher-editor-heading">
              <Link className="teacher-back-link" to="/my-courses"><ArrowLeft aria-hidden="true" size={15} /> Khóa học của tôi</Link>
              <div className="teacher-editor-title-line">
                <h1>{isEditing ? "Chỉnh sửa khóa học" : "Tạo khóa học"}</h1>
                <span className={`teacher-status-chip status-${course.trang_thai}`}>{getCourseStatusLabel(course.trang_thai)}</span>
              </div>
              <p>{isEditing ? "Cập nhật thông tin và nội dung khóa học." : "Điền thông tin để tạo khóa học mới. Khóa học được lưu ở trạng thái bản nháp."}</p>
            </div>
            <div className="teacher-editor-header-actions">
              <button className="button button-outline" type="button" disabled={!editable || saving} onClick={() => void saveCourse()}>
                {saving ? "Đang lưu..." : "Lưu nháp"}
              </button>
              <button className="button button-primary" type="button" disabled={!editable || saving || !isEditing} onClick={() => askConfirmation("Gửi duyệt khóa học", "Bạn có chắc muốn gửi khóa học này để xét duyệt?", () => void sendForReview())}>
                Gửi duyệt
              </button>
            </div>
          </header>
          {!editable && <p className="teacher-readonly-message" role="status">Không thể sửa khóa học ở trạng thái hiện tại.</p>}
          {message && <p className="teacher-form-message" role="status">{message}</p>}
          {editor.rubricUnavailable && <p className="teacher-form-message" role="alert">Chưa lưu được tiêu chí chấm điểm vì database chưa có bảng tương ứng.</p>}
          <nav className="settings-tabs teacher-editor-tabs" aria-label="Mục khóa học">
            <button type="button" className={`settings-tab${activeTab === "basic" ? " active" : ""}`} aria-current={activeTab === "basic" ? "page" : undefined} onClick={() => setActiveTab("basic")}>Thông tin cơ bản</button>
            <button type="button" className={`settings-tab${activeTab === "content" ? " active" : ""}`} aria-current={activeTab === "content" ? "page" : undefined} onClick={() => setActiveTab("content")}>Nội dung bài học ({chapterCount} chương)</button>
            <button className="settings-tab" type="button" disabled aria-disabled="true" title="Tính năng đang phát triển">Học viên ghi danh</button>
            <button className="settings-tab" type="button" disabled aria-disabled="true" title="Tính năng đang phát triển">Trạng thái và lịch sử</button>
          </nav>
          {activeTab === "basic" ? (
            <div className="teacher-basic-grid">
              <section className="settings-card teacher-editor-card teacher-course-fields">
                <div className="teacher-card-heading">
                  <h2>Thông tin khóa học</h2>
                  <p>Học viên sẽ thấy phần này trong danh mục và trang chi tiết khóa học.</p>
                </div>
                <label className="teacher-form-field" htmlFor="course-title">
                  <span>Tên khóa học *</span>
                  <span className="teacher-input-counter"><input id="course-title" value={course.tieu_de} maxLength={200} disabled={!editable} aria-invalid={Boolean(errors.tieu_de)} aria-describedby={`course-title-help ${errors.tieu_de ? "tieu_de-error" : ""}`} onChange={(event) => setCourseField("tieu_de", event.target.value)} /><span>{course.tieu_de.length}/200</span></span>
                  <span className="teacher-field-help" id="course-title-help">Ngắn gọn, nêu rõ kết quả học viên đạt được.</span>
                  {fieldError("tieu_de")}
                </label>
                <label className="teacher-form-field" htmlFor="course-description">
                  <span>Mô tả khóa học *</span>
                  <textarea id="course-description" rows={4} maxLength={5000} value={course.mo_ta} disabled={!editable} aria-invalid={Boolean(errors.mo_ta)} aria-describedby={errors.mo_ta ? "mo_ta-error" : undefined} onChange={(event) => setCourseField("mo_ta", event.target.value)} />
                  <span className="teacher-character-count">{course.mo_ta.length}/5000</span>
                  {fieldError("mo_ta")}
                </label>
                <div className="teacher-form-grid">
                  <label className="teacher-form-field" htmlFor="course-level">
                    <span>Cấp độ *</span>
                    <select id="course-level" value={course.cap_do} disabled={!editable} aria-invalid={Boolean(errors.cap_do)} aria-describedby={errors.cap_do ? "cap_do-error" : undefined} onChange={(event) => setCourseField("cap_do", event.target.value)}>
                      <option value="">Chọn cấp độ</option>
                      {Object.entries(courseLevels).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
                    </select>
                    {fieldError("cap_do")}
                  </label>
                  <label className="teacher-form-field" htmlFor="course-topic">
                    <span>Chủ đề *</span>
                    <input id="course-topic" list="course-topic-options" value={course.chu_de} maxLength={100} disabled={!editable} aria-invalid={Boolean(errors.chu_de)} aria-describedby={errors.chu_de ? "chu_de-error" : undefined} onChange={(event) => setCourseField("chu_de", event.target.value)} />
                    <datalist id="course-topic-options">{topicOptions.map((topic) => <option key={topic} value={topic} />)}</datalist>
                    {fieldError("chu_de")}
                  </label>
                </div>
                {topicError && <p className="teacher-field-error" role="alert">{topicError}</p>}
              </section>
              <aside className="teacher-basic-aside">
                <section className="settings-card teacher-editor-card">
                  <div className="teacher-card-heading">
                    <h2>Ảnh bìa</h2>
                    <p>Hiển thị ở danh mục và trang chi tiết.</p>
                  </div>
                  <div className="teacher-cover-preview">
                    {course.anh_dai_dien ? <img src={course.anh_dai_dien} alt={`Ảnh bìa ${course.tieu_de || "khóa học"}`} /> : <ImagePlus aria-hidden="true" size={30} />}
                  </div>
                  <div className="teacher-cover-actions">
                    <button className="button button-outline" type="button" disabled={!editable || !isCourseMediaConfigured || !courseId || uploading} onClick={() => coverInput.current?.click()}><ImagePlus aria-hidden="true" size={15} /> Tải ảnh lên</button>
                    <button className="teacher-text-button" type="button" disabled={!editable || !course.anh_dai_dien} onClick={() => setCourseField("anh_dai_dien", "")}>Gỡ ảnh</button>
                    <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden disabled={!editable || !isCourseMediaConfigured || !courseId} onChange={(event) => void uploadCover(event)} />
                  </div>
                  <label className="teacher-form-field" htmlFor="course-cover-url">
                    <span>Hoặc dán đường dẫn ảnh</span>
                    <input id="course-cover-url" type="url" value={course.anh_dai_dien} disabled={!editable} aria-invalid={Boolean(errors.anh_dai_dien)} onChange={(event) => setCourseField("anh_dai_dien", event.target.value)} />
                    {fieldError("anh_dai_dien")}
                  </label>
                  <p className="teacher-field-help">Tỉ lệ 16:9, JPG, PNG hoặc WEBP, tối đa 5 MB.</p>
                  {!isCourseMediaConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                  {!courseId && isCourseMediaConfigured && <p className="teacher-field-help">Lưu nháp trước khi tải ảnh lên.</p>}
                  {uploadMessage && <p className="teacher-field-error" role="alert">{uploadMessage}</p>}
                </section>
                <section className="settings-card teacher-editor-card teacher-publish-checklist">
                  <div className="teacher-card-heading">
                    <h2>Trước khi xuất bản</h2>
                    <p>{checklist.filter((item) => item.complete).length}/4 mục đã hoàn thành.</p>
                  </div>
                  <div className="teacher-check-progress" role="progressbar" aria-valuenow={checklist.filter((item) => item.complete).length} aria-valuemin={0} aria-valuemax={4}>
                    <span style={{ width: `${checklist.filter((item) => item.complete).length * 25}%` }} />
                  </div>
                  <ul>{checklist.map((item) => <li key={item.label}><span className={item.complete ? "complete" : ""}>{item.complete ? <Check size={14} /> : null}</span>{item.label}</li>)}</ul>
                </section>
              </aside>
            </div>
          ) : (
            <div className="teacher-content-grid">
              <section className="settings-card teacher-editor-card teacher-course-structure">
                <div className="teacher-card-heading">
                  <h2>Cấu trúc khóa học</h2>
                  <p>{chapterCount} chương · {lessonCount} bài học</p>
                </div>
                <div className="teacher-structure-list">
                  {course.chuong.map((chapter, chapterIndex) => (
                    <section className="teacher-structure-chapter" key={chapter.localId}>
                      <div className="teacher-structure-chapter-heading">
                        <button className="teacher-collapse-button" type="button" aria-expanded={Boolean(expanded[chapter.localId])} onClick={() => setExpanded((current) => ({ ...current, [chapter.localId]: !current[chapter.localId] }))}>
                          <ChevronDown className={expanded[chapter.localId] ? "" : "collapsed"} size={16} aria-hidden="true" />
                          <span>{chapter.tieu_de || `Chương ${chapter.thu_tu}`}</span>
                        </button>
                        <div className="teacher-order-actions">
                          <button className="teacher-icon-button" type="button" aria-label={`Đưa chương ${chapter.thu_tu} lên`} disabled={!editable || hasUnsavedChanges || chapterIndex === 0 || saving} onClick={() => void moveChapter(chapterIndex, -1)}><ArrowUp size={15} aria-hidden="true" /></button>
                          <button className="teacher-icon-button" type="button" aria-label={`Đưa chương ${chapter.thu_tu} xuống`} disabled={!editable || hasUnsavedChanges || chapterIndex === course.chuong.length - 1 || saving} onClick={() => void moveChapter(chapterIndex, 1)}><ArrowDown size={15} aria-hidden="true" /></button>
                          <button className="teacher-icon-button" type="button" aria-label={`Sửa chương ${chapter.thu_tu}`} disabled={!editable} onClick={() => { setSelectedChapterId(chapter.localId); setSelectedLessonId(null); }}><span>Sửa</span></button>
                          <button className="teacher-icon-button teacher-delete-button" type="button" aria-label={`Xóa chương ${chapter.thu_tu}`} disabled={!editable || saving || (hasUnsavedChanges && Boolean(chapter.ma_chuong))} onClick={() => askConfirmation("Xóa chương", "Các bài học và dữ liệu liên quan trong chương này sẽ bị xóa.", () => void deleteChapter(chapter))}><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                      </div>
                      {expanded[chapter.localId] && (
                        <div className="teacher-structure-lessons">
                          {chapter.bai_hoc.map((lesson, lessonIndex) => (
                            <div className="teacher-structure-lesson-row" key={lesson.localId}>
                              <button className={`teacher-structure-lesson${selectedLessonId === lesson.localId ? " active" : ""}`} type="button" disabled={!editable} onClick={() => { setSelectedChapterId(chapter.localId); setSelectedLessonId(lesson.localId); }}>
                                <FileText size={15} aria-hidden="true" /> {lesson.tieu_de || `Bài học ${lesson.thu_tu}`}
                              </button>
                              <div className="teacher-order-actions">
                                <button className="teacher-icon-button" type="button" aria-label={`Đưa bài học ${lesson.thu_tu} lên`} disabled={!editable || hasUnsavedChanges || lessonIndex === 0 || !lesson.ma_bai_hoc} onClick={() => void moveLesson(chapter, lessonIndex, -1)}><ArrowUp size={14} aria-hidden="true" /></button>
                                <button className="teacher-icon-button" type="button" aria-label={`Đưa bài học ${lesson.thu_tu} xuống`} disabled={!editable || hasUnsavedChanges || lessonIndex === chapter.bai_hoc.length - 1 || !lesson.ma_bai_hoc} onClick={() => void moveLesson(chapter, lessonIndex, 1)}><ArrowDown size={14} aria-hidden="true" /></button>
                              </div>
                            </div>
                          ))}
                          <button className="teacher-inline-add" type="button" disabled={!editable || hasUnsavedChanges || !chapter.ma_chuong || saving} onClick={() => {
                            if (!chapter.ma_chuong) return;
                            const lesson = newLesson(chapter.ma_chuong, chapter.bai_hoc.length + 1);
                            updateChapter(chapter.localId, (current) => ({ ...current, bai_hoc: [...current.bai_hoc, lesson] }));
                            setSelectedChapterId(chapter.localId);
                            setSelectedLessonId(lesson.localId);
                          }}>+ Thêm bài học vào {chapter.tieu_de || `Chương ${chapter.thu_tu}`}</button>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
                <button className="button button-outline teacher-add-chapter" type="button" disabled={!editable || hasUnsavedChanges || !courseSaved || saving} onClick={() => {
                  const chapter = { ...newChapter(course.ma_khoa_hoc), thu_tu: course.chuong.length + 1 };
                  setCourse((current) => ({ ...current, chuong: [...current.chuong, chapter] }));
                  setSelectedChapterId(chapter.localId);
                  setSelectedLessonId(null);
                  setHasUnsavedChanges(true);
                  setErrors((current) => ({ ...current, selectedChapter: "" }));
                }}><Plus size={15} aria-hidden="true" /> Thêm chương</button>
                {!courseSaved && <p className="teacher-field-help">Lưu nháp trước khi thêm chương và bài học.</p>}
              </section>
              <section className="settings-card teacher-editor-card teacher-lesson-editor">
                {selectedChapter && !selectedLesson ? (
                  <>
                    <div className="teacher-card-heading">
                      <h2>Chỉnh sửa chương</h2>
                      <p>Chương {selectedChapter.thu_tu}</p>
                    </div>
                    <label className="teacher-form-field" htmlFor="chapter-title"><span>Tiêu đề chương *</span><input id="chapter-title" value={selectedChapter.tieu_de} maxLength={200} disabled={!editable} aria-invalid={Boolean(errors[`chapter.${selectedChapter.localId}`])} onChange={(event) => updateChapter(selectedChapter.localId, (chapter) => ({ ...chapter, tieu_de: event.target.value }))} />{fieldError(`chapter.${selectedChapter.localId}`)}</label>
                    <button className="button button-primary" type="button" disabled={!editable || saving} onClick={() => void saveChapter(selectedChapter)}>{saving ? "Đang lưu..." : "Lưu chương"}</button>
                  </>
                ) : selectedLesson && selectedChapter ? (
                  <>
                    <div className="teacher-card-heading">
                      <h2>Chỉnh sửa bài học</h2>
                      <p>Chương {selectedChapter.thu_tu} · Bài {selectedLesson.thu_tu} · Đang sửa</p>
                    </div>
                    <label className="teacher-form-field" htmlFor="lesson-title">
                      <span>Tiêu đề bài học *</span>
                      <span className="teacher-input-counter"><input id="lesson-title" value={selectedLesson.tieu_de} maxLength={200} disabled={!editable} aria-invalid={Boolean(errors.tieu_de)} aria-describedby={errors.tieu_de ? "tieu_de-error" : undefined} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, tieu_de: event.target.value }))} /><span>{selectedLesson.tieu_de.length}/200</span></span>
                      {fieldError("tieu_de")}
                    </label>
                    <label className="teacher-form-field" htmlFor="lesson-text"><span>Nội dung văn bản</span><textarea id="lesson-text" rows={5} value={selectedLesson.noi_dung_van_ban} maxLength={5000} disabled={!editable} aria-invalid={Boolean(errors.noi_dung_van_ban)} aria-describedby={errors.noi_dung_van_ban ? "noi_dung_van_ban-error" : undefined} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, noi_dung_van_ban: event.target.value }))} /><span className="teacher-character-count">{selectedLesson.noi_dung_van_ban.length}/5000</span>{fieldError("noi_dung_van_ban")}</label>
                    <div className="teacher-lesson-media">
                      <div className="teacher-field-label">Ảnh</div>
                      <div className="teacher-media-row">
                        <button className="button button-outline" type="button" disabled={!editable || !isCourseMediaConfigured || !selectedLesson.ma_bai_hoc || uploading} onClick={() => lessonImageInput.current?.click()}><ImagePlus size={15} aria-hidden="true" /> Tải ảnh lên</button>
                        <input ref={lessonImageInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden disabled={!editable || !isCourseMediaConfigured || !selectedLesson.ma_bai_hoc} onChange={(event) => void uploadLessonImage(event)} />
                        <label className="teacher-form-field" htmlFor="lesson-image-url"><span className="sr-only">Hoặc dán đường dẫn ảnh</span><input id="lesson-image-url" type="url" placeholder="Hoặc dán đường dẫn ảnh" value={selectedLesson.duong_dan_anh} disabled={!editable} aria-invalid={Boolean(errors.duong_dan_anh)} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, duong_dan_anh: event.target.value }))} /></label>
                      </div>
                      {!isCourseMediaConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                      {selectedLesson.duong_dan_anh && <img className="teacher-lesson-image-preview" src={selectedLesson.duong_dan_anh} alt={`Ảnh bài học ${selectedLesson.tieu_de}`} />}
                    </div>
                    <label className="teacher-form-field" htmlFor="lesson-video"><span>Liên kết video</span><input id="lesson-video" type="url" value={selectedLesson.lien_ket_video} disabled={!editable} aria-invalid={Boolean(errors.lien_ket_video)} aria-describedby={errors.lien_ket_video ? "lien_ket_video-error" : "lesson-video-help"} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, lien_ket_video: event.target.value }))} />{fieldError("lien_ket_video")}<span className="teacher-field-help" id="lesson-video-help">Chỉ nhập liên kết https từ YouTube, Vimeo hoặc Supabase. Video không được lưu trữ trên LINEA.</span></label>
                    <label className="teacher-required-toggle"><input type="checkbox" checked={selectedLesson.bat_buoc} disabled={!editable} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bat_buoc: event.target.checked }))} /> Bắt buộc hoàn thành để mở bài tiếp theo</label>
                    <section className="teacher-attachments">
                      <h3>Tệp tham khảo</h3>
                      <button className="teacher-drop-zone" type="button" disabled={!editable || !isCourseAttachmentConfigured || !selectedLesson.ma_bai_hoc || uploading} onClick={() => attachmentInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); const droppedFile = event.dataTransfer.files[0]; if (droppedFile) void uploadAttachmentFile(droppedFile); }}>
                        {uploading ? "Đang tải lên..." : "Kéo thả tệp vào đây hoặc chọn tệp từ máy"}
                        <small>PDF, JPG, PNG, WEBP, ZIP · tối đa 20 MB mỗi tệp, tối đa 5 tệp</small>
                      </button>
                      <input ref={attachmentInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.zip" hidden disabled={!editable || !isCourseAttachmentConfigured || !selectedLesson.ma_bai_hoc || uploading} onChange={(event) => void uploadAttachment(event)} />
                      {!isCourseAttachmentConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                      {!selectedLesson.ma_bai_hoc && <p className="teacher-field-help">Lưu bài học trước khi tải tệp.</p>}
                      {selectedLesson.tep_dinh_kem.map((attachment) => (
                        <div className="teacher-attachment-row" key={String(attachment.ma_tep)}>
                          <span className="teacher-file-chip">{fileTypeLabel(attachment)}</span>
                          <span className="teacher-attachment-name">{attachment.ten_tep}</span>
                          <span className="teacher-attachment-size">{fileSize(attachment.dung_luong)}</span>
                          <button className="teacher-text-button" type="button" disabled={!editable || saving} onClick={() => void removeAttachment(attachment)}>Gỡ</button>
                          <button className="teacher-text-button" type="button" onClick={() => void createCourseMediaSignedUrl(attachment.duong_dan).then((url) => window.open(url, "_blank", "noopener,noreferrer")).catch(() => setUploadMessage("Không thể tạo liên kết tải tệp. Vui lòng thử lại."))}>Tải xuống</button>
                        </div>
                      ))}
                    </section>
                    <section className="teacher-assignment">
                      <label className="teacher-required-toggle teacher-assignment-toggle"><input type="checkbox" checked={Boolean(selectedLesson.bai_tap)} disabled={!editable} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: event.target.checked ? { ma_bai_tap: null, de_bai: "", han_nop: null, bat_buoc: true, tieu_chi: [] } : null }))} /> Bài tập</label>
                      {selectedLesson.bai_tap && (
                        <>
                          <label className="teacher-form-field" htmlFor="assignment-description"><span>Đề bài *</span><textarea id="assignment-description" rows={4} value={selectedLesson.bai_tap.de_bai} maxLength={5000} disabled={!editable} aria-invalid={Boolean(errors.de_bai)} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, de_bai: event.target.value } : null }))} />{fieldError("de_bai")}</label>
                          <label className="teacher-form-field" htmlFor="assignment-deadline"><span>Hạn nộp</span><input id="assignment-deadline" type="datetime-local" value={selectedLesson.bai_tap.han_nop ? selectedLesson.bai_tap.han_nop.slice(0, 16) : ""} disabled={!editable} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, han_nop: event.target.value ? new Date(event.target.value).toISOString() : null } : null }))} />{fieldError("han_nop")}</label>
                          <label className="teacher-required-toggle"><input type="checkbox" checked={selectedLesson.bai_tap.bat_buoc} disabled={!editable} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, bat_buoc: event.target.checked } : null }))} /> Bài tập bắt buộc</label>
                          <div className="teacher-rubric-heading"><h3>Tiêu chí chấm điểm</h3><span className={`teacher-rubric-total${selectedLesson.bai_tap.tieu_chi.reduce((sum, item) => sum + item.ty_trong, 0) === 100 ? " valid" : ""}`}>Tổng {selectedLesson.bai_tap.tieu_chi.reduce((sum, item) => sum + item.ty_trong, 0)}%</span></div>
                          {selectedLesson.bai_tap.tieu_chi.map((criterion, index) => (
                            <div className="teacher-rubric-row" key={`${selectedLesson.localId}-${index}`}>
                              <label className="sr-only" htmlFor={`rubric-name-${index}`}>Tên tiêu chí {index + 1}</label>
                              <input id={`rubric-name-${index}`} value={criterion.ten_tieu_chi} maxLength={100} disabled={!editable} onChange={(event) => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.map((item, itemIndex) => itemIndex === index ? { ...item, ten_tieu_chi: event.target.value } : item))} />
                              <label className="sr-only" htmlFor={`rubric-weight-${index}`}>Tỉ trọng tiêu chí {index + 1}</label>
                              <input id={`rubric-weight-${index}`} type="number" min={1} max={100} value={criterion.ty_trong} disabled={!editable} onChange={(event) => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.map((item, itemIndex) => itemIndex === index ? { ...item, ty_trong: Number(event.target.value) } : item))} />
                              <button className="teacher-icon-button teacher-delete-button" type="button" aria-label={`Xóa tiêu chí ${index + 1}`} disabled={!editable} onClick={() => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.filter((_, itemIndex) => itemIndex !== index))}><X size={15} aria-hidden="true" /></button>
                            </div>
                          ))}
                          {fieldError("tieu_chi")}
                          <button className="teacher-inline-add" type="button" disabled={!editable || selectedLesson.bai_tap.tieu_chi.length >= 10} onClick={() => updateRubric(selectedLesson, [...selectedLesson.bai_tap!.tieu_chi, { ma_tieu_chi: 0, ma_bai_tap: selectedLesson.bai_tap!.ma_bai_tap ?? 0, ten_tieu_chi: "", ty_trong: 0, thu_tu: selectedLesson.bai_tap!.tieu_chi.length + 1 }])}>+ Thêm tiêu chí</button>
                        </>
                      )}
                    </section>
                    {uploadMessage && <p className="teacher-field-error" role="alert">{uploadMessage}</p>}
                    <div className="teacher-form-actions">
                      <button className="button button-primary" type="button" disabled={!editable || saving} onClick={() => void saveLesson(selectedLesson)}>{saving ? "Đang lưu..." : "Lưu bài học"}</button>
                      <button className="button button-outline teacher-danger-action" type="button" disabled={!editable || saving || (hasUnsavedChanges && Boolean(selectedLesson.ma_bai_hoc))} onClick={() => askConfirmation("Xóa bài học", "Bài học và các dữ liệu liên quan sẽ bị xóa.", () => void deleteLesson(selectedLesson))}>Xóa bài</button>
                    </div>
                  </>
                ) : (
                  <div className="teacher-empty-editor"><h2>Chọn nội dung để chỉnh sửa</h2><p>Thêm chương để bắt đầu xây dựng khóa học.</p></div>
                )}
              </section>
            </div>
          )}
          {hasUnsavedChanges && <p className="teacher-unsaved-indicator" role="status">Có thay đổi chưa được lưu.</p>}
        </div>
      </main>
      {confirmation && <Dialog confirmation={confirmation} close={() => setConfirmation(null)} />}
    </div>
  );
}
