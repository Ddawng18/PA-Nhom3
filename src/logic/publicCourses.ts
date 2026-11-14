import type { z } from "zod";
import { courseRowSchema } from "../lib/courseApi";

export type PublicCourse = z.infer<typeof courseRowSchema>;

export type CoursesQuery = {
  page: number;
  search: string;
};

export type PublishedCourseResponse = {
  items: PublicCourse[];
  page: number;
  pageSize: number;
  totalCount: number;
};

const maxSearchLength = 100;

function normalizeSearch(value: string): string {
  return value.trim().slice(0, maxSearchLength);
}

export function parseCoursesQuery(search: string): CoursesQuery {
  const params = new URLSearchParams(search);
  const pageValue = params.get("page") ?? "";
  const requestedPage = /^\d+$/.test(pageValue) ? Number(pageValue) : Number.NaN;
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  return {
    page,
    search: normalizeSearch(params.get("search") ?? ""),
  };
}

export function buildCoursesQuery({ page, search }: CoursesQuery): string {
  const params = new URLSearchParams();
  if (Number.isSafeInteger(page) && page > 1) params.set("page", String(page));
  const normalizedSearch = normalizeSearch(search);
  if (normalizedSearch) params.set("search", normalizedSearch);
  return params.toString();
}

export function getTotalPages(totalCount: number, pageSize: number): number {
  if (!Number.isFinite(totalCount) || totalCount < 0) return 1;
  if (!Number.isFinite(pageSize) || pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalCount / pageSize));
}

export function sanitizeCoverUrl(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? "";
  if (!candidate || candidate.length > 500) return null;
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname ? candidate : null;
  } catch {
    return null;
  }
}

export function keepPublished<T extends { trang_thai: string }>(rows: readonly T[]): T[] {
  return rows.filter((row) => row.trang_thai === "DA_DANG");
}

export function formatCourseCount(count: number): string {
  return `${count} khóa học`;
}
