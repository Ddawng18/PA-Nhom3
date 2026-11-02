import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { signInWithEmail, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function getReturnTo() {
    const state = location.state;
    if (typeof state === "object" && state !== null && "from" in state) {
      const from = state.from;
      if (typeof from === "string" && from.startsWith("/") && !from.startsWith("//")) {
        return from;
      }
    }
    return "/";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    const formData = new FormData(event.currentTarget);
    const values = {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };
    const parsed = loginSchema.safeParse(values);
    const errors: FieldErrors = {};
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if ((field === "email" || field === "password") && !errors[field]) {
          errors[field] = issue.message;
        }
      }
    }
    setFieldErrors(errors);
    setMessage(null);
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      const result = await signInWithEmail({
        email: values.email.trim(),
        password: values.password,
      });
      if (result.error) {
        setMessage(result.error);
      } else {
        navigate(getReturnTo(), { replace: true });
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle();
      if (result.error) setMessage(result.error);
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="register-panel login-panel" aria-labelledby="login-title">
      <Link className="back-link" to="/">
        <ArrowLeft aria-hidden="true" size={15} />
        Quay lại trang chủ
      </Link>

      <div className="form-heading">
        <p className="eyebrow">TRỞ LẠI VỚI LINEA</p>
        <h1 id="login-title">Đăng nhập vào tài khoản</h1>
        <p className="form-description">
          Tiếp tục hành trình học tập của bạn. Đăng nhập để mở khóa bài học mới và theo dõi tiến độ.
        </p>
      </div>

      <form className="register-form" noValidate onSubmit={handleSubmit}>
        <div className="form-field">
          <label htmlFor="login-email">Địa chỉ email *</label>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : "login-email-hint"}
          />
          {fieldErrors.email ? (
            <p className="field-error" id="login-email-error">{fieldErrors.email}</p>
          ) : (
            <p className="field-hint" id="login-email-hint">Vui lòng nhập đúng email đã đăng ký.</p>
          )}
        </div>

        <div className="form-field password-field">
          <label htmlFor="login-password">Mật khẩu *</label>
          <div className="password-input-wrap">
            <input
              id="login-password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : "login-password-hint"}
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
            <p className="field-error" id="login-password-error">{fieldErrors.password}</p>
          ) : (
            <p className="field-hint" id="login-password-hint">
              Ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
            </p>
          )}
        </div>

        {message && <p className="form-message form-message-error" role="alert">{message}</p>}
        <button className="submit-button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <p className="next-step">Bước tiếp theo: quay lại ghi danh khóa học đã chọn.</p>

        <Link className="forgot-password-link" to="/forgot-password">Quên mật khẩu?</Link>

        <div className="form-divider" aria-label="hoặc">
          <span>hoặc</span>
        </div>

        <p className="new-account-label">Chưa có tài khoản?</p>
        <Link className="google-button create-account-button" to="/register">
          Tạo tài khoản mới
        </Link>
      </form>

      <div className="login-google-action">
        <button className="google-button" type="button" disabled={isSubmitting} onClick={handleGoogleSignIn}>
          <span className="google-mark" aria-hidden="true">G</span>
          Tiếp tục với Google
        </button>
      </div>
    </section>
  );
}
