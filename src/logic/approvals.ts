export function buildApiUrl(
  baseUrl: string,
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const normalizedBase = baseUrl.trim();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  const base = normalizedBase.endsWith("/") ? normalizedBase.slice(0, -1) : normalizedBase;
  const url = new URL(normalizedPath, `${base}/`);

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  if (query) url.search = query;

  return url.toString();
}

export function mapApiError(status?: number, code?: string): string {
  const normalizedStatus = status ?? 0;

  switch (normalizedStatus) {
    case 400:
      return code ? `Yêu cầu không hợp lệ (${code}).` : "Yêu cầu không hợp lệ.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Tài nguyên không tồn tại.";
    case 409:
      return "Dữ liệu đã tồn tại hoặc đang được xử lý.";
    case 422:
      return "Dữ liệu gửi lên không hợp lệ.";
    case 429:
      return "Quá nhiều yêu cầu. Vui lòng thử lại sau.";
    case 500:
    case 502:
    case 503:
    case 504:
      return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau.";
    default:
      return code ? `Không thể xử lý yêu cầu (${code}).` : "Không thể xử lý yêu cầu.";
  }
}
