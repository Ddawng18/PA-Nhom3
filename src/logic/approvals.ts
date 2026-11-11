export const settingsTabIds = ["ho-so", "ua-thich", "bao-mat", "lich-su-mua-hang", "phe-duyet"] as const;
export type SettingsTab = typeof settingsTabIds[number];
export type ApprovalSection = "khoa-hoc" | "giao-vien";
export type RejectionCode =
  | "MISSING_DOCUMENT"
  | "UNCLEAR_PORTFOLIO"
  | "INSUFFICIENT_EXPERIENCE"
  | "INVALID_IDENTITY"
  | "COPYRIGHT_VIOLATION"
  | "DUPLICATE_PROFILE"
  | "OTHER";

export const rejectionCodes: RejectionCode[] = [
  "MISSING_DOCUMENT",
  "UNCLEAR_PORTFOLIO",
  "INSUFFICIENT_EXPERIENCE",
  "INVALID_IDENTITY",
  "COPYRIGHT_VIOLATION",
  "DUPLICATE_PROFILE",
  "OTHER",
];

export const rejectionCodeLabels: Record<RejectionCode, string> = {
  MISSING_DOCUMENT: "Thiếu giấy tờ",
  UNCLEAR_PORTFOLIO: "Tác phẩm không rõ ràng",
  INSUFFICIENT_EXPERIENCE: "Kinh nghiệm chưa đủ",
  INVALID_IDENTITY: "Danh tính không hợp lệ",
  COPYRIGHT_VIOLATION: "Vi phạm bản quyền",
  DUPLICATE_PROFILE: "Hồ sơ trùng lặp",
  OTHER: "Lý do khác",
};

export function getSettingsTabs(role: string | null | undefined): SettingsTab[] {
  return role === "admin"
    ? [...settingsTabIds]
    : ["ho-so", "ua-thich", "bao-mat", "lich-su-mua-hang"];
}

export function parseSettingsView(
  search: string,
  role: string | null | undefined
): { tab: SettingsTab; muc: ApprovalSection } {
  const params = new URLSearchParams(search);
  const requestedTab = params.get("tab");
  const tab = requestedTab === "phe-duyet" && role === "admin"
    ? "phe-duyet"
    : requestedTab && getSettingsTabs(role).includes(requestedTab as SettingsTab)
      ? requestedTab as SettingsTab
      : "ho-so";
  const requestedSection = params.get("muc");
  const muc = tab === "phe-duyet" && requestedSection === "giao-vien" ? "giao-vien" : "khoa-hoc";
  return { tab, muc };
}

export function validateRejectReason(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return "Vui lòng nhập lý do từ chối.";
  if (trimmed.length < 10 || trimmed.length > 500) return "Lý do phải từ 10 đến 500 ký tự.";
  return null;
}

export function validateRejectCode(code: string): string | null {
  return rejectionCodes.includes(code as RejectionCode) ? null : "Vui lòng chọn lý do từ chối.";
}

export function buildApiUrl(
  base: string,
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const baseUrl = new URL(base);
  if (
    baseUrl.protocol !== "https:"
    && !(baseUrl.protocol === "http:" && ["localhost", "127.0.0.1"].includes(baseUrl.hostname))
  ) {
    throw new Error("API URL must use HTTPS");
  }
  const url = new URL(path.startsWith("/") ? path : `/${path}`, baseUrl);
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || String(value).trim() === "") continue;
    url.searchParams.set(key, String(value).trim());
  }
  return url.toString();
}

export function mapApiError(status: number, code?: string): string {
  if (status === 401) return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
  if (status === 403) return "Bạn không có quyền thực hiện thao tác này.";
  if (status === 404 && code === "NOT_FOUND") return "Không tìm thấy hồ sơ.";
  if (status === 409 && code === "INVALID_STATUS_TRANSITION") {
    return "Mục này đã được xử lý trước đó. Danh sách đã được làm mới.";
  }
  if (code === "ACCOUNT_NOT_FOUND") return "Không tìm thấy tài khoản của người nộp hồ sơ.";
  if (code === "VALIDATION_ERROR") return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.";
  return "Chưa thể xử lý. Vui lòng thử lại.";
}

export function mapTeacherStatus(code: string): { label: string; tone: string } {
  const statuses: Record<string, { label: string; tone: string }> = {
    CHO_DUYET: { label: "Đang chờ duyệt", tone: "pending" },
    CAN_BO_SUNG: { label: "Cần bổ sung", tone: "supplement" },
    DA_DUYET: { label: "Đã duyệt", tone: "approved" },
    TU_CHOI: { label: "Bị từ chối", tone: "rejected" },
  };
  return statuses[code] ?? { label: code, tone: "neutral" };
}

export function countPending(
  teacherItems: Array<{ status: string }>,
  courseRows: Array<{ trang_thai: string }>
): { teachers: number; courses: number; total: number } {
  const teachers = teacherItems.filter((item) => item.status === "CHO_DUYET").length;
  const courses = courseRows.filter((item) => item.trang_thai === "CHO_DUYET").length;
  return { teachers, courses, total: teachers + courses };
}

export function formatDateVi(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "-";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}
