import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";

type FieldErrors = Partial<Record<"displayName" | "email" | "password" | "confirmPassword", string>>;

function getFieldErrors(values: unknown): FieldErrors {
  const result = registerSchema.safeParse(values);
  if (result.success) return {};

  return result.error.issues.reduce<FieldErrors>((errors, issue) => {
    const field = issue.path[0];
    if (
      (field === "displayName" || field === "email" || field === "password" || field === "confirmPassword") &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
    return errors;
  }, {});
}

export default function RegisterForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmationVisible, setIsConfirmationVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "info"; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmationEmail, setConfirmationEmail] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signUpWithEmail, signInWithGoogle, resendConfirmation, configured } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    const values = {
      displayName: String(formData.get("display-name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      confirmPassword: String(formData.get("confirm-password") ?? ""),
    };
    const errors = getFieldErrors(values);
    setFieldErrors(errors);
    setMessage(null);
    setConfirmationEmail(null);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else if (result.needsEmailConfirmation) {
        setConfirmationEmail(values.email.trim());
        setMessage({
          type: "info",
          text: "Nếu tài khoản cần xác nhận, hãy kiểm tra hộp thư và mục thư rác. Nếu chưa nhận được, bạn có thể yêu cầu gửi lại.",
        });
      } else {
        navigate("/settings", { replace: true });
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

  async function handleResend() {
    if (!confirmationEmail || isResending) return;
    setIsResending(true);
    try {
      const result = await resendConfirmation(confirmationEmail);
      setMessage(result.error
        ? { type: "error", text: result.error }
        : { type: "info", text: "Nếu tài khoản cần xác nhận, hãy kiểm tra hộp thư và mục thư rác sau ít phút." });
    } catch (error) {
      setMessage({ type: "error", text: getAuthErrorMessage(error instanceof Error ? error.message : undefined) });
    } finally {
      setIsResending(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) setMessage({ type: "error", text: result.error });
    } catch (error) {
      setMessage({ type: "error", text: getAuthErrorMessage(error instanceof Error ? error.message : undefined) });
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <section className="register-panel" aria-labelledby="register-title">
      <Link className="back-link" to="/login">
        <ArrowLeft aria-hidden="true" size={15} />
        Quay lại đăng nhập
      </Link>

      <div className="form-heading">
        <p className="eyebrow">BẮT ĐẦU CÙNG LINEA</p>
        <h1 id="register-title">Tạo tài khoản của bạn</h1>
        <p className="form-description">
          Lưu bài học, theo dõi tiến độ và xây dựng thói quen vẽ mỗi ngày.
        </p>
      </div>

      <form className="register-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="display-name">Tên hiển thị *</label>
          <input
            id="display-name"
            name="display-name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? "display-name-error" : undefined}
          />
          {fieldErrors.displayName && (
            <p className="field-error" id="display-name-error">{fieldErrors.displayName}</p>
          )}
        </div>

        <div className="form-field">
          <label htmlFor="email">Địa chỉ email *</label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
          />
          {fieldErrors.email && (
            <p className="field-error" id="register-email-error">{fieldErrors.email}</p>
          )}
        </div>

        <div className="form-field password-field">
          <label htmlFor="password">Mật khẩu *</label>
          <div className="password-input-wrap">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "register-password-error" : "password-hint"}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={isPasswordVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={isPasswordVisible}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
            >
              {isPasswordVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
          {fieldErrors.password ? (
            <p className="field-error" id="register-password-error">{fieldErrors.password}</p>
          ) : (
            <p className="field-hint" id="password-hint">
              Mật khẩu cần có ít nhất 8 ký tự.
            </p>
          )}
        </div>

        <div className="form-field password-field">
          <label htmlFor="confirm-password">Xác nhận mật khẩu *</label>
          <div className="password-input-wrap">
            <input
              id="confirm-password"
              name="confirm-password"
              type={isConfirmationVisible ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.confirmPassword)}
              aria-describedby={fieldErrors.confirmPassword ? "confirm-password-error" : undefined}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={isConfirmationVisible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={isConfirmationVisible}
              onClick={() => setIsConfirmationVisible((visible) => !visible)}
            >
              {isConfirmationVisible ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
          {fieldErrors.confirmPassword && (
            <p className="field-error" id="confirm-password-error">{fieldErrors.confirmPassword}</p>
          )}
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
        {confirmationEmail && (
          <button className="button button-outline" type="button" disabled={isResending} onClick={handleResend}>
            {isResending ? "Đang xử lý..." : "Gửi lại email xác nhận"}
          </button>
        )}
        <button className="submit-button" type="submit" disabled={isSubmitting || !configured}>
          {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản & tiếp tục"}
        </button>
        <p className="next-step">Bước tiếp theo: quay lại ghi danh khóa học đã chọn.</p>

        <div className="form-divider" aria-label="hoặc">
          <span>hoặc</span>
        </div>

        <button className="google-button" type="button" disabled={isGoogleSubmitting || !configured} onClick={handleGoogleSignIn}>
          <span className="google-mark" aria-hidden="true">G</span>
          {isGoogleSubmitting ? "Đang chuyển hướng..." : "Tiếp tục với Google"}
        </button>
      </form>

      <p className="existing-account">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </section>
  );
}
