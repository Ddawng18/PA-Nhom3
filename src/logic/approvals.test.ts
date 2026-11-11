import { describe, expect, it } from "vitest";
import {
  buildApiUrl,
  countPending,
  formatDateVi,
  getSettingsTabs,
  mapApiError,
  mapTeacherStatus,
  parseSettingsView,
  validateRejectCode,
  validateRejectReason,
} from "./approvals";
import { teacherProfileListSchema } from "../lib/adminApi";

describe("approval settings tabs", () => {
  it.each(["student", "teacher", undefined, null])("returns four tabs for %s", (role) => {
    expect(getSettingsTabs(role)).toEqual(["ho-so", "ua-thich", "bao-mat", "lich-su-mua-hang"]);
  });

  it("adds the approval tab for admins", () => {
    expect(getSettingsTabs("admin")).toEqual([
      "ho-so", "ua-thich", "bao-mat", "lich-su-mua-hang", "phe-duyet",
    ]);
  });

  it("parses allowed settings URL state", () => {
    expect(parseSettingsView("?tab=phe-duyet&muc=giao-vien", "admin"))
      .toEqual({ tab: "phe-duyet", muc: "giao-vien" });
    expect(parseSettingsView("?tab=phe-duyet&muc=giao-vien", "student"))
      .toEqual({ tab: "ho-so", muc: "khoa-hoc" });
    expect(parseSettingsView("?tab=abc", "admin").tab).toBe("ho-so");
    expect(parseSettingsView("", "admin").tab).toBe("ho-so");
    expect(parseSettingsView("?tab=phe-duyet&muc=xyz", "admin").muc).toBe("khoa-hoc");
  });
});

describe("approval rejection validation", () => {
  it("trims and validates rejection reasons", () => {
    expect(validateRejectReason("")).toBe("Vui lòng nhập lý do từ chối.");
    expect(validateRejectReason("   ")).toBe("Vui lòng nhập lý do từ chối.");
    expect(validateRejectReason("123456789")).toBe("Lý do phải từ 10 đến 500 ký tự.");
    expect(validateRejectReason("1234567890")).toBeNull();
    expect(validateRejectReason("x".repeat(500))).toBeNull();
    expect(validateRejectReason("x".repeat(501))).toBe("Lý do phải từ 10 đến 500 ký tự.");
    expect(validateRejectReason("  1234567890  ")).toBeNull();
  });

  it("validates rejection codes", () => {
    expect(validateRejectCode("OTHER")).toBeNull();
    expect(validateRejectCode("BAD")).toBe("Vui lòng chọn lý do từ chối.");
    expect(validateRejectCode("")).toBe("Vui lòng chọn lý do từ chối.");
  });
});

describe("approval formatting and counts", () => {
  it("builds secure API URLs with encoded, non-empty parameters", () => {
    const url = buildApiUrl("https://linea-api.example.com/", "/api/admin/teacher-profiles", {
      status: "CHO_DUYET",
      q: "  ",
      page: 2,
    });
    expect(url).toBe("https://linea-api.example.com/api/admin/teacher-profiles?status=CHO_DUYET&page=2");
    expect(() => buildApiUrl("http://evil.example.com", "/api")).toThrow();
    expect(buildApiUrl("http://localhost:5000", "/api")).toBe("http://localhost:5000/api");
  });

  it("maps API errors", () => {
    expect(mapApiError(409, "INVALID_STATUS_TRANSITION")).toBe(
      "Mục này đã được xử lý trước đó. Danh sách đã được làm mới."
    );
    expect(mapApiError(403, "OTHER")).toBe("Bạn không có quyền thực hiện thao tác này.");
    expect(mapApiError(401, "OTHER")).toBe("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    expect(mapApiError(404, "NOT_FOUND")).toBe("Không tìm thấy hồ sơ.");
    expect(mapApiError(500)).toBe("Chưa thể xử lý. Vui lòng thử lại.");
    expect(mapApiError(0)).toBe("Chưa thể xử lý. Vui lòng thử lại.");
  });

  it("maps teacher statuses and pending counts", () => {
    expect(mapTeacherStatus("CHO_DUYET").label).toBe("Đang chờ duyệt");
    expect(mapTeacherStatus("CAN_BO_SUNG").label).toBe("Cần bổ sung");
    expect(mapTeacherStatus("DA_DUYET").label).toBe("Đã duyệt");
    expect(mapTeacherStatus("TU_CHOI").label).toBe("Bị từ chối");
    expect(mapTeacherStatus("ABC").label).toBe("ABC");
    expect(countPending(
      [{ status: "CHO_DUYET" }, { status: "CHO_DUYET" }, { status: "CAN_BO_SUNG" }, { status: "DA_DUYET" }],
      [{ trang_thai: "CHO_DUYET" }, { trang_thai: "CHO_DUYET" }, { trang_thai: "CHO_DUYET" }, { trang_thai: "DA_DANG" }]
    )).toEqual({ teachers: 2, courses: 3, total: 5 });
    expect(countPending([], [])).toEqual({ teachers: 0, courses: 0, total: 0 });
  });

  it("formats dates in local Vietnamese format and handles invalid values", () => {
    expect(formatDateVi("2026-11-08T10:00:00Z")).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
    expect(formatDateVi("abc")).toBe("-");
  });
});

describe("teacher profile list schema", () => {
  const payload = {
    items: [{
      id: 1,
      userId: "user-1",
      displayName: "Linh",
      email: "linh@example.com",
      introduction: "Giới thiệu",
      experience: "Kinh nghiệm",
      status: "CHO_DUYET",
      supplementReason: null,
      submittedAt: "2026-11-08T10:00:00Z",
      reviewedAt: null,
      resubmissionCount: 0,
    }],
    page: 1,
    pageSize: 20,
    total: 1,
  };

  it("accepts valid list payloads and rejects missing or invalid fields", () => {
    expect(teacherProfileListSchema.safeParse(payload).success).toBe(true);
    expect(teacherProfileListSchema.safeParse({ ...payload, items: undefined }).success).toBe(false);
    expect(teacherProfileListSchema.safeParse({
      ...payload,
      items: [{ ...payload.items[0], status: 2 }],
    }).success).toBe(false);
    expect(teacherProfileListSchema.safeParse({
      ...payload,
      items: [{ ...payload.items[0], id: "1" }],
    }).success).toBe(false);
  });
});
