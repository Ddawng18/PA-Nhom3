import Button from "../components/ui/Button";
import FormField from "../components/ui/FormField";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Eye,
  FileText,
  ImagePlus,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { z } from "zod";
import { createUuid } from "../logic/uuid";
import { useAuth } from "../auth/useAuth";
import Sidebar from "../components/Sidebar";
import { courseLevels, courseTopics } from "../data/courseEditorOptions";
import { courseTemplates, type CourseTemplate } from "../data/courseTemplates";
import { getCourseOutcomes } from "../data/courseProof";
import { useCourseEditor, type CourseEditorChapter, type CourseEditorLesson, type CourseEditorModel } from "../hooks/useCourseEditor";
import { supabase } from "../lib/supabase";
import {
  canEditCourse,
  getCourseLevelLabel,
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
import { deleteDraftCourse, createCourseRevision, saveCourseInfo, submitCourse } from "../lib/courseApi";
import { loadCourseEditorVersion, saveCourseEditor } from "../lib/courseEditorApi";
import "../styles/teacher-course.css";

type LocalAttachment = CourseEditorAttachment & { pendingFile?: File };
type LocalLesson = Omit<CourseEditorLesson, "tep_dinh_kem"> & { localId: string; imageFile?: File; removedAttachments?: CourseEditorAttachment[]; tep_dinh_kem: LocalAttachment[] };
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
    thoi_luong: course.thoi_luong ?? "",
    ngay_khai_giang: course.ngay_khai_giang ?? "",
    ket_qua: course.ket_qua ?? [],
    phan_hoi_mau: course.phan_hoi_mau ?? "",
    kieu_bia: course.kieu_bia ?? "auto",
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
    thoi_luong: "",
    ngay_khai_giang: "",
    ket_qua: [],
    phan_hoi_mau: "",
    kieu_bia: "auto",
    trang_thai: "NHAP",
    chuong: [],
  };
}

function newChapter(courseId: string | number): LocalChapter {
  return {
    ma_chuong: null,
    ma_khoa_hoc: courseId,
    localId: createUuid(),
    tieu_de: "",
    thu_tu: 1,
    bai_hoc: [],
  };
}

