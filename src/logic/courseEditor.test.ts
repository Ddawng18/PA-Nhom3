import { describe, expect, it } from "vitest";
import {
  buildReorderPlan,
  buildStorageKey,
  canEditCourse,
  detectFileKind,
  getCourseLevelLabel,
  getCourseStatusLabel,
  getSubmitBlockers,
  reorder,
  validateAssignment,
  validateCourseInfo,
  validateLesson,
  validateRubric,
  validateUpload,
} from "./courseEditor";

const validCourse = {
  tieu_de: "Khóa học vẽ",
  mo_ta: "Mô tả khóa học đủ dài để vượt qua yêu cầu tối thiểu của biểu mẫu.",
  cap_do: "CO_BAN",
  chu_de: "Vẽ cơ bản",
  anh_dai_dien: "",
};

const rubric = (ty_trong: number, ten_tieu_chi = "Tiêu chí tốt", thu_tu = 1) => ({
  ten_tieu_chi,
  ty_trong,
  thu_tu,
});

function makeFile(name: string, type: string, size: number, bytes: number[]) {
  const content = new Uint8Array(bytes);
  return {
    name,
    type,
    size,
    slice: () => new Blob([content]).slice(0, 12),
  } as File;
}

describe("course labels and edit permissions", () => {
  it("maps known codes and preserves unknown codes", () => {
    expect(getCourseLevelLabel("CO_BAN")).toBe("Cơ bản");
    expect(getCourseLevelLabel("TRUNG_CAP")).toBe("Trung cấp");
    expect(getCourseLevelLabel("NANG_CAO")).toBe("Nâng cao");
    expect(getCourseStatusLabel("NHAP")).toBe("Bản nháp");
    expect(getCourseStatusLabel("CHO_DUYET")).toBe("Chờ duyệt");
    expect(getCourseStatusLabel("DA_DANG")).toBe("Đã đăng");
    expect(getCourseStatusLabel("AN")).toBe("Đã ẩn");
    expect(getCourseStatusLabel("DA_GO")).toBe("Đã gỡ");
    expect(getCourseStatusLabel("ODD")).toBe("ODD");
  });

  it("allows edits only for an owner of a draft", () => {
    expect(canEditCourse("NHAP", true)).toBe(true);
    expect(canEditCourse("NHAP", false)).toBe(false);
    expect(canEditCourse("DA_DANG", true)).toBe(false);
  });
});

describe("course validation", () => {
  it("checks title, description, level, topic, trimming, and optional cover", () => {
    const emptyTitle = validateCourseInfo({ ...validCourse, tieu_de: "" });
    expect(emptyTitle.success).toBe(false);
    if (!emptyTitle.success) expect(emptyTitle.error.issues[0].message).toBe("Vui lòng nhập tiêu đề.");
    expect(validateCourseInfo({ ...validCourse, tieu_de: "abcd" }).success).toBe(false);
    expect(validateCourseInfo({ ...validCourse, tieu_de: "abcde" }).success).toBe(true);
    expect(validateCourseInfo({ ...validCourse, tieu_de: "x".repeat(200) }).success).toBe(true);
    expect(validateCourseInfo({ ...validCourse, tieu_de: "x".repeat(201) }).success).toBe(false);
    const longTitle = validateCourseInfo({ ...validCourse, tieu_de: "x".repeat(201) });
    if (!longTitle.success) expect(longTitle.error.issues[0].message).toBe("Tiêu đề không được dài quá 200 ký tự.");
    expect(validateCourseInfo({ ...validCourse, mo_ta: "x".repeat(49) }).success).toBe(false);
    expect(validateCourseInfo({ ...validCourse, mo_ta: "x".repeat(50) }).success).toBe(true);
    expect(validateCourseInfo({ ...validCourse, mo_ta: "x".repeat(5001) }).success).toBe(false);
    expect(validateCourseInfo({ ...validCourse, cap_do: "OTHER" }).success).toBe(false);
    expect(validateCourseInfo({ ...validCourse, chu_de: "x" }).success).toBe(false);
    expect(validateCourseInfo({ ...validCourse, tieu_de: ` ${"x".repeat(5)} ` }).success).toBe(true);
    expect(validateCourseInfo(validCourse).success).toBe(true);
  });
});

