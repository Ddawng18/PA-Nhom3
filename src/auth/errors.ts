export function getAuthErrorMessage(message?: string): string {
  const normalizedMessage = message?.toLowerCase() ?? "";

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

  return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
}
