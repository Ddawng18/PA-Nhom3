import { describe, expect, it } from "vitest";
import { getTeacherRouteDecision } from "./teacherCourse";

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
