import { describe, expect, it } from "vitest";
import { getTeacherRouteDecision, moveAndResequence, teacherCourseFormSchema } from "./teacherCourse";
import { sampleTeacherCourse } from "../data/teacherCourseOptions";

describe("teacher role route guard", () => {
  it("waits for role resolution and redirects non-teachers", () => {
    expect(getTeacherRouteDecision({ loading: true, role: null, error: null })).toBe("loading");
    expect(getTeacherRouteDecision({ loading: false, role: "student", error: null })).toBe("redirect");
    expect(getTeacherRouteDecision({ loading: false, role: "teacher", error: null })).toBe("allowed");
  });

  it("surfaces role lookup errors without allowing the route", () => {
    expect(getTeacherRouteDecision({ loading: false, role: null, error: "Không thể tải vai trò." })).toBe("error");
  });
});

describe("course item ordering", () => {
  it("moves an item and resequences from one without gaps", () => {
    const result = moveAndResequence(
      [{ name: "Chương một", thu_tu: 1 }, { name: "Chương hai", thu_tu: 2 }],
      1,
      -1
    );
    expect(result).toEqual([
      { name: "Chương hai", thu_tu: 1 },
      { name: "Chương một", thu_tu: 2 },
    ]);
  });
});

describe("teacher course form schema", () => {
  it("accepts valid form data and rejects invalid title, description, and video URL", () => {
    expect(teacherCourseFormSchema.safeParse(sampleTeacherCourse).success).toBe(true);
    expect(teacherCourseFormSchema.safeParse({
      ...sampleTeacherCourse,
      tieu_de: "",
      mo_ta: "x".repeat(2001),
      chuong: [{
        ...sampleTeacherCourse.chuong[0],
        bai_hoc: [{
          ...sampleTeacherCourse.chuong[0].bai_hoc[0],
          lien_ket_video: "not-a-url",
        }],
      }],
    }).success).toBe(false);
  });
});
