import { describe, expect, it, vi } from "vitest";
import { loadStudentCourses, mapStudentCourses } from "./studentCourses";

describe("student enrolled courses", () => {
  it("normalizes IDs and uses enrollment status rather than course publication status", () => {
    const rows = mapStudentCourses([
      { ma_khoa_hoc: 4, trang_thai: "DANG_HOC" },
      { ma_khoa_hoc: "5", trang_thai: "HOAN_THANH" },
      { ma_khoa_hoc: 6, trang_thai: "DA_HUY" },
    ], [
      { ma_khoa_hoc: "4", tieu_de: "Course A", cap_do: "CO_BAN" },
      { ma_khoa_hoc: 5, tieu_de: "Course B", cap_do: "TRUNG_CAP" },
      { ma_khoa_hoc: 99, tieu_de: "Not enrolled", cap_do: "CO_BAN" },
    ]);
    expect(rows.map(row => [row.id, row.title, row.status])).toEqual([
      ["4", "Course A", "in-progress"], ["5", "Course B", "completed"],
    ]);
  });

  it("preserves an enrollment when its course is hidden by RLS", () => {
    const [row] = mapStudentCourses([{ ma_khoa_hoc: 4, trang_thai: "DANG_HOC" }], []);
    expect(row.id).toBe("4");
    expect(row.available).toBe(false);
  });

  it("rejects malformed API rows instead of showing a false empty state", () => {
    expect(() => mapStudentCourses([{ ma_khoa_hoc: "not-an-id", trang_thai: "DANG_HOC" }], [])).toThrow();
  });

  function clientWith(results: Array<{ data: unknown; error: unknown }>) {
    const chains = results.map(result => {
      const chain = {
        select: vi.fn(), eq: vi.fn(), in: vi.fn(), order: vi.fn(),
        abortSignal: vi.fn().mockResolvedValue(result),
      };
      for (const method of [chain.select, chain.eq, chain.in, chain.order]) method.mockReturnValue(chain);
      return chain;
    });
    const from = vi.fn();
    for (const chain of chains) from.mockReturnValueOnce(chain);
    return { client: { from } as unknown as Parameters<typeof loadStudentCourses>[0], from, chains };
  }

  it("filters by the signed-in user and fetches only their enrolled course IDs", async () => {
    const { client, from, chains } = clientWith([
      { data: [{ ma_khoa_hoc: 4, trang_thai: "DANG_HOC" }], error: null },
      { data: [{ ma_khoa_hoc: 4, tieu_de: "Enrolled", cap_do: "CO_BAN" }], error: null },
    ]);
    const signal = new AbortController().signal;
    expect((await loadStudentCourses(client, "student-id", signal))[0].title).toBe("Enrolled");
    expect(from.mock.calls).toEqual([["ghi_danh"], ["khoa_hoc"]]);
    expect(chains[0].eq).toHaveBeenCalledWith("ma_nguoi_dung", "student-id");
    expect(chains[1].in).toHaveBeenCalledWith("ma_khoa_hoc", ["4"]);
    expect(chains[1].abortSignal).toHaveBeenCalledWith(signal);
  });

  it("avoids querying a catalog when the student has no enrollments", async () => {
    const { client, from } = clientWith([{ data: [], error: null }]);
    expect(await loadStudentCourses(client, "student-id", new AbortController().signal)).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("propagates denied access rather than treating it as no enrollments", async () => {
    const error = { code: "42501", message: "permission denied" };
    const { client } = clientWith([{ data: null, error }]);
    await expect(loadStudentCourses(client, "student-id", new AbortController().signal)).rejects.toEqual(error);
  });
});
