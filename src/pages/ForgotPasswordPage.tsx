import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { emailSchemaForReset } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const { resetPassword, configured } = useAuth();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    const parsed = emailSchemaForReset.safeParse({ email });
    setEmailError(parsed.success ? null : parsed.error.issues[0]?.message ?? null);
    setMessage(null);
    if (!parsed.success) return;

    setIsSubmitting(true);
    try {
      const result = await resetPassword(email);
      if (result.error) {
        setMessage(result.error);
      } else {
        setMessage("Nếu email tồn tại, liên kết đặt lại đã được gửi.");
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout authLink={{ to: "/register", label: "Đăng Ký" }}>
      <section className="register-panel" aria-labelledby="forgot-title">
        <Link className="back-link" to="/login">
          <ArrowLeft aria-hidden="true" size={15} />
          Quay lại đăng nhập
        </Link>
        <div className="form-heading">
          <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
          <h1 id="forgot-title">Đặt lại mật khẩu</h1>
          <p className="form-description">Nhập email của bạn để nhận liên kết đặt lại mật khẩu.</p>
        </div>
        <form className="register-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="reset-email">Địa chỉ email *</label>
            <input
              id="reset-email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(emailError)}
              aria-describedby={emailError ? "reset-email-error" : undefined}
            />
            {emailError && <p className="field-error" id="reset-email-error">{emailError}</p>}
          </div>
          {!configured && (
            <p className="form-message form-message-error" role="alert">
              Ứng dụng chưa được cấu hình Supabase. Vui lòng thử lại sau.
            </p>
          )}
          {message && (
            <p className={`form-message ${configured ? "form-message-info" : "form-message-error"}`} role="status">
              {message}
            </p>
          )}
          <button className="submit-button" type="submit" disabled={isSubmitting || !configured}>
            {isSubmitting ? "Đang xử lý..." : "Gửi liên kết đặt lại"}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
}