function newLesson(chapterId: string | number, order: number): LocalLesson {
  return {
    ma_bai_hoc: null,
    ma_chuong: chapterId,
    localId: createUuid(),
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
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    return () => {
      dialog.close();
      previousFocus?.focus();
    };
  }, []);

  return (
    <dialog className="course-dialog" aria-labelledby="course-dialog-title" aria-describedby="course-dialog-description"
      ref={dialogRef} onCancel={event => { event.preventDefault(); close(); }}>
        <h2 id="course-dialog-title">{confirmation.title}</h2>
        <p id="course-dialog-description">{confirmation.message}</p>
        <div className="course-dialog-actions">
          <Button variant="outline" onClick={close}>Hủy</Button>
          <Button type="button" onClick={confirmation.action}>Xác nhận</Button>
        </div>
    </dialog>
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
  const [activeTab, setActiveTab] = useState<"basic" | "content" | "preview">("basic");
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [revisionBusy, setRevisionBusy] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const currentPath = useRef(`${location.pathname}${location.search}${location.hash}`);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const draftId = useRef<string | undefined>(undefined);
  const draftVersion = useRef<string | null>(null);
  const nextAttachmentId = useRef(-1);
  const previewUrls = useRef(new Set<string>());
  useEffect(() => {
    const urls = previewUrls.current;
    return () => { for (const url of urls) URL.revokeObjectURL(url); };
  }, []);
  function previewFile(file: File) {
    const url = URL.createObjectURL(file);
    previewUrls.current.add(url);
    return url;
  }
  const coverInput = useRef<HTMLInputElement>(null);
  const lessonImageInput = useRef<HTMLInputElement>(null);
  const attachmentInput = useRef<HTMLInputElement>(null);
  const isEditing = Boolean(courseId);
  const readOnly = isEditing && !editor.loading && Boolean(editor.course) && !canEditCourse(editor.course?.trang_thai ?? "", editor.course?.ma_giao_vien === userId);
  const selectedChapter = course.chuong.find((chapter) => chapter.localId === selectedChapterId) ?? null;
  const selectedLesson = selectedChapter?.bai_hoc.find((lesson) => lesson.localId === selectedLessonId) ?? null;

  useEffect(() => {
    if (!editor.course) return;
    draftVersion.current = editor.version;
    const incoming = asLocalCourse(editor.course);
    setCourse(incoming);
    setSelectedChapterId((current) => current && editor.course?.chuong.some((chapter) => String(chapter.ma_chuong) === current)
      ? current
      : editor.course?.chuong[0] ? String(editor.course.chuong[0].ma_chuong) : null);
    setSelectedLessonId((current) => current && editor.course?.chuong.some((chapter) => chapter.bai_hoc.some((lesson) => String(lesson.ma_bai_hoc) === current))
      ? current
      : editor.course?.chuong[0]?.bai_hoc[0] ? String(editor.course.chuong[0].bai_hoc[0].ma_bai_hoc) : null);
    setHasUnsavedChanges(false);
  }, [editor.course, editor.version]);

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
    { label: "Kết quả học tập", complete: course.ket_qua.filter((item) => item.trim().length >= 5).length >= 2 },
    { label: "Phản hồi mẫu", complete: course.phan_hoi_mau.trim().length >= 20 },
  ];

  if (!user) return null;
  const displayName = getDisplayName(user);
  const editable = !readOnly && course.trang_thai === "NHAP";

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
    setErrors(current => ({ ...current, [`chapter.${localId}`]: "" }));
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
    setErrors(current => ({ ...current, [`lesson.${localId}`]: "" }));
  }

  function applyTemplate(template: CourseTemplate) {
    function apply() {
      const chapters = template.chapters.map((chapter, chapterIndex) => {
        const localChapter = newChapter(course.ma_khoa_hoc);
        return {
          ...localChapter,
          tieu_de: chapter.title,
          thu_tu: chapterIndex + 1,
          bai_hoc: chapter.lessons.map((lesson, lessonIndex) => ({
            ...newLesson(localChapter.ma_chuong ?? "", lessonIndex + 1),
            tieu_de: lesson.title,
            noi_dung_van_ban: lesson.content,
          })),
        };
      });
      setCourse((current) => ({
        ...current,
        tieu_de: template.name,
        mo_ta: template.description,
        cap_do: template.level,
        chu_de: template.topic,
        thoi_luong: template.duration,
        ket_qua: getCourseOutcomes({ tieu_de: template.name, chu_de: template.topic, cap_do: template.level }),
        phan_hoi_mau: "“Bài luyện đã có hướng rõ. Hãy chọn một điểm nhấn duy nhất và giảm chi tiết ở vùng phụ để mắt có nơi dừng.”",
        kieu_bia: "auto",
        chuong: chapters,
      }));
      setSelectedChapterId(chapters[0]?.localId ?? null);
      setSelectedLessonId(chapters[0]?.bai_hoc[0]?.localId ?? null);
      setExpanded(chapters[0] ? { [chapters[0].localId]: true } : {});
      setHasUnsavedChanges(true);
      setMessage(`Đã áp dụng mẫu “${template.name}”. Bạn có thể chỉnh sửa toàn bộ nội dung trước khi lưu.`);
      setActiveTab("basic");
    }
    if (course.chuong.length || course.tieu_de.trim()) {
      askConfirmation("Thay nội dung hiện tại?", "Áp dụng mẫu sẽ thay thế thông tin và cấu trúc bài học đang soạn.", apply);
      return;
    }
    apply();
  }

  function fieldError(field: string) {
    const error = errors[field] ?? Object.entries(errors).find(([key]) => key.startsWith(`${field}.`))?.[1];
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

  async function saveCourse(forReview = false): Promise<string | undefined> {
    const validation = validateCourseInfo({ ...course, anh_dai_dien: coverFile ? "" : course.anh_dai_dien });
    if (!validation.success) {
      setErrors(collectIssues(validation)); setActiveTab("basic");
      setMessage(validation.error.issues.map(issue => issue.message).join(" "));
      return;
    }
    const nextErrors: Record<string, string> = {};
    const chapterNames = new Set<string>();
    for (const chapter of course.chuong) {
      const title = chapterTitleSchema.safeParse(chapter.tieu_de);
      const chapterKey = chapter.tieu_de.trim().toLowerCase();
      if (!title.success || chapterNames.has(chapterKey)) {
        nextErrors[`chapter.${chapter.localId}`] = !title.success ? title.error.issues[0].message : `Tên chương “${chapter.tieu_de.trim()}” bị trùng trong khóa học.`;
      }
      chapterNames.add(chapterKey);
      const lessonNames = new Set<string>();
      for (const lesson of chapter.bai_hoc) {
        const checked = validateLesson({ ...lesson, duong_dan_anh: lesson.imageFile ? "https://media.supabase.co/pending" : lesson.duong_dan_anh });
        const lessonKey = lesson.tieu_de.trim().toLowerCase();
        let issue = !checked.success ? checked.error.issues[0].message : lessonNames.has(lessonKey) ? `Tên bài học “${lesson.tieu_de.trim()}” bị trùng trong chương.` : "";
        lessonNames.add(lessonKey);
        if (!issue && lesson.bai_tap) {
          const assignment = validateAssignment(lesson.bai_tap);
          const rubric = validateRubric(lesson.bai_tap.tieu_chi);
          if (!assignment.success) issue = assignment.error.issues[0].message;
          else if (!rubric.success) issue = rubric.error.issues[0].message;
        }
        if (issue) nextErrors[`lesson.${lesson.localId}`] = `${chapter.tieu_de || "Chương chưa có tên"} / ${lesson.tieu_de || "Bài học chưa có tên"}: ${issue}`;
      }
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors); setActiveTab("content");
      const invalidChapter = course.chuong.find(ch => nextErrors[`chapter.${ch.localId}`] || ch.bai_hoc.some(l => nextErrors[`lesson.${l.localId}`]));
      if (invalidChapter) {
        setSelectedChapterId(invalidChapter.localId);
        setSelectedLessonId(invalidChapter.bai_hoc.find(l => nextErrors[`lesson.${l.localId}`])?.localId ?? null);
        setExpanded(current => ({ ...current, [invalidChapter.localId]: true }));
      }
      setMessage(Object.values(nextErrors).join(" "));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true); setMessage("Đang lưu toàn bộ khóa học..."); setUploadMessage(null);
    const uploads: Array<{ path: string; bucket: "media" | "attachments"; committed: boolean }> = [];
    let id = courseId ?? draftId.current;
    try {
      if (!session?.access_token) throw new Error("Phiên đăng nhập đã hết hạn.");
      const token = session.access_token;
      if (!id) {
        const saved = await saveCourseInfo(token, undefined, validation.data);
        id = String(saved.ma_khoa_hoc); draftId.current = id;
      }
      const version = draftVersion.current ?? editor.version ?? await loadCourseEditorVersion(token, id);
      draftVersion.current = version;
      async function upload(file: File, kind: "cover" | "lessonImage" | "attachment") {
        const checked = await validateUpload(kind, file);
        if (!checked.success) throw new Error(checked.message);
        const bucket = kind === "attachment" ? "attachments" : "media";
        const media = await uploadCourseMedia(token, id!, file, checked.fileKind, bucket);
        uploads.push({ path: media.path, bucket, committed: false });
        if (bucket === "media" && !media.publicUrl) throw new Error("Không thể tạo địa chỉ ảnh công khai.");
        return media;
      }
      let values = validation.data;
      if (coverFile) values = { ...values, anh_dai_dien: (await upload(coverFile, "cover")).publicUrl! };
      const prepared: LocalCourse = { ...course, ...values, ma_khoa_hoc: id, chuong: [] };
      for (const chapter of course.chuong) {
        const nextChapter: LocalChapter = { ...chapter, tieu_de: chapter.tieu_de.trim(), ma_khoa_hoc: id, bai_hoc: [] };
        for (const lesson of chapter.bai_hoc) {
          const nextLesson: LocalLesson = { ...lesson, tieu_de: lesson.tieu_de.trim(), imageFile: undefined, removedAttachments: undefined, tep_dinh_kem: [] };
          if (lesson.imageFile) nextLesson.duong_dan_anh = (await upload(lesson.imageFile, "lessonImage")).publicUrl!;
          for (const attachment of lesson.tep_dinh_kem) {
            nextLesson.tep_dinh_kem.push(attachment.pendingFile
              ? { ...attachment, duong_dan: (await upload(attachment.pendingFile, "attachment")).path, pendingFile: undefined }
              : attachment);
          }
          nextChapter.bai_hoc.push(nextLesson);
        }
        prepared.chuong.push(nextChapter);
      }
      const result = await saveCourseEditor(token, prepared, version, undefined, values);
      for (const upload of uploads) upload.committed = true;
      draftVersion.current = result.version;
      const chapterIndex = course.chuong.findIndex(ch => ch.localId === selectedChapterId);
      const lessonIndex = course.chuong.flatMap(ch => ch.bai_hoc).findIndex(l => l.localId === selectedLessonId);
      setExpanded(current => Object.fromEntries(course.chuong.map((chapter, index) => [String(result.chapterIds[index]), current[chapter.localId] ?? true])));
      setSelectedChapterId(chapterIndex >= 0 ? String(result.chapterIds[chapterIndex]) : null);
      setSelectedLessonId(lessonIndex >= 0 ? String(result.lessonIds[lessonIndex]) : null);
      setCoverFile(null); setHasUnsavedChanges(false); setErrors({});
      setMessage("Đã lưu toàn bộ thông tin khóa học, chương, bài học và tệp đính kèm.");
      for (const lesson of course.chuong.flatMap(ch => ch.bai_hoc)) {
        for (const attachment of lesson.removedAttachments ?? []) {
          try { await removeCourseMedia(token, id, attachment.duong_dan, "attachments"); }
          catch { setUploadMessage("Đã lưu nội dung nhưng chưa dọn được một số tệp cũ."); }
        }
      }
      if (!forReview) {
        if (!courseId) navigate(`/teacher/courses/${encodeURIComponent(id)}/edit`, { replace: true });
        else editor.reload();
      }
      return id;
    } catch (error) {
      if (id) for (const upload of uploads.filter(item => !item.committed)) {
        try { await removeCourseMedia(session?.access_token ?? "", id, upload.path, upload.bucket); }
        catch { setUploadMessage("Chưa dọn được tệp vừa tải lên. Nội dung đang soạn vẫn được giữ lại để thử lại."); }
      }
      setMessage(error instanceof Error && error.message ? error.message : "Chưa thể lưu toàn bộ khóa học. Vui lòng thử lại.");
    } finally { setSaving(false); }
  }

  async function uploadCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const validation = await validateUpload("cover", file);
      if (!validation.success) { setUploadMessage(validation.message); return; }
      setCoverFile(file);
      setCourseField("anh_dai_dien", previewFile(file));
      setUploadMessage(null);
    } finally { setUploading(false); }
  }

  async function uploadLessonImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !selectedLesson) return;
    setUploading(true);
    try {
      const validation = await validateUpload("lessonImage", file);
      if (!validation.success) { setUploadMessage(validation.message); return; }
      const url = previewFile(file);
      updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, imageFile: file, duong_dan_anh: url }));
      setUploadMessage(null);
    } finally { setUploading(false); }
  }

  async function uploadAttachmentFile(file: File) {
    if (!selectedLesson || !isCourseAttachmentConfigured) return;
    setUploading(true);
    try {
      const validation = await validateUpload("attachment", file, selectedLesson.tep_dinh_kem.length);
      if (!validation.success) { setUploadMessage(validation.message); return; }
      const attachment: LocalAttachment = {
        ma_tep: nextAttachmentId.current--, ma_bai_hoc: selectedLesson.ma_bai_hoc ?? -1,
        ten_tep: await cleanCourseMediaName(file.name), duong_dan: previewFile(file),
        loai_tep: ["jpeg", "png", "webp"].includes(validation.fileKind) ? "IMAGE" : "DOCUMENT",
        dung_luong: file.size, pendingFile: file,
      };
      updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, tep_dinh_kem: [...lesson.tep_dinh_kem, attachment] }));
      setUploadMessage(null);
    } finally { setUploading(false); }
  }

  async function uploadAttachment(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadAttachmentFile(file);
  }

  function removeAttachment(attachment: LocalAttachment) {
    if (!selectedLesson) return;
    updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson,
      tep_dinh_kem: lesson.tep_dinh_kem.filter((item) => item.ma_tep !== attachment.ma_tep),
      removedAttachments: attachment.pendingFile ? lesson.removedAttachments : [...(lesson.removedAttachments ?? []), attachment],
    }));
  }

  function deleteLesson(lesson: LocalLesson) {
    setCourse(current => ({ ...current, chuong: current.chuong.map(chapter => ({ ...chapter,
      bai_hoc: chapter.bai_hoc.filter(item => item.localId !== lesson.localId).map((item, index) => ({ ...item, thu_tu: index + 1 })),
    })) }));
    setSelectedLessonId(null); setHasUnsavedChanges(true);
    setMessage("Đã bỏ bài học khỏi bản soạn. Bấm Lưu toàn bộ để áp dụng.");
  }

  function deleteChapter(chapter: LocalChapter) {
    setCourse(current => ({ ...current, chuong: current.chuong.filter(item => item.localId !== chapter.localId).map((item, index) => ({ ...item, thu_tu: index + 1 })) }));
    setSelectedChapterId(null); setSelectedLessonId(null); setHasUnsavedChanges(true);
    setMessage("Đã bỏ chương khỏi bản soạn. Bấm Lưu toàn bộ để áp dụng.");
  }

  function moveChapter(index: number, direction: -1 | 1) {
    setCourse(current => ({ ...current, chuong: reorder(current.chuong, index, direction) }));
    setHasUnsavedChanges(true);
  }

  function moveLesson(chapter: LocalChapter, index: number, direction: -1 | 1) {
    updateChapter(chapter.localId, current => ({ ...current, bai_hoc: reorder(current.bai_hoc, index, direction) }));
  }

  async function sendForReview() {
    const validation = validateCourseInfo({ ...course, anh_dai_dien: coverFile ? "" : course.anh_dai_dien });
    if (!validation.success) {
      setErrors(collectIssues(validation));
      setMessage(`Chưa thể gửi duyệt: ${[...new Set(validation.error.issues.map((issue) => issue.message))].join(" ")}`);
      setActiveTab("basic");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const blockers = getSubmitBlockers(course.chuong);
    if (blockers.length) {
      const emptyChapters = course.chuong.filter((chapter) => chapter.bai_hoc.length === 0);
      setMessage(emptyChapters.length
        ? `Chưa thể gửi duyệt. Các chương chưa có bài học: ${emptyChapters.map((chapter) => chapter.tieu_de || `Chương ${chapter.thu_tu}`).join(", ")}. Hãy thêm và lưu ít nhất một bài học cho mỗi chương.`
        : blockers.join(" "));
      setActiveTab("content");
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    // Submit the ID returned by the save, rather than waiting for the editor
    // hook to reload or for navigation from /new to complete.
    const id = await saveCourse(true);
    if (!id) return;
    setSaving(true);
    setMessage("Đang gửi khóa học để xét duyệt...");
    try {
      if (!session?.access_token) throw new Error("Phiên đăng nhập đã hết hạn.");
      await submitCourse(session.access_token, id);
      setCourse((current) => ({ ...current, trang_thai: "CHO_DUYET" }));
      setMessage("Khóa học đã được gửi duyệt.");
      setHasUnsavedChanges(false);
      if (!courseId) navigate(`/teacher/courses/${encodeURIComponent(id)}/edit`, { replace: true });
      else editor.reload();
    } catch (error) {
      setMessage(`Đã lưu bản nháp nhưng chưa gửi duyệt. ${error instanceof Error && error.message ? error.message : "Vui lòng kiểm tra phiên đăng nhập và thử lại."}`);
    } finally { setSaving(false); }
  }

  async function deleteDraft() {
    if (!session?.access_token || !courseId) return;
    setDeleting(true);
    try {
      await deleteDraftCourse(session.access_token, courseId);
      setHasUnsavedChanges(false);
      navigate("/my-courses", { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xóa bản nháp. Vui lòng thử lại.");
    } finally {
      setDeleting(false);
    }
  }

  async function createRevision() {
    if (!session?.access_token || !courseId) return;
    setRevisionBusy(true);
    setMessage(null);
    try {
      const revision = await createCourseRevision(session.access_token, courseId);
      setHasUnsavedChanges(false);
      navigate(`/teacher/courses/${revision.ma_khoa_hoc}/edit`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tạo bản sửa. Vui lòng thử lại.");
    } finally {
      setRevisionBusy(false);
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
        <Button variant="outline" type="button" onClick={editor.reload}>Thử lại</Button>
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
              <Button variant="outline" type="button" disabled={!editable || saving || uploading} onClick={() => void saveCourse()}>
                {saving ? "Đang lưu..." : "Lưu toàn bộ"}
              </Button>
              {isEditing && courseId && (course.trang_thai === "DA_DANG" || course.trang_thai === "AN") && (
                <Button variant="outline" type="button" disabled={revisionBusy || saving || uploading} onClick={() => void createRevision()}>
                  {revisionBusy ? "Đang tạo bản sửa..." : "Tạo bản sửa"}
                </Button>
              )}
              {isEditing && courseId && course.trang_thai === "NHAP" && (
                <Button variant="outline" className="teacher-danger-action" type="button" disabled={saving || deleting || uploading} onClick={() => askConfirmation("Xóa bản nháp", "Khóa học nháp sẽ bị gỡ khỏi danh sách. Bạn có chắc muốn xóa?", () => void deleteDraft())}>
                  <Trash2 aria-hidden="true" size={15} />
                  {deleting ? "Đang xóa..." : "Xóa bản nháp"}
                </Button>
              )}
              <Button type="button" disabled={!editable || saving || uploading} onClick={() => askConfirmation("Gửi duyệt khóa học", "Thông tin hiện tại sẽ được lưu trước khi gửi xét duyệt. Bạn có muốn tiếp tục?", () => void sendForReview())}>
                Gửi duyệt
              </Button>
            </div>
          </header>
          {course.trang_thai === "CHO_DUYET" && <div className="teacher-review-success" role="status" aria-live="polite"><Check size={22} aria-hidden="true" /><div><strong>Đã gửi khóa học để xét duyệt</strong><p>Khóa học đang chờ quản trị viên xét duyệt. Bạn có thể theo dõi trạng thái tại Khóa học của tôi.</p><Link to="/my-courses">Về khóa học của tôi</Link></div></div>}
          {!editable && course.trang_thai !== "CHO_DUYET" && <p className="teacher-readonly-message" role="status">Không thể sửa khóa học ở trạng thái hiện tại.</p>}
          {message && <p className="teacher-form-message" role="status">{message}</p>}
          {editor.rubricUnavailable && <p className="teacher-form-message" role="alert">Chưa lưu được tiêu chí chấm điểm vì database chưa có bảng tương ứng.</p>}
          {!isEditing && editable && <section className="teacher-template-picker" aria-labelledby="teacher-template-title">
            <div className="teacher-template-heading">
              <p className="settings-eyebrow">BẮT ĐẦU NHANH</p>
              <h2 id="teacher-template-title">Chọn mẫu khóa học</h2>
              <p>Mẫu điền sẵn thông tin và curriculum. Bạn vẫn cần chỉnh sửa, lưu và gửi duyệt.</p>
            </div>
            <div className="teacher-template-grid">
              {courseTemplates.map((template) => <button key={template.id} type="button" className="teacher-template-card" disabled={saving || uploading} onClick={() => applyTemplate(template)}>
                <span className="teacher-template-meta">{template.duration} · {getCourseLevelLabel(template.level)}</span>
                <strong>{template.name}</strong>
                <span>{template.description}</span>
                <small>{template.chapters.length} chương · {template.chapters.reduce((total, chapter) => total + chapter.lessons.length, 0)} bài học</small>
              </button>)}
            </div>
          </section>}
          <nav className="settings-tabs teacher-editor-tabs" aria-label="Mục khóa học">
            <button type="button" className={`settings-tab${activeTab === "basic" ? " active" : ""}`} aria-current={activeTab === "basic" ? "page" : undefined} onClick={() => setActiveTab("basic")}>Thông tin cơ bản</button>
            <button type="button" className={`settings-tab${activeTab === "content" ? " active" : ""}`} aria-current={activeTab === "content" ? "page" : undefined} onClick={() => setActiveTab("content")}>Nội dung bài học ({chapterCount} chương)</button>
            <button type="button" className={`settings-tab${activeTab === "preview" ? " active" : ""}`} aria-current={activeTab === "preview" ? "page" : undefined} onClick={() => setActiveTab("preview")}><Eye size={15} aria-hidden="true" /> Xem trước</button>
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
                  <span className="teacher-input-counter"><input id="course-title" value={course.tieu_de} maxLength={200} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.tieu_de)} aria-describedby={`course-title-help ${errors.tieu_de ? "tieu_de-error" : ""}`} onChange={(event) => setCourseField("tieu_de", event.target.value)} /><span>{course.tieu_de.length}/200</span></span>
                  <span className="teacher-field-help" id="course-title-help">Ngắn gọn, nêu rõ kết quả học viên đạt được.</span>
                  {fieldError("tieu_de")}
                </label>
                <label className="teacher-form-field" htmlFor="course-description">
                  <span>Mô tả khóa học *</span>
                  <textarea id="course-description" rows={4} maxLength={5000} value={course.mo_ta} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.mo_ta)} aria-describedby={errors.mo_ta ? "mo_ta-error" : undefined} onChange={(event) => setCourseField("mo_ta", event.target.value)} />
                  <span className="teacher-character-count">{course.mo_ta.length}/5000</span>
                  {fieldError("mo_ta")}
                </label>
                <label className="teacher-form-field" htmlFor="course-outcomes">
                  <span>Kết quả học tập</span>
                  <textarea id="course-outcomes" rows={4} value={course.ket_qua.join("\n")} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.ket_qua)} aria-describedby={errors.ket_qua ? "ket_qua-error" : "course-outcomes-hint"} onChange={(event) => setCourseField("ket_qua", event.target.value.split(/\r?\n/))} />
                  <span className="teacher-field-help" id="course-outcomes-hint">Mỗi dòng là một kết quả, tối đa 8 dòng.</span>
                  {fieldError("ket_qua")}
                </label>
                <label className="teacher-form-field" htmlFor="course-sample-feedback">
                  <span>Phản hồi mẫu</span>
                  <textarea id="course-sample-feedback" rows={3} maxLength={1000} value={course.phan_hoi_mau} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.phan_hoi_mau)} onChange={(event) => setCourseField("phan_hoi_mau", event.target.value)} />
                  <span className="teacher-character-count">{course.phan_hoi_mau.length}/1000</span>
                  {fieldError("phan_hoi_mau")}
                </label>
                <div className="teacher-form-grid">
                  <label className="teacher-form-field" htmlFor="course-level">
                    <span>Cấp độ *</span>
                    <select id="course-level" value={course.cap_do} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.cap_do)} aria-describedby={errors.cap_do ? "cap_do-error" : undefined} onChange={(event) => setCourseField("cap_do", event.target.value)}>
                      <option value="">Chọn cấp độ</option>
                      {Object.entries(courseLevels).map(([code, label]) => <option value={code} key={code}>{label}</option>)}
                    </select>
                    {fieldError("cap_do")}
                  </label>
                  <label className="teacher-form-field" htmlFor="course-topic">
                    <span>Chủ đề *</span>
                    <input id="course-topic" list="course-topic-options" value={course.chu_de} maxLength={100} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.chu_de)} aria-describedby={errors.chu_de ? "chu_de-error" : undefined} onChange={(event) => setCourseField("chu_de", event.target.value)} />
                    <datalist id="course-topic-options">{topicOptions.map((topic) => <option key={topic} value={topic} />)}</datalist>
                    {fieldError("chu_de")}
                  </label>
                  <label className="teacher-form-field" htmlFor="course-duration">
                    <span>Thời lượng</span>
                    <input id="course-duration" value={course.thoi_luong ?? ""} maxLength={50} placeholder="Ví dụ: 8 tuần, 12 buổi" disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.thoi_luong)} onChange={(event) => setCourseField("thoi_luong", event.target.value)} />
                    {fieldError("thoi_luong")}
                  </label>
                  <label className="teacher-form-field" htmlFor="course-start">
                    <span>Ngày khai giảng</span>
                    <input id="course-start" type="date" value={course.ngay_khai_giang ?? ""} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.ngay_khai_giang)} onChange={(event) => setCourseField("ngay_khai_giang", event.target.value)} />
                    {fieldError("ngay_khai_giang")}
                  </label>
                  <FormField id="course-price" className="teacher-form-field" label="Học phí (VNĐ)"
                    hint="Nhập 0 hoặc để trống nếu khóa học miễn phí." error={errors.gia_vnd}>
                    <input id="course-price" type="number" min={0} max={1_000_000_000} step={1}
                      inputMode="numeric" placeholder="0" value={course.gia_vnd ?? ""}
                      disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.gia_vnd)}
                      aria-describedby={errors.gia_vnd ? "course-price-error" : "course-price-hint"}
                      onChange={(event) => setCourseField("gia_vnd", event.currentTarget.value ? event.currentTarget.valueAsNumber : undefined)} />
                  </FormField>
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
                    <Button variant="outline" type="button" disabled={!editable || !isCourseMediaConfigured || saving || uploading} onClick={() => coverInput.current?.click()}><ImagePlus aria-hidden="true" size={15} /> Chọn ảnh</Button>
                    <button className="teacher-text-button" type="button" disabled={!editable || saving || uploading || !course.anh_dai_dien} onClick={() => { setCoverFile(null); setCourseField("anh_dai_dien", ""); }}>Gỡ ảnh</button>
                    <input ref={coverInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden disabled={!editable || !isCourseMediaConfigured || saving || uploading} onChange={(event) => void uploadCover(event)} />
                  </div>
                  <label className="teacher-form-field" htmlFor="course-cover-url">
                    <span>Hoặc dán đường dẫn ảnh</span>
                    <input id="course-cover-url" type="url" value={coverFile ? "" : course.anh_dai_dien} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.anh_dai_dien)} onChange={(event) => { setCoverFile(null); setCourseField("anh_dai_dien", event.target.value); }} />
                    {fieldError("anh_dai_dien")}
                  </label>
                  <p className="teacher-field-help">Tỉ lệ 16:9, JPG, PNG hoặc WEBP, tối đa 5 MB.</p>
                  <label className="teacher-form-field" htmlFor="course-cover-style">
                    <span>Kiểu bìa dự phòng</span>
                    <select id="course-cover-style" value={course.kieu_bia} disabled={!editable || saving || uploading} onChange={(event) => setCourseField("kieu_bia", event.target.value)}>
                      <option value="auto">Tự động theo khóa học</option>
                      <option value="forest">Xanh rừng</option>
                      <option value="clay">Đất nung</option>
                      <option value="indigo">Xanh chàm</option>
                      <option value="sun">Vàng nắng</option>
                    </select>
                    <span className="teacher-field-help">Dùng khi chưa có ảnh bìa hoặc ảnh không tải được.</span>
                  </label>
                  {!isCourseMediaConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                  {isCourseMediaConfigured && <p className="teacher-field-help">Chọn ảnh để xem trước. Ảnh được tải lên khi bạn bấm Lưu toàn bộ.</p>}
                  {uploadMessage && <p className="teacher-field-error" role="alert">{uploadMessage}</p>}
                </section>
                <section className="settings-card teacher-editor-card teacher-publish-checklist">
                  <div className="teacher-card-heading">
                    <h2>Trước khi xuất bản</h2>
                    <p>{checklist.filter((item) => item.complete).length}/{checklist.length} mục đã hoàn thành.</p>
                  </div>
                  <div className="teacher-check-progress" role="progressbar" aria-valuenow={checklist.filter((item) => item.complete).length} aria-valuemin={0} aria-valuemax={4}>
                    <span style={{ width: `${checklist.filter((item) => item.complete).length * 25}%` }} />
                  </div>
                  <ul>{checklist.map((item) => <li key={item.label}><span className={item.complete ? "complete" : ""}>{item.complete ? <Check size={14} /> : null}</span>{item.label}</li>)}</ul>
                </section>
              </aside>
            </div>
          ) : activeTab === "content" ? (
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
                          <button className="teacher-icon-button" type="button" aria-label={`Đưa chương ${chapter.thu_tu} lên`} disabled={!editable || chapterIndex === 0 || saving} onClick={() => void moveChapter(chapterIndex, -1)}><ArrowUp size={15} aria-hidden="true" /></button>
                          <button className="teacher-icon-button" type="button" aria-label={`Đưa chương ${chapter.thu_tu} xuống`} disabled={!editable || chapterIndex === course.chuong.length - 1 || saving} onClick={() => void moveChapter(chapterIndex, 1)}><ArrowDown size={15} aria-hidden="true" /></button>
                          <button className="teacher-icon-button" type="button" aria-label={`Sửa chương ${chapter.thu_tu}`} disabled={!editable || saving || uploading} onClick={() => { setSelectedChapterId(chapter.localId); setSelectedLessonId(null); }}><span>Sửa</span></button>
                          <button className="teacher-icon-button teacher-delete-button" type="button" aria-label={`Xóa chương ${chapter.thu_tu}`} disabled={!editable || saving} onClick={() => askConfirmation("Xóa chương", "Các bài học và dữ liệu liên quan trong chương này sẽ bị xóa.", () => void deleteChapter(chapter))}><Trash2 size={14} aria-hidden="true" /></button>
                        </div>
                      </div>
                      {expanded[chapter.localId] && (
                        <div className="teacher-structure-lessons">
                          {chapter.bai_hoc.map((lesson, lessonIndex) => (
                            <div className="teacher-structure-lesson-row" key={lesson.localId}>
                              <button className={`teacher-structure-lesson${selectedLessonId === lesson.localId ? " active" : ""}`} type="button" disabled={!editable || saving || uploading} onClick={() => { setSelectedChapterId(chapter.localId); setSelectedLessonId(lesson.localId); }}>
                                <FileText size={15} aria-hidden="true" /> {lesson.tieu_de || `Bài học ${lesson.thu_tu}`}
                              </button>
                              <div className="teacher-order-actions">
                                <button className="teacher-icon-button" type="button" aria-label={`Đưa bài học ${lesson.thu_tu} lên`} disabled={!editable || lessonIndex === 0 || saving || uploading} onClick={() => void moveLesson(chapter, lessonIndex, -1)}><ArrowUp size={14} aria-hidden="true" /></button>
                                <button className="teacher-icon-button" type="button" aria-label={`Đưa bài học ${lesson.thu_tu} xuống`} disabled={!editable || lessonIndex === chapter.bai_hoc.length - 1 || saving || uploading} onClick={() => void moveLesson(chapter, lessonIndex, 1)}><ArrowDown size={14} aria-hidden="true" /></button>
                              </div>
                            </div>
                          ))}
                          <button className="teacher-inline-add" type="button" disabled={!editable || saving || uploading} onClick={() => {
                            const lesson = newLesson(chapter.ma_chuong ?? chapter.localId, chapter.bai_hoc.length + 1);
                            updateChapter(chapter.localId, (current) => ({ ...current, bai_hoc: [...current.bai_hoc, lesson] }));
                            setSelectedChapterId(chapter.localId);
                            setSelectedLessonId(lesson.localId);
                          }}>+ Thêm bài học vào {chapter.tieu_de || `Chương ${chapter.thu_tu}`}</button>
                        </div>
                      )}
                    </section>
                  ))}
                </div>
                <Button variant="outline" className="teacher-add-chapter" type="button" disabled={!editable || saving || uploading} onClick={() => {
                  const chapter = { ...newChapter(course.ma_khoa_hoc), thu_tu: course.chuong.length + 1 };
                  setCourse((current) => ({ ...current, chuong: [...current.chuong, chapter] }));
                  setSelectedChapterId(chapter.localId);
                  setSelectedLessonId(null);
                  setExpanded(current => ({ ...current, [chapter.localId]: true }));
                  setHasUnsavedChanges(true);
                  setErrors((current) => ({ ...current, selectedChapter: "" }));
                }}><Plus size={15} aria-hidden="true" /> Thêm chương</Button>
                <p className="teacher-field-help">Thêm chương và bài học ngay trong bản soạn, rồi bấm Lưu toàn bộ một lần.</p>
              </section>
              <section className="settings-card teacher-editor-card teacher-lesson-editor">
                {selectedChapter && !selectedLesson ? (
                  <>
                    <div className="teacher-card-heading">
                      <h2>Chỉnh sửa chương</h2>
                      <p>Chương {selectedChapter.thu_tu}</p>
                    </div>
                    <FormField id="chapter-title" label="Tiêu đề chương" className="teacher-form-field" required><input id="chapter-title" value={selectedChapter.tieu_de} maxLength={200} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors[`chapter.${selectedChapter.localId}`])} onChange={(event) => updateChapter(selectedChapter.localId, (chapter) => ({ ...chapter, tieu_de: event.target.value }))} />{fieldError(`chapter.${selectedChapter.localId}`)}</FormField>
                    <Button type="button" disabled={!editable || saving || uploading} onClick={() => void saveCourse()}>{saving ? "Đang lưu..." : "Lưu toàn bộ"}</Button>
                  </>
                ) : selectedLesson && selectedChapter ? (
                  <>
                    {fieldError(`lesson.${selectedLesson.localId}`)}
                    <div className="teacher-card-heading">
                      <h2>Chỉnh sửa bài học</h2>
                      <p>Chương {selectedChapter.thu_tu} · Bài {selectedLesson.thu_tu} · Đang sửa</p>
                    </div>
                    <label className="teacher-form-field" htmlFor="lesson-title">
                      <span>Tiêu đề bài học *</span>
                      <span className="teacher-input-counter"><input id="lesson-title" value={selectedLesson.tieu_de} maxLength={200} disabled={!editable || saving || uploading} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, tieu_de: event.target.value }))} /><span>{selectedLesson.tieu_de.length}/200</span></span>
                    </label>
                    <FormField id="lesson-text" label="Nội dung văn bản" className="teacher-form-field"><textarea id="lesson-text" rows={5} value={selectedLesson.noi_dung_van_ban} maxLength={5000} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.noi_dung_van_ban)} aria-describedby={errors.noi_dung_van_ban ? "noi_dung_van_ban-error" : undefined} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, noi_dung_van_ban: event.target.value }))} /><span className="teacher-character-count">{selectedLesson.noi_dung_van_ban.length}/5000</span>{fieldError("noi_dung_van_ban")}</FormField>
                    <div className="teacher-lesson-media">
                      <div className="teacher-field-label">Ảnh</div>
                      <div className="teacher-media-row">
                        <Button variant="outline" type="button" disabled={!editable || !isCourseMediaConfigured || saving || uploading} onClick={() => lessonImageInput.current?.click()}><ImagePlus size={15} aria-hidden="true" /> Chọn ảnh</Button>
                        <input ref={lessonImageInput} type="file" accept=".jpg,.jpeg,.png,.webp" hidden disabled={!editable || !isCourseMediaConfigured || saving || uploading} onChange={(event) => void uploadLessonImage(event)} />
                        <label className="teacher-form-field" htmlFor="lesson-image-url"><span className="sr-only">Hoặc dán đường dẫn ảnh</span><input id="lesson-image-url" type="url" placeholder="Hoặc dán đường dẫn ảnh" value={selectedLesson.imageFile ? "" : selectedLesson.duong_dan_anh} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.duong_dan_anh)} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, imageFile: undefined, duong_dan_anh: event.target.value }))} /></label>
                      </div>
                      {!isCourseMediaConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                      {selectedLesson.duong_dan_anh && <img className="teacher-lesson-image-preview" src={selectedLesson.duong_dan_anh} alt={`Ảnh bài học ${selectedLesson.tieu_de}`} />}
                    </div>
                    <FormField id="lesson-video" label="Liên kết video" className="teacher-form-field"><input id="lesson-video" type="url" value={selectedLesson.lien_ket_video} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.lien_ket_video)} aria-describedby={errors.lien_ket_video ? "lien_ket_video-error" : "lesson-video-help"} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, lien_ket_video: event.target.value }))} />{fieldError("lien_ket_video")}<span className="teacher-field-help" id="lesson-video-help">Chỉ nhập liên kết https từ YouTube, Vimeo hoặc Supabase. Video không được lưu trữ trên LINEA.</span></FormField>
                    <label className="teacher-required-toggle"><input type="checkbox" checked={selectedLesson.bat_buoc} disabled={!editable || saving || uploading} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bat_buoc: event.target.checked }))} /> Bắt buộc hoàn thành để mở bài tiếp theo</label>
                    <section className="teacher-attachments">
                      <h3>Tệp tham khảo</h3>
                      <button className="teacher-drop-zone" type="button" disabled={!editable || !isCourseAttachmentConfigured || saving || uploading} onClick={() => attachmentInput.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!editable || saving || uploading) return; const droppedFile = event.dataTransfer.files[0]; if (droppedFile) void uploadAttachmentFile(droppedFile); }}>
                        {uploading ? "Đang tải lên..." : "Kéo thả tệp vào đây hoặc chọn tệp từ máy"}
                        <small>PDF, JPG, PNG, WEBP, ZIP · tối đa 20 MB mỗi tệp, tối đa 5 tệp</small>
                      </button>
                      <input ref={attachmentInput} type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.zip" hidden disabled={!editable || !isCourseAttachmentConfigured || saving || uploading} onChange={(event) => void uploadAttachment(event)} />
                      {!isCourseAttachmentConfigured && <p className="teacher-field-help" role="status">Tải tệp chưa được cấu hình.</p>}
                      <p className="teacher-field-help">Ảnh và tệp đã chọn sẽ được tải lên khi bạn bấm Lưu toàn bộ.</p>
                      {selectedLesson.tep_dinh_kem.map((attachment) => (
                        <div className="teacher-attachment-row" key={String(attachment.ma_tep)}>
                          <span className="teacher-file-chip">{fileTypeLabel(attachment)}</span>
                          <span className="teacher-attachment-name">{attachment.ten_tep}{attachment.pendingFile ? " (chưa lưu)" : ""}</span>
                          <span className="teacher-attachment-size">{fileSize(attachment.dung_luong)}</span>
                          <button className="teacher-text-button" type="button" disabled={!editable || saving || uploading} onClick={() => void removeAttachment(attachment)}>Gỡ</button>
                          <button className="teacher-text-button" type="button" onClick={() => void (attachment.pendingFile ? Promise.resolve(attachment.duong_dan) : createCourseMediaSignedUrl(attachment.duong_dan)).then((url) => window.open(url, "_blank", "noopener,noreferrer")).catch(() => setUploadMessage("Không thể tạo liên kết tải tệp. Vui lòng thử lại."))}>Tải xuống</button>
                        </div>
                      ))}
                    </section>
                    <section className="teacher-assignment">
                      <label className="teacher-required-toggle teacher-assignment-toggle"><input type="checkbox" checked={Boolean(selectedLesson.bai_tap)} disabled={!editable || saving || uploading} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: event.target.checked ? { ma_bai_tap: null, de_bai: "", han_nop: null, bat_buoc: true, tieu_chi: [] } : null }))} /> Bài tập</label>
                      {selectedLesson.bai_tap && (
                        <>
                          <FormField id="assignment-description" label="Đề bài" className="teacher-form-field" required><textarea id="assignment-description" rows={4} value={selectedLesson.bai_tap.de_bai} maxLength={5000} disabled={!editable || saving || uploading} aria-invalid={Boolean(errors.de_bai)} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, de_bai: event.target.value } : null }))} />{fieldError("de_bai")}</FormField>
                          <FormField id="assignment-deadline" label="Hạn nộp" className="teacher-form-field"><input id="assignment-deadline" type="datetime-local" value={selectedLesson.bai_tap.han_nop ? selectedLesson.bai_tap.han_nop.slice(0, 16) : ""} disabled={!editable || saving || uploading} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, han_nop: event.target.value ? new Date(event.target.value).toISOString() : null } : null }))} />{fieldError("han_nop")}</FormField>
                          <label className="teacher-required-toggle"><input type="checkbox" checked={selectedLesson.bai_tap.bat_buoc} disabled={!editable || saving || uploading} onChange={(event) => updateLesson(selectedLesson.localId, (lesson) => ({ ...lesson, bai_tap: lesson.bai_tap ? { ...lesson.bai_tap, bat_buoc: event.target.checked } : null }))} /> Bài tập bắt buộc</label>
                          <div className="teacher-rubric-heading"><h3>Tiêu chí chấm điểm</h3><span className={`teacher-rubric-total${selectedLesson.bai_tap.tieu_chi.reduce((sum, item) => sum + item.ty_trong, 0) === 100 ? " valid" : ""}`}>Tổng {selectedLesson.bai_tap.tieu_chi.reduce((sum, item) => sum + item.ty_trong, 0)}%</span></div>
                          {selectedLesson.bai_tap.tieu_chi.map((criterion, index) => (
                            <div className="teacher-rubric-row" key={`${selectedLesson.localId}-${index}`}>
                              <label className="sr-only" htmlFor={`rubric-name-${index}`}>Tên tiêu chí {index + 1}</label>
                              <input id={`rubric-name-${index}`} value={criterion.ten_tieu_chi} maxLength={100} disabled={!editable || saving || uploading} onChange={(event) => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.map((item, itemIndex) => itemIndex === index ? { ...item, ten_tieu_chi: event.target.value } : item))} />
                              <label className="sr-only" htmlFor={`rubric-weight-${index}`}>Tỉ trọng tiêu chí {index + 1}</label>
                              <input id={`rubric-weight-${index}`} type="number" min={1} max={100} value={criterion.ty_trong} disabled={!editable || saving || uploading} onChange={(event) => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.map((item, itemIndex) => itemIndex === index ? { ...item, ty_trong: Number(event.target.value) } : item))} />
                              <button className="teacher-icon-button teacher-delete-button" type="button" aria-label={`Xóa tiêu chí ${index + 1}`} disabled={!editable || saving || uploading} onClick={() => updateRubric(selectedLesson, selectedLesson.bai_tap!.tieu_chi.filter((_, itemIndex) => itemIndex !== index))}><X size={15} aria-hidden="true" /></button>
                            </div>
                          ))}
                          {fieldError("tieu_chi")}
                          <button className="teacher-inline-add" type="button" disabled={!editable || selectedLesson.bai_tap.tieu_chi.length >= 10} onClick={() => updateRubric(selectedLesson, [...selectedLesson.bai_tap!.tieu_chi, { ma_tieu_chi: 0, ma_bai_tap: selectedLesson.bai_tap!.ma_bai_tap ?? 0, ten_tieu_chi: "", ty_trong: 0, thu_tu: selectedLesson.bai_tap!.tieu_chi.length + 1 }])}>+ Thêm tiêu chí</button>
                        </>
                      )}
                    </section>
                    {uploadMessage && <p className="teacher-field-error" role="alert">{uploadMessage}</p>}
                    <div className="teacher-form-actions">
                      <Button type="button" disabled={!editable || saving || uploading} onClick={() => void saveCourse()}>{saving ? "Đang lưu..." : "Lưu toàn bộ"}</Button>
                      <Button variant="outline" className="teacher-danger-action" type="button" disabled={!editable || saving} onClick={() => askConfirmation("Xóa bài học", "Bài học và các dữ liệu liên quan sẽ bị xóa.", () => void deleteLesson(selectedLesson))}>Xóa bài</Button>
                    </div>
                  </>
                ) : (
                  <div className="teacher-empty-editor"><h2>Chọn nội dung để chỉnh sửa</h2><p>Thêm chương để bắt đầu xây dựng khóa học.</p></div>
                )}
              </section>
            </div>
          ) : (
            <div className="teacher-preview-layout">
              <article className="settings-card teacher-preview-course">
                <div className="teacher-preview-cover">
                  {course.anh_dai_dien ? <img src={course.anh_dai_dien} alt={`Ảnh bìa ${course.tieu_de || "khóa học"}`} /> : <span aria-hidden="true">{course.tieu_de.slice(0, 1).toUpperCase() || "L"}</span>}
                  <em>Xem trước nội bộ</em>
                </div>
                <p className="teacher-preview-topic">{course.chu_de.toUpperCase() || "CHỦ ĐỀ KHÓA HỌC"}</p>
                <h2>{course.tieu_de || "Tên khóa học của bạn"}</h2>
                <div className="teacher-preview-meta">
                  <span>{getCourseLevelLabel(course.cap_do)}</span>
                  {course.thoi_luong && <span>{course.thoi_luong}</span>}
                  <span>{chapterCount} chương · {lessonCount} bài</span>
                  {course.gia_vnd === 0 ? <strong>Miễn phí</strong> : course.gia_vnd ? <strong>{course.gia_vnd.toLocaleString("vi-VN")} ₫</strong> : null}
                </div>
                <p className="teacher-preview-description">{course.mo_ta || "Mô tả khóa học sẽ xuất hiện ở đây. Hãy viết ngắn gọn kết quả học viên đạt được."}</p>
                {course.phan_hoi_mau.trim() && <blockquote className="teacher-preview-feedback">{course.phan_hoi_mau}</blockquote>}
                <div className="teacher-preview-instructor">
                  <span aria-hidden="true">{getInitials(displayName)}</span>
                  <div><small>GIẢNG VIÊN</small><strong>{displayName}</strong></div>
                </div>
                <section className="teacher-preview-outcomes">
                  <h3>Bạn sẽ luyện được gì</h3>
                  <ul>{(course.ket_qua.filter((item) => item.trim()).length ? course.ket_qua.filter((item) => item.trim()) : getCourseOutcomes({ tieu_de: course.tieu_de, chu_de: course.chu_de, cap_do: course.cap_do })).map((item) => <li key={item}>{item}</li>)}</ul>
                </section>
                <section className="teacher-preview-curriculum">
                  <h3>Cấu trúc khóa học</h3>
                  {course.chuong.length ? course.chuong.map((chapter) => <div key={chapter.localId}><strong>{chapter.thu_tu}. {chapter.tieu_de || "Chương chưa đặt tên"}</strong><span>{chapter.bai_hoc.length} bài học</span><ul>{chapter.bai_hoc.map((lesson) => <li key={lesson.localId}>{lesson.tieu_de || "Bài học chưa đặt tên"}</li>)}</ul></div>) : <p>Chưa có chương. Thêm nội dung hoặc chọn một mẫu để bắt đầu.</p>}
                </section>
              </article>
              <aside className="teacher-preview-aside">
                <div className="teacher-preview-note">Đây là bản xem trước nội bộ. Khóa học chỉ xuất hiện công khai sau khi bạn gửi duyệt và được quản trị viên publish.</div>
                <dl>
                  <div><dt>Trạng thái</dt><dd>{getCourseStatusLabel(course.trang_thai)}</dd></div>
                  <div><dt>Hoàn thiện</dt><dd>{checklist.filter((item) => item.complete).length}/{checklist.length} mục</dd></div>
                  <div><dt>Ngày khai giảng</dt><dd>{course.ngay_khai_giang || "Chưa đặt"}</dd></div>
                </dl>
                <div className="teacher-preview-checklist">
                  {checklist.map((item) => <p key={item.label} className={item.complete ? "complete" : ""}><span>{item.complete ? "✓" : "○"}</span>{item.label}</p>)}
                </div>
              </aside>
            </div>
          )}
          {hasUnsavedChanges && <p className="teacher-unsaved-indicator" role="status">Có thay đổi chưa được lưu.</p>}
        </div>
      </main>
      {confirmation && <Dialog confirmation={confirmation} close={() => setConfirmation(null)} />}
    </div>
  );
}
