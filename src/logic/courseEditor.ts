import { z } from "zod";
import { courseLevels, courseStatuses } from "../data/courseEditorOptions";

export type CourseLevel = keyof typeof courseLevels;
export type CourseStatus = keyof typeof courseStatuses;
export type UploadKind = "cover" | "lessonImage" | "attachment";
export type DetectedFileKind = "jpeg" | "png" | "webp" | "pdf" | "zip";

export function getCourseLevelLabel(value: string): string {
  return Object.prototype.hasOwnProperty.call(courseLevels, value)
    ? courseLevels[value as CourseLevel]
    : value;
}

export function getCourseStatusLabel(value: string): string {
  return Object.prototype.hasOwnProperty.call(courseStatuses, value)
    ? courseStatuses[value as CourseStatus]
    : value;
}

export function canEditCourse(status: string, isOwner: boolean): boolean {
  return status === "NHAP" && isOwner;
}

const httpsUrlSchema = z.string().trim().refine((value) => {
  if (!value) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "Chỉ chấp nhận URL https.");

export const courseInfoSchema = z.object({
  tieu_de: z.string().trim()
    .min(1, "Vui lòng nhập tiêu đề.")
    .min(5, "Tiêu đề cần có ít nhất 5 ký tự.")
    .max(200, "Tiêu đề không được dài quá 200 ký tự."),
  mo_ta: z.string().trim()
    .min(50, "Mô tả cần có ít nhất 50 ký tự.")
    .max(5000, "Mô tả không được dài quá 5000 ký tự."),
  cap_do: z.enum(["CO_BAN", "TRUNG_CAP", "NANG_CAO"], {
    error: "Vui lòng chọn cấp độ.",
  }),
  chu_de: z.string().trim()
    .min(2, "Chủ đề cần có ít nhất 2 ký tự.")
    .max(100, "Chủ đề không được dài quá 100 ký tự."),
  anh_dai_dien: httpsUrlSchema.refine(value => value.length <= 500, "URL ảnh không được dài quá 500 ký tự."),
});

export type CourseInfo = z.infer<typeof courseInfoSchema>;

export function validateCourseInfo(value: unknown) {
  return courseInfoSchema.safeParse(value);
}

const videoUrlSchema = z.string().trim().refine((value) => {
  if (!value) return true;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "youtube.com"
      || url.hostname === "www.youtube.com"
      || url.hostname === "youtu.be"
      || url.hostname === "vimeo.com"
      || url.hostname === "player.vimeo.com"
      || url.hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}, "Liên kết video không hợp lệ. Chỉ chấp nhận https.");

export const lessonSchema = z.object({
  tieu_de: z.string().trim()
    .min(1, "Vui lòng nhập tiêu đề.")
    .min(3, "Tiêu đề cần có ít nhất 3 ký tự.")
    .max(200, "Tiêu đề không được dài quá 200 ký tự."),
  noi_dung_van_ban: z.string().max(5000, "Nội dung không được dài quá 5000 ký tự."),
  duong_dan_anh: httpsUrlSchema,
  lien_ket_video: videoUrlSchema,
  bat_buoc: z.boolean().default(true),
}).superRefine((lesson, context) => {
  if (!lesson.noi_dung_van_ban.trim() && !lesson.duong_dan_anh.trim() && !lesson.lien_ket_video.trim()) {
    context.addIssue({
      code: "custom",
      message: "Bài học cần có nội dung văn bản, ảnh hoặc video.",
      path: ["noi_dung_van_ban"],
    });
  }
});

export function validateLesson(value: unknown) {
  return lessonSchema.safeParse(value);
}

export const assignmentSchema = z.object({
  de_bai: z.string().trim().min(10, "Vui lòng nhập đề bài.").max(5000, "Đề bài không được dài quá 5000 ký tự."),
  han_nop: z.string().nullable().refine((value) => {
    if (!value) return true;
    const deadline = new Date(value).getTime();
    return Number.isFinite(deadline) && deadline > Date.now();
  }, "Hạn nộp phải sau thời điểm hiện tại."),
  bat_buoc: z.boolean().default(true),
});

export function validateAssignment(value: unknown) {
  return assignmentSchema.safeParse(value);
}

export const rubricSchema = z.array(z.object({
  ten_tieu_chi: z.string().trim()
    .min(3, "Tên tiêu chí cần có ít nhất 3 ký tự.")
    .max(100, "Tên tiêu chí không được dài quá 100 ký tự."),
  ty_trong: z.number().int().min(1, "Tỉ trọng phải từ 1 đến 100.")
    .max(100, "Tỉ trọng phải từ 1 đến 100."),
  thu_tu: z.number().int().positive(),
})).max(10, "Tối đa 10 tiêu chí.")
  .refine((items) => items.length === 0 || items.reduce((sum, item) => sum + item.ty_trong, 0) === 100, {
    message: "Tổng tỉ trọng phải bằng 100%.",
  });

export function validateRubric(value: unknown) {
  return rubricSchema.safeParse(value);
}

export function resequence<T extends { thu_tu: number }>(items: T[]): T[] {
  return items.map((item, index) => ({ ...item, thu_tu: index + 1 }));
}

export function reorder<T extends { thu_tu: number }>(
  items: T[],
  index: number,
  direction: -1 | 1
): T[] {
  const nextIndex = index + direction;
  if (index < 0 || index >= items.length || nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return resequence(next);
}

export type ReorderOperation<T> = { id: T; thu_tu: number };

export function buildReorderPlan<T>(
  items: Array<{ id: T; thu_tu: number }>,
  offset = 10000
): [ReorderOperation<T>[], ReorderOperation<T>[]] {
  const maxOrder = items.reduce((maximum, item) => Math.max(maximum, item.thu_tu), 0);
  const temporary = items.map((item, index) => ({ id: item.id, thu_tu: maxOrder + offset + index + 1 }));
  const finalOrder = items.map((item, index) => ({ id: item.id, thu_tu: index + 1 }));
  return [temporary, finalOrder];
}

export function detectFileKind(bytes: Uint8Array): DetectedFileKind | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((value, index) => bytes[index] === value)) return "png";
  if (bytes.length >= 12
    && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "webp";
  if (bytes.length >= 4 && String.fromCharCode(...bytes.slice(0, 4)) === "%PDF") return "pdf";
  if (bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04) return "zip";
  return null;
}

export type UploadFile = Pick<File, "name" | "type" | "size" | "slice">;

const allowedFileInfo: Record<DetectedFileKind, { extensions: string[]; mime: string }> = {
  jpeg: { extensions: [".jpg", ".jpeg"], mime: "image/jpeg" },
  png: { extensions: [".png"], mime: "image/png" },
  webp: { extensions: [".webp"], mime: "image/webp" },
  pdf: { extensions: [".pdf"], mime: "application/pdf" },
  zip: { extensions: [".zip"], mime: "application/zip" },
};

export async function validateUpload(
  kind: UploadKind,
  file: UploadFile,
  attachmentCount = 0
): Promise<{ success: true; fileKind: DetectedFileKind } | { success: false; message: string }> {
  const maxBytes = kind === "cover" ? 5 * 1048576 : kind === "lessonImage" ? 10 * 1048576 : 20 * 1048576;
  if (kind === "attachment" && attachmentCount >= 5) {
    return { success: false, message: "Mỗi bài học chỉ có tối đa 5 tệp đính kèm." };
  }
  if (file.size > maxBytes) {
    return {
      success: false,
      message: kind === "cover"
        ? "Ảnh bìa phải là JPG, PNG hoặc WEBP và không quá 5 MB."
        : kind === "lessonImage"
          ? "Ảnh phải là JPG, PNG hoặc WEBP và không quá 10 MB."
          : "Tệp không hợp lệ hoặc vượt 20 MB.",
    };
  }
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const fileKind = detectFileKind(bytes);
  const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
  const acceptedKinds: DetectedFileKind[] = kind === "cover" || kind === "lessonImage"
    ? ["jpeg", "png", "webp"]
    : ["pdf", "jpeg", "png", "webp", "zip"];
  if (!fileKind || !acceptedKinds.includes(fileKind)) {
    return {
      success: false,
      message: kind === "cover"
        ? "Ảnh bìa phải là JPG, PNG hoặc WEBP và không quá 5 MB."
        : kind === "lessonImage"
          ? "Ảnh phải là JPG, PNG hoặc WEBP và không quá 10 MB."
          : "Tệp không hợp lệ hoặc vượt 20 MB.",
    };
  }
  const info = allowedFileInfo[fileKind];
  if (!info.extensions.includes(extension) || file.type !== info.mime) {
    return { success: false, message: kind === "attachment" ? "Tệp không hợp lệ hoặc vượt 20 MB." : kind === "cover" ? "Ảnh bìa phải là JPG, PNG hoặc WEBP và không quá 5 MB." : "Ảnh phải là JPG, PNG hoặc WEBP và không quá 10 MB." };
  }
  return { success: true, fileKind };
}

export function getSubmitBlockers(chapters: Array<{ bai_hoc: unknown[] }>): string[] {
  return chapters.length === 0 || chapters.some((chapter) => chapter.bai_hoc.length === 0)
    ? ["Khóa học cần ít nhất một chương và một bài học trước khi gửi duyệt."]
    : [];
}

export function buildStorageKey(input: {
  kind: "cover" | "lesson" | "attachment";
  courseId: string | number;
  lessonId?: string | number;
  fileKind: DetectedFileKind;
  uuid?: string;
}): string {
  const extension = input.fileKind === "jpeg" ? "jpg" : input.fileKind;
  const uuid = input.uuid ?? crypto.randomUUID();
  if (input.kind === "cover") return `courses/${input.courseId}/cover/${uuid}.${extension}`;
  if (input.lessonId === undefined) throw new Error("Thiếu mã bài học.");
  const folder = input.kind === "lesson" ? "lessons" : "attachments";
  return `courses/${input.courseId}/${folder}/${input.lessonId}/${uuid}.${extension}`;
}
