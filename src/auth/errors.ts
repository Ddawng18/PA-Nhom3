export function getAuthErrorMessage(message?: string, code?: string): string {
  const normalizedMessage = message?.toLowerCase() ?? "";

  if (code === "weak_password") {
    return "Mật khẩu chưa đáp ứng yêu cầu bảo mật. Hãy chọn mật khẩu dài hơn và khó đoán hơn.";
  }
  if (code === "email_address_invalid") {
    return "Địa chỉ email không hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (code === "email_address_not_authorized") {
    return "Hệ thống gửi thư chưa cho phép gửi đến địa chỉ này. Vui lòng liên hệ hỗ trợ.";
  }
  if (
    normalizedMessage.includes("error sending confirmation email") ||
    normalizedMessage.includes("error sending recovery email") ||
    normalizedMessage.includes("error sending password recovery email")
  ) {
    return "Hệ thống chưa gửi được email. Vui lòng thử lại sau.";
  }

  if (
    normalizedMessage.includes("provider is not enabled") ||
    normalizedMessage.includes("unsupported provider")
  ) {
    return "Đăng nhập Google chưa được bật trong Supabase. Vui lòng bật provider Google.";
  }
  if (normalizedMessage.includes("access_denied") || normalizedMessage.includes("access denied")) {
    return "Bạn đã hủy đăng nhập Google.";
  }
  if (
    normalizedMessage.includes("redirect") &&
    (normalizedMessage.includes("url") || normalizedMessage.includes("uri"))
  ) {
    return "URL chuyển hướng chưa được cấu hình trong Supabase.";
  }
  if (normalizedMessage.includes("invalid api key") || normalizedMessage.includes("no api key")) {
    return "Cấu hình Supabase không hợp lệ. Vui lòng kiểm tra VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY.";
  }
  if (
    normalizedMessage.includes("invalid login credentials") ||
    normalizedMessage.includes("invalid email or password")
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (normalizedMessage.includes("email not confirmed")) {
    return "Email chưa được xác nhận. Hãy kiểm tra hộp thư.";
  }
  if (
    normalizedMessage.includes("user already registered") ||
    normalizedMessage.includes("email already exists")
  ) {
    return "Email này đã được đăng ký.";
  }
  if (
    code === "over_email_send_rate_limit" ||
    code === "over_request_rate_limit" ||
    normalizedMessage.includes("too many requests") ||
    normalizedMessage.includes("rate limit") ||
    normalizedMessage.includes("security purposes")
  ) {
    return "Bạn đã gửi quá nhiều yêu cầu. Vui lòng thử lại sau.";
  }
  if (
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("network request failed") ||
    normalizedMessage.includes("network error") ||
    normalizedMessage.includes("networkerror") ||
    normalizedMessage.includes("load failed")
  ) {
    return "Không thể kết nối mạng. Vui lòng kiểm tra kết nối và thử lại.";
  }

  const reference = code && /^[a-z0-9_]{1,60}$/.test(code) ? ` (mã ${code})` : "";
  return `Đã có lỗi xảy ra${reference}. Vui lòng thử lại sau.`;
}
