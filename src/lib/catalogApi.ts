import { z } from "zod";
import { requestAdminApi } from "./adminApi";
import { buildCatalogQuery, catalogPageSize, type CatalogQuery } from "../logic/catalog";

const id = z.number().int().safe().positive();

export const catalogCourseSchema = z.object({
  ma_khoa_hoc: id,
  tieu_de: z.string(),
  mo_ta: z.string(),
  cap_do: z.string(),
  chu_de: z.string(),
  anh_dai_dien: z.string().nullable(),
  ma_giao_vien: z.string(),
  ten_giao_vien: z.string().nullable(),
  gia_vnd: z.number().int().nonnegative().nullable(),
  so_chuong: z.number().int().nonnegative(),
  so_bai_hoc: z.number().int().nonnegative(),
  so_hoc_vien: z.number().int().nonnegative(),
  thoi_luong: z.string().nullable().optional(),
  ngay_khai_giang: z.string().nullable().optional(),
  ngay_tao: z.string(),
  ket_qua: z.array(z.string()).optional(),
  phan_hoi_mau: z.string().nullable().optional(),
  kieu_bia: z.string().optional(),
});

const catalogListSchema = z.object({
  items: z.array(catalogCourseSchema),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalCount: z.number().int().nonnegative(),
  chu_de: z.array(z.object({ chu_de: z.string(), so_khoa_hoc: z.number().int().nonnegative() })),
});

const catalogDetailSchema = z.object({
  khoa_hoc: catalogCourseSchema,
  chuong: z.array(z.object({
    ma_chuong: id,
    tieu_de: z.string(),
    thu_tu: z.number(),
    bai_hoc: z.array(z.object({
      ma_bai_hoc: id,
      tieu_de: z.string(),
      thu_tu: z.number(),
      bat_buoc: z.boolean(),
    })),
  })),
  khoa_hoc_cung_chu_de: z.array(catalogCourseSchema),
});

export type CatalogCourse = z.infer<typeof catalogCourseSchema>;
export type CatalogList = z.infer<typeof catalogListSchema>;
export type CatalogDetail = z.infer<typeof catalogDetailSchema>;

export async function listCatalogCourses(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogList> {
  const payload = await requestAdminApi("/api/catalog/courses", { signal }, {
    page: query.page,
    pageSize: catalogPageSize,
    search: query.search || undefined,
    chu_de: query.topics.length > 0 ? query.topics.join("|") : undefined,
    cap_do: query.levels.length > 0 ? query.levels.join(",") : undefined,
    sap_xep: query.sort,
  });
  return catalogListSchema.parse(payload);
}

export async function getCatalogCourse(courseId: string, signal?: AbortSignal): Promise<CatalogDetail> {
  return catalogDetailSchema.parse(
    await requestAdminApi(`/api/catalog/courses/${encodeURIComponent(courseId)}`, { signal }),
  );
}

export function catalogQueryPath(query: CatalogQuery): string {
  const queryString = buildCatalogQuery(query);
  return queryString ? `/courses?${queryString}` : "/courses";
}
