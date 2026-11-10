import { describe, expect, it } from "vitest";
import { currentEnrollmentStatus } from "../data/dashboardStatuses";
import {
  formatCourseMeta,
  formatLessonLabel,
  formatLessonProgress,
  getCurrentLessonNumber,
  getGreeting,
  getPercent,
  pickCurrentEnrollment,
} from "./dashboard";

describe("dashboard formatting and calculations", () => {
  it("returns greetings for the local time of day", () => {
    expect(getGreeting(new Date(2026, 0, 1, 6, 0))).toBe("Chào buổi sáng");
    expect(getGreeting(new Date(2026, 0, 1, 11, 30))).toBe("Chào buổi trưa");
    expect(getGreeting(new Date(2026, 0, 1, 14, 0))).toBe("Chào buổi chiều");
    expect(getGreeting(new Date(2026, 0, 1, 19, 30))).toBe("Chào buổi tối");
    expect(getGreeting(new Date(2026, 0, 1, 2, 0))).toBe("Chào buổi tối");
  });

  it("clamps and rounds course percentages", () => {
    expect(getPercent(2, 24)).toBe(8);
    expect(getPercent(12, 24)).toBe(50);
    expect(getPercent(0, 0)).toBe(0);
    expect(getPercent(30, 24)).toBe(100);
    expect(getPercent(-1, 24)).toBe(0);
  });

  it("returns the current lesson number or null for empty courses", () => {
    expect(getCurrentLessonNumber(2, 24)).toBe(3);
    expect(getCurrentLessonNumber(24, 24)).toBe(24);
    expect(getCurrentLessonNumber(0, 0)).toBeNull();
  });

  it("formats lesson labels and progress", () => {
    expect(formatLessonLabel(3)).toBe("Bài 03");
    expect(formatLessonLabel(12)).toBe("Bài 12");
    expect(formatLessonProgress(2, 24)).toBe("2/24 bài · 8%");
  });

  it("formats course metadata with and without a teacher", () => {
    expect(formatCourseMeta("Minh Anh", 24)).toBe("Minh Anh · 24 bài học");
    expect(formatCourseMeta(null, 24)).toBe("24 bài học");
  });

  it("selects the most recent current enrollment", () => {
    const items = [
      { ma_khoa_hoc: 1, trang_thai: currentEnrollmentStatus, ngay_ghi_danh: "2026-01-01T10:00:00Z" },
      { ma_khoa_hoc: 2, trang_thai: "DA_HUY", ngay_ghi_danh: "2026-01-03T10:00:00Z" },
      { ma_khoa_hoc: 3, trang_thai: currentEnrollmentStatus, ngay_ghi_danh: "2026-01-02T10:00:00Z" },
    ];

    expect(pickCurrentEnrollment(items)?.ma_khoa_hoc).toBe(3);
    expect(pickCurrentEnrollment([])).toBeNull();
  });
});
