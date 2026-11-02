export function getAuthErrorMessage(message?: string): string {
  switch (message?.toLowerCase()) {
    case "invalid login credentials":
      return "Email hoặc mật khẩu không đúng.";
    case "email not confirmed":
      return "Email chưa được xác nhận. Hãy kiểm tra hộp thư.";
    case "user already registered":
      return "Email này đã được đăng ký.";
    default:
      return "Đã có lỗi xảy ra. Vui lòng thử lại sau.";
  }
}
