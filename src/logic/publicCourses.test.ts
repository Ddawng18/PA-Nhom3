import { describe, expect, it } from "vitest";
import {
  buildCoursesQuery,
  formatCourseCount,
  getTotalPages,
  keepPublished,
  parseCoursesQuery,
  sanitizeCoverUrl,
} from "./publicCourses";

describe("public courses query", () => {
  it("parses and normalizes page and search parameters", () => {
    expect(parseCoursesQuery("")).toEqual({ page: 1, search: "" });
    expect(parseCoursesQuery("?page=3&search=++v%E1%BA%BD++")).toEqual({ page: 3, search: "vẽ" });
    expect(parseCoursesQuery("?page=0").page).toBe(1);
    expect(parseCoursesQuery("?page=-2").page).toBe(1);
    expect(parseCoursesQuery("?page=abc").page).toBe(1);
    expect(parseCoursesQuery(`?search=${"x".repeat(150)}`).search).toHaveLength(100);
  });

  it("builds minimal encoded query strings", () => {
    expect(buildCoursesQuery({ page: 1, search: "" })).toBe("");
    const pageAndSearch = new URLSearchParams(buildCoursesQuery({ page: 2, search: "vẽ" }));
    expect(pageAndSearch.get("page")).toBe("2");
    expect(pageAndSearch.get("search")).toBe("vẽ");
    expect(buildCoursesQuery({ page: 1, search: "a b" })).toBe("search=a+b");
  });
});

describe("public course collections", () => {
  it("calculates at least one page and rounds up", () => {
    expect(getTotalPages(0, 12)).toBe(1);
    expect(getTotalPages(12, 12)).toBe(1);
    expect(getTotalPages(13, 12)).toBe(2);
    expect(getTotalPages(25, 12)).toBe(3);
    expect(getTotalPages(-5, 12)).toBe(1);
    expect(getTotalPages(Number.NaN, 12)).toBe(1);
  });

  it("accepts only safe HTTPS cover URLs up to 500 characters", () => {
    expect(sanitizeCoverUrl("https://x.com/a.png")).toBe("https://x.com/a.png");
    for (const value of ["http://x.com/a.png", "javascript:alert(1)", "data:image/png;base64,AAA", "", null]) {
      expect(sanitizeCoverUrl(value)).toBeNull();
    }
    expect(sanitizeCoverUrl(`https://x.com/${"a".repeat(489)}`)).toBeNull();
  });

  it("keeps published rows in their original order", () => {
    const rows = [
      { ma_khoa_hoc: 1, trang_thai: "DA_DANG" },
      { ma_khoa_hoc: 2, trang_thai: "NHAP" },
      { ma_khoa_hoc: 3, trang_thai: "CHO_DUYET" },
      { ma_khoa_hoc: 4, trang_thai: "DA_DANG" },
    ];
    expect(keepPublished(rows)).toEqual([rows[0], rows[3]]);
  });

  it("formats course counts", () => {
    expect(formatCourseCount(0)).toBe("0 khóa học");
    expect(formatCourseCount(12)).toBe("12 khóa học");
  });
});