describe("lesson and assignment validation", () => {
  it("requires lesson content and restricts video links", () => {
    const baseLesson = { tieu_de: "Bài học", noi_dung_van_ban: "", duong_dan_anh: "", lien_ket_video: "", bat_buoc: true };
    expect(validateLesson(baseLesson).success).toBe(false);
    const emptyLesson = validateLesson(baseLesson);
    if (!emptyLesson.success) expect(emptyLesson.error.issues[0].message).toBe("Bài học cần có nội dung văn bản, ảnh hoặc video.");
    expect(validateLesson({ ...baseLesson, lien_ket_video: "https://youtu.be/abc" }).success).toBe(true);
    expect(validateLesson({ ...baseLesson, lien_ket_video: "https://player.vimeo.com/video/1" }).success).toBe(true);
    for (const lien_ket_video of ["http://youtu.be/abc", "javascript:alert(1)", "data:text/html,x", "https://evil.com/x"]) {
      expect(validateLesson({ ...baseLesson, lien_ket_video }).success).toBe(false);
    }
  });

  it("validates assignment length and deadlines", () => {
    const current = new Date();
    const future = new Date(current.getTime() + 86400000).toISOString();
    const past = new Date(current.getTime() - 86400000).toISOString();
    const shortAssignment = validateAssignment({ de_bai: "123456789", han_nop: null, bat_buoc: true });
    expect(shortAssignment.success).toBe(false);
    if (!shortAssignment.success) expect(shortAssignment.error.issues[0].message).toBe("Vui lòng nhập đề bài.");
    expect(validateAssignment({ de_bai: "1234567890", han_nop: null, bat_buoc: true }).success).toBe(true);
    expect(validateAssignment({ de_bai: "1234567890", han_nop: past, bat_buoc: true }).success).toBe(false);
    expect(validateAssignment({ de_bai: "1234567890", han_nop: future, bat_buoc: true }).success).toBe(true);
    expect(validateAssignment({ de_bai: "1234567890", han_nop: null, bat_buoc: true }).success).toBe(true);
  });
});

describe("rubric validation", () => {
  it("validates empty, weighted, and malformed criteria", () => {
    expect(validateRubric([]).success).toBe(true);
    expect(validateRubric([rubric(40), rubric(30, "Tiêu chí hai", 2), rubric(30, "Tiêu chí ba", 3)]).success).toBe(true);
    const invalid = validateRubric([rubric(40), rubric(30, "Tiêu chí hai", 2), rubric(20, "Tiêu chí ba", 3)]);
    expect(invalid.success).toBe(false);
    if (!invalid.success) expect(invalid.error.issues[0].message).toBe("Tổng tỉ trọng phải bằng 100%.");
    expect(validateRubric([rubric(0)]).success).toBe(false);
    expect(validateRubric([rubric(101)]).success).toBe(false);
    expect(validateRubric([rubric(100, "ab")]).success).toBe(false);
    expect(validateRubric(Array.from({ length: 11 }, (_, index) => rubric(100, `Tiêu chí ${index}`, index + 1))).success).toBe(false);
  });
});

