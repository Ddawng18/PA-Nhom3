import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";
import { registerSchema } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";
import Button from "./ui/Button";
import FormField from "./ui/FormField";

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
  const [message, setMessage] = useState<string | null>(null);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const { signUpWithEmail, signInWithGoogle, resendConfirmation, configured } = useAuth();

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
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await signUpWithEmail({
        displayName: values.displayName.trim(),
        email: values.email.trim(),
        password: values.password,
      });
      if (result.error) setMessage(result.error);
      else setConfirmationEmail(values.email.trim());
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend() {
    if (!confirmationEmail || isResending) return;
    setIsResending(true);
    setMessage(null);
    setResendMessage("");
    try {
      const result = await resendConfirmation(confirmationEmail);
      if (result.error) setMessage(result.error);
      else setResendMessage("Nếu tài khoản đang chờ xác nhận, bạn sẽ nhận được liên kết mới.");
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsResending(false);
    }
  }

  if (confirmationEmail) {
    return <section className="register-panel" aria-labelledby="register-title">
      <div className="form-heading">
        <h1 id="register-title">Kiểm tra email của bạn</h1>
        <p className="form-description">Mở liên kết xác nhận đã gửi tới <strong>{confirmationEmail}</strong> trên cùng trình duyệt để hoàn tất đăng ký. Nếu chưa thấy, hãy kiểm tra thư rác.</p>
      </div>
      {message && <p className="form-message form-message-error" role="alert">{message}</p>}
      {resendMessage && <p className="form-message" role="status">{resendMessage}</p>}
      <Button variant="outline" type="button" disabled={isResending} onClick={() => void handleResend()}>
        {isResending ? "Đang gửi..." : "Gửi lại email xác nhận"}
      </Button>
      <p className="existing-account"><Link to="/login">Quay lại đăng nhập</Link></p>
    </section>;
  }

  async function handleGoogleSignIn() {
    if (isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) setMessage(result.error);
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
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
        <FormField id="display-name" label="Tên hiển thị" required error={fieldErrors.displayName}>
          <input
            id="display-name"
            name="display-name"
            type="text"
            autoComplete="name"
            aria-invalid={Boolean(fieldErrors.displayName)}
            aria-describedby={fieldErrors.displayName ? "display-name-error" : undefined}
          />
        </FormField>

        <FormField id="email" label="Địa chỉ email" required error={fieldErrors.email}>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
          />
        </FormField>

        <FormField id="password" label="Mật khẩu" required className="password-field" hint="Mật khẩu cần từ 8 đến 64 ký tự, gồm ít nhất một chữ cái và một chữ số." error={fieldErrors.password}>
          <div className="password-input-wrap">
            <input
              id="password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "password-error" : "password-hint"}
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
        </FormField>

        <FormField id="confirm-password" label="Xác nhận mật khẩu" required className="password-field" error={fieldErrors.confirmPassword}>
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
        </FormField>

        {!configured && (
          <p className="form-message form-message-error" role="alert">
            Ứng dụng chưa được cấu hình Supabase. Vui lòng thử lại sau.
          </p>
        )}
        {message && <p className="form-message form-message-error" role="alert">{message}</p>}
        <Button className="submit-button" type="submit" disabled={isSubmitting || !configured}>
          {isSubmitting ? "Đang xử lý..." : "Tạo tài khoản & tiếp tục"}
        </Button>
        <p className="next-step">Bạn cần xác nhận email trước khi đăng nhập.</p>

        <div className="form-divider" aria-label="hoặc">
          <span>hoặc</span>
        </div>

        <Button className="google-button" variant="outline" disabled={isGoogleSubmitting || !configured} onClick={handleGoogleSignIn}>
          <span className="google-mark" aria-hidden="true">G</span>
          {isGoogleSubmitting ? "Đang chuyển hướng..." : "Tiếp tục với Google"}
        </Button>
      </form>

      <p className="existing-account">
        Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
      </p>
    </section>
  );
}
