import { describe, expect, it } from "vitest";
import type { NotificationItem } from "./notifications";
import {
  buildBannerStats,
  countUnread,
  filterForRole,
  formatRelativeTime,
  getAllowedTypes,
  getNotificationTitle,
  getSafeInternalLink,
} from "./notifications";
import { getInitials, getUserChip } from "../lib/userDisplay";

function createItem(type: string, read = false): NotificationItem {
  return {
    ma_thong_bao: type,
    loai_thong_bao: type,
    noi_dung: `Nội dung ${type}`,
    duong_dan_lien_ket: null,
    da_doc: read,
    ngay_tao: "2026-10-20T12:00:00.000Z",
  };
}

describe("notification role filtering", () => {
  it("returns the permitted types for each role", () => {
    expect(getAllowedTypes("student")).toEqual(["bai_hoc", "quang_cao", "loi_nhan", "he_thong"]);
    expect(getAllowedTypes("teacher")).toEqual(["bai_hoc", "he_thong", "loi_nhan"]);
    expect(getAllowedTypes("admin")).toEqual(["duyet_ho_so", "he_thong"]);
    expect(getAllowedTypes("teacher")).not.toContain("quang_cao");
    expect(getAllowedTypes("teacher")).not.toContain("duyet_ho_so");
  });

  it("excludes unknown and disallowed types for all roles", () => {
    const items = [
      createItem("bai_hoc"),
      createItem("quang_cao"),
      createItem("loi_nhan"),
      createItem("he_thong"),
      createItem("duyet_ho_so"),
      createItem("loai_la"),
    ];

    expect(filterForRole("student", items).map((item) => item.loai_thong_bao))
      .toEqual(["bai_hoc", "quang_cao", "loi_nhan", "he_thong"]);
    expect(filterForRole("teacher", items).map((item) => item.loai_thong_bao))
      .toEqual(["bai_hoc", "loi_nhan", "he_thong"]);
    expect(filterForRole("admin", items).map((item) => item.loai_thong_bao))
      .toEqual(["he_thong", "duyet_ho_so"]);
  });
});

describe("notification banner statistics", () => {
  it("calculates unread count, total, and fill percentage", () => {
    const items = Array.from({ length: 12 }, (_, index) => createItem(`type-${index}`, index >= 3));
    expect(countUnread(items)).toBe(3);
    expect(buildBannerStats(items)).toEqual({ unread: 3, total: 12, fillPercent: 25 });
  });

  it("returns zero fill for an empty list", () => {
    expect(buildBannerStats([])).toEqual({ unread: 0, total: 0, fillPercent: 0 });
  });
});

describe("notification titles and time", () => {
  it("uses the role-specific message title", () => {
    expect(getNotificationTitle("loi_nhan", "student")).toBe("Lời nhắn từ giảng viên");
    expect(getNotificationTitle("loi_nhan", "teacher")).toBe("Lời nhắn từ học viên");
  });

  it("formats recent and calendar-relative timestamps", () => {
    const now = new Date(2026, 9, 20, 12, 0, 0);
    expect(formatRelativeTime(now, new Date(2026, 9, 20, 11, 59, 30))).toBe("Vừa xong");
    expect(formatRelativeTime(now, new Date(2026, 9, 20, 11, 50, 0))).toBe("10 phút trước");
    expect(formatRelativeTime(now, new Date(2026, 9, 20, 8, 0, 0))).toBe("Hôm nay");
    expect(formatRelativeTime(now, new Date(2026, 9, 19, 8, 0, 0))).toBe("Hôm qua");
    expect(formatRelativeTime(now, new Date(2026, 9, 18, 8, 0, 0))).toBe("18/10");
    expect(formatRelativeTime(now, new Date(2025, 9, 18, 8, 0, 0))).toBe("18/10/2025");
  });
});

describe("safe notification links", () => {
  it("allows only internal absolute paths", () => {
    expect(getSafeInternalLink("/my-courses")).toBe("/my-courses");
    for (const value of ["//evil.com", "https://evil.com", "javascript:alert(1)", "\\evil", ""]) {
      expect(getSafeInternalLink(value)).toBeNull();
    }
    expect(getSafeInternalLink(null)).toBeNull();
  });
});

describe("user display chip", () => {
  const user = (email: string | undefined, user_metadata: Record<string, unknown> = {}) => ({
    email,
    user_metadata,
  });

  it("prefers the profile name and includes the profile avatar", () => {
    expect(getUserChip(user("profile@example.com"), {
      display_name: "Linh Nguyễn",
      avatar_url: "https://example.com/avatar.png",
    })).toEqual({
      name: "Linh Nguyễn",
      email: "profile@example.com",
      initials: "LN",
      avatarUrl: "https://example.com/avatar.png",
    });
  });

  it("falls back to the email name and supports one-word and two-word initials", () => {
    expect(getUserChip(user("learner@example.com")).name).toBe("learner");
    expect(getInitials("Linh")).toBe("L");
    expect(getInitials("Linh Nguyễn")).toBe("LN");
  });

  it("uses metadata for the display name and avatar when profile fields are absent", () => {
    expect(getUserChip(user("student@example.com", {
      display_name: "Mai Anh",
      avatar_url: "https://example.com/metadata.png",
    }))).toMatchObject({
      name: "Mai Anh",
      initials: "MA",
      avatarUrl: "https://example.com/metadata.png",
    });
  });
});
