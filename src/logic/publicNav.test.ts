import { describe, expect, it } from "vitest";
import { isNavItemActive, publicNavItems } from "./publicNav";

describe("public navigation", () => {
  it("defines the public navigation routes in order", () => {
    expect(publicNavItems.map((item) => item.label)).toEqual(["Tổng quan", "Khóa học", "Học phí", "Studio", "Cộng đồng"]);
    expect(publicNavItems.map((item) => ("to" in item ? item.to : undefined))).toEqual([
      "/",
      "/courses",
      "/pricing",
      "/studio",
      "/community",
    ]);
  });

  it("marks the overview and course paths active only for their routes", () => {
    const [overview, courses, pricing, studio, community] = publicNavItems;
    expect(isNavItemActive("/", overview)).toBe(true);
    expect(isNavItemActive("/login", overview)).toBe(false);
    expect(isNavItemActive("/", courses)).toBe(false);
    expect(isNavItemActive("/", studio)).toBe(false);
    expect(isNavItemActive("/".repeat(2), overview)).toBe(true);
    expect(isNavItemActive("/courses", courses)).toBe(true);
    expect(isNavItemActive("/courses/", courses)).toBe(true);
    expect(isNavItemActive("/courses/12", courses)).toBe(true);
    expect(isNavItemActive("/coursesx", courses)).toBe(false);
    expect(isNavItemActive("/courses", overview)).toBe(false);
    expect(isNavItemActive("/pricing", pricing)).toBe(true);
    expect(isNavItemActive("/pricing/", pricing)).toBe(true);
    expect(isNavItemActive("/studio", studio)).toBe(true);
    expect(isNavItemActive("/community", community)).toBe(true);
  });
});
