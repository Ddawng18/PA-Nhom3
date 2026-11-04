import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import { newPasswordSchema } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";

export default function ResetPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const { updatePassword, configured } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const password = String(new FormData(event.currentTarget).get("password") ?? "");
    const parsed = newPasswordSchema.safeParse({ password });
    setPasswordError(parsed.success ? null : parsed.error.issues[0]?.message ?? null);
    setMessage(null);
    if (!parsed.success) return;

    setIsSubmitting(true);
    try {
      const result = await updatePassword(password);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "info", text: "Mật khẩu đã được cập nhật." });
        window.setTimeout(() => navigate("/", { replace: true }), 1200);
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: getAuthErrorMessage(error instanceof Error ? error.message : undefined),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout authLink={{ to: "/register", label: "Đăng Ký" }}>
      <section className="register-panel" aria-labelledby="reset-title">
        <div className="form-heading">
          <p className="eyebrow">KHÔI PHỤC TÀI KHOẢN</p>
          <h1 id="reset-title">Tạo mật khẩu mới</h1>
          <p className="form-description">Mật khẩu cần có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.</p>
        </div>
        <form className="register-form" noValidate onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="new-password">Mật khẩu mới *</label>
            <input
              id="new-password"
              name="password"
              type="password"
              autoComplete="new-password"
              aria-invalid={Boolean(passwordError)}
              aria-describedby={passwordError ? "new-password-error" : undefined}
            />
            {passwordError && <p className="field-error" id="new-password-error">{passwordError}</p>}
          </div>
          {!configured && (
            <p className="form-message form-message-error" role="alert">
              Ứng dụng chưa được cấu hình Supabase. Vui lòng thử lại sau.
            </p>
          )}
          {message && (
            <p className={`form-message form-message-${message.type}`} role={message.type === "error" ? "alert" : "status"}>
              {message.text}
            </p>
          )}
          <button className="submit-button" type="submit" disabled={isSubmitting || !configured}>
            {isSubmitting ? "Đang xử lý..." : "Cập nhật mật khẩu"}
          </button>
        </form>
      </section>
    </AuthLayout>
  );
}
