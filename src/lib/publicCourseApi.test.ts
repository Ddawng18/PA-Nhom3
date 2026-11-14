import { afterEach, describe, expect, it, vi } from "vitest";
import { requestAdminApi } from "./adminApi";
import { listPublishedCourses } from "./publicCourseApi";

vi.mock("./adminApi", () => ({
  requestAdminApi: vi.fn(),
}));

afterEach(() => vi.clearAllMocks());

function course(id: number, status: string) {
  return {
    ma_khoa_hoc: id,
    ma_giao_vien: "teacher-id",
    tieu_de: `Khóa học ${id}`,
    mo_ta: "Mô tả khóa học",
    cap_do: "CO_BAN",
    chu_de: "Vẽ cơ bản",
    anh_dai_dien: null,
    trang_thai: status,
    ngay_tao: "2026-11-12T00:00:00Z",
  };
}

describe("published course API", () => {
  it("requests courses without authorization and filters unpublished rows", async () => {
    vi.mocked(requestAdminApi).mockResolvedValue({
      items: [course(1, "DA_DANG"), course(2, "NHAP"), course(3, "DA_DANG")],
      page: 2,
      pageSize: 12,
      totalCount: 20,
    });
    const signal = new AbortController().signal;

    await expect(listPublishedCourses({ page: 2, pageSize: 12, search: "vẽ", signal }))
      .resolves.toMatchObject({
        items: [{ ma_khoa_hoc: 1 }, { ma_khoa_hoc: 3 }],
        page: 2,
        pageSize: 12,
        totalCount: 20,
      });
    expect(requestAdminApi).toHaveBeenCalledWith(
      "/api/courses",
      { signal },
      { page: 2, pageSize: 12, search: "vẽ" }
    );
  });

  it("rejects malformed course list responses", async () => {
    vi.mocked(requestAdminApi).mockResolvedValue({
      items: [],
      page: "1",
      pageSize: 12,
      totalCount: 0,
    });
    await expect(listPublishedCourses({ page: 1, pageSize: 12, search: "" })).rejects.toThrow();
  });
});