describe("file validation and storage keys", () => {
  it("detects supported file signatures", () => {
    expect(detectFileKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
    expect(detectFileKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("png");
    expect(detectFileKind(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("webp");
    expect(detectFileKind(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe("pdf");
    expect(detectFileKind(new Uint8Array([0x50, 0x4b, 0x03, 0x04]))).toBe("zip");
    expect(detectFileKind(new Uint8Array([1, 2, 3]))).toBe(null);
    expect(detectFileKind(new Uint8Array())).toBe(null);
  });

  it("checks file size, extension, MIME, signatures, and count limits", async () => {
    const jpeg = [0xff, 0xd8, 0xff, 0xe0];
    expect((await validateUpload("cover", makeFile("a.jpg", "image/jpeg", 5 * 1048576, jpeg))).success).toBe(true);
    expect((await validateUpload("cover", makeFile("a.jpg", "image/jpeg", 5 * 1048576 + 1, jpeg))).success).toBe(false);
    expect((await validateUpload("lessonImage", makeFile("a.jpg", "image/jpeg", 10 * 1048576, jpeg))).success).toBe(true);
    expect((await validateUpload("lessonImage", makeFile("a.jpg", "image/jpeg", 10 * 1048576 + 1, jpeg))).success).toBe(false);
    const pdf = [0x25, 0x50, 0x44, 0x46];
    expect((await validateUpload("attachment", makeFile("a.pdf", "application/pdf", 20 * 1048576, pdf))).success).toBe(true);
    expect((await validateUpload("attachment", makeFile("a.pdf", "application/pdf", 20 * 1048576 + 1, pdf))).success).toBe(false);
    expect((await validateUpload("attachment", makeFile("a.png", "image/png", 10, pdf))).success).toBe(false);
    const zip = [0x50, 0x4b, 0x03, 0x04];
    expect((await validateUpload("cover", makeFile("a.zip", "application/zip", 10, zip))).success).toBe(false);
    const sixth = await validateUpload("attachment", makeFile("a.pdf", "application/pdf", 10, pdf), 5);
    expect(sixth.success).toBe(false);
    if (!sixth.success) expect(sixth.message).toBe("Mỗi bài học chỉ có tối đa 5 tệp đính kèm.");
  });

  it("builds separate paths from recognized file kinds", () => {
    expect(buildStorageKey({ kind: "cover", courseId: 1, fileKind: "jpeg", uuid: "uuid" })).toBe("courses/1/cover/uuid.jpg");
    expect(buildStorageKey({ kind: "lesson", courseId: 1, lessonId: 2, fileKind: "png", uuid: "uuid" })).toBe("courses/1/lessons/2/uuid.png");
    expect(buildStorageKey({ kind: "attachment", courseId: 1, lessonId: 2, fileKind: "pdf", uuid: "uuid" })).toBe("courses/1/attachments/2/uuid.pdf");
    expect(buildStorageKey({ kind: "cover", courseId: 1, fileKind: "jpeg" })).not.toBe(buildStorageKey({ kind: "cover", courseId: 2, fileKind: "jpeg" }));
  });
});

describe("submit requirements and ordering", () => {
  it("blocks missing content but does not require a cover", () => {
    expect(getSubmitBlockers([])).toHaveLength(1);
    expect(getSubmitBlockers([{ bai_hoc: [] }])).toHaveLength(1);
    expect(getSubmitBlockers([{ bai_hoc: [{}] }])).toEqual([]);
  });

  it("reorders and resequences while respecting boundaries", () => {
    const items = [{ id: "a", thu_tu: 1 }, { id: "b", thu_tu: 2 }, { id: "c", thu_tu: 3 }];
    expect(reorder(items, 1, -1)).toEqual([{ id: "b", thu_tu: 1 }, { id: "a", thu_tu: 2 }, { id: "c", thu_tu: 3 }]);
    expect(reorder(items, 0, -1)).toEqual(items);
    expect(reorder(items, 2, 1)).toEqual(items);
    expect(reorder(items.filter((item) => item.id !== "b"), 0, 1)).toEqual([{ id: "c", thu_tu: 1 }, { id: "a", thu_tu: 2 }]);
  });

  it("creates collision-free temporary and final order steps", () => {
    const items = [{ id: "a", thu_tu: 1 }, { id: "b", thu_tu: 2 }, { id: "c", thu_tu: 3 }];
    const [temporary, finalOrder] = buildReorderPlan(items);
    expect(temporary).toHaveLength(3);
    expect(finalOrder.map((item) => item.thu_tu)).toEqual([1, 2, 3]);
    expect(new Set(temporary.map((item) => item.thu_tu)).size).toBe(3);
    expect(new Set(finalOrder.map((item) => item.thu_tu)).size).toBe(3);
    expect(temporary.every((item) => item.thu_tu > 3)).toBe(true);
    const positions = new Map(items.map((item) => [item.id, item.thu_tu]));
    for (const step of [...temporary, ...finalOrder]) {
      positions.set(step.id, step.thu_tu);
      expect(new Set(positions.values()).size).toBe(positions.size);
    }
  });
});
