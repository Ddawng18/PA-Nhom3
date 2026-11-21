export const catalogPageSize = 12;

export const catalogLevels = [
  { value: "CO_BAN", label: "Cơ bản" },
  { value: "TRUNG_CAP", label: "Trung cấp" },
  { value: "NANG_CAO", label: "Nâng cao" },
] as const;

export const catalogSorts = [
  { value: "moi_nhat", label: "Mới nhất" },
  { value: "pho_bien", label: "Phổ biến nhất" },
  { value: "ten", label: "Tên A–Z" },
] as const;

export type CatalogSort = (typeof catalogSorts)[number]["value"];

export type CatalogQuery = {
  page: number;
  search: string;
  topics: string[];
  levels: string[];
  sort: CatalogSort;
};

const levelValues: readonly string[] = catalogLevels.map((item) => item.value);
const sortValues: readonly string[] = catalogSorts.map((item) => item.value);
const maxSearchLength = 100;

function uniqueList(values: string[], limit: number): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].slice(0, limit);
}

export function parseCatalogQuery(search: string): CatalogQuery {
  const params = new URLSearchParams(search);
  const pageValue = params.get("page") ?? "";
  const requestedPage = /^\d+$/.test(pageValue) ? Number(pageValue) : Number.NaN;
  const sort = params.get("sap_xep") ?? "";
  return {
    page: Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    search: (params.get("search") ?? "").trim().slice(0, maxSearchLength),
    topics: uniqueList((params.get("chu_de") ?? "").split("|"), 20),
    levels: uniqueList((params.get("cap_do") ?? "").split(","), 3).filter((value) => levelValues.includes(value)),
    sort: sortValues.includes(sort) ? (sort as CatalogSort) : "moi_nhat",
  };
}

export function buildCatalogQuery(query: CatalogQuery): string {
  const params = new URLSearchParams();
  if (Number.isSafeInteger(query.page) && query.page > 1) params.set("page", String(query.page));
  const search = query.search.trim().slice(0, maxSearchLength);
  if (search) params.set("search", search);
  const topics = uniqueList(query.topics, 20);
  if (topics.length > 0) params.set("chu_de", topics.join("|"));
  const levels = uniqueList(query.levels, 3).filter((value) => levelValues.includes(value));
  if (levels.length > 0) params.set("cap_do", levels.join(","));
  if (query.sort !== "moi_nhat" && sortValues.includes(query.sort)) params.set("sap_xep", query.sort);
  return params.toString();
}

export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

export function hasActiveFilters(query: CatalogQuery): boolean {
  return query.topics.length > 0 || query.levels.length > 0 || query.search.length > 0;
}

export function formatVnd(value: number): string {
  return `₫${new Intl.NumberFormat("vi-VN").format(value)}`;
}

export function formatPriceLabel(value: number | null): string | null {
  if (value === null) return null;
  return value > 0 ? formatVnd(value) : "Miễn phí";
}

export function formatLessonCount(count: number): string {
  return `${count} bài học`;
}

export function formatStudentCount(count: number): string | null {
  return count > 0 ? `${new Intl.NumberFormat("vi-VN").format(count)} học viên` : null;
}

export function formatStartDate(value: string | null | undefined): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

export function getInitials(value: string | null | undefined): string {
  const words = (value ?? "").trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const letters = words.length === 1 ? words[0].slice(0, 2) : `${words[0][0]}${words[words.length - 1][0]}`;
  return letters.toUpperCase();
}
