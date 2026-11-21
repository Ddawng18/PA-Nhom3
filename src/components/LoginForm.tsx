import { useEffect, useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginSchema } from "../auth/schemas";
import { getAuthErrorMessage } from "../auth/errors";
import Button from "./ui/Button";
import FormField from "./ui/FormField";
import { useAuth } from "../auth/useAuth";

type FieldErrors = Partial<Record<"email" | "password", string>>;

export default function LoginForm() {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [remember, setRemember] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const { signInWithEmail, signInWithGoogle, configured } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let expired = false;
    try {
      expired = sessionStorage.getItem("linea:session-expired") === "1";
      if (expired) sessionStorage.removeItem("linea:session-expired");
    } catch {
      expired = false;
    }
    if (expired) setMessage("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
  }, []);

  const locationState = location.state;
  const redirectTo =
    typeof locationState === "object" &&
    locationState !== null &&
    "from" in locationState &&
    typeof locationState.from === "string" &&
    locationState.from.startsWith("/") &&
    !locationState.from.startsWith("//")
      ? locationState.from
      : "/";

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
        remember,
      });
      if (result.error) {
        setMessage(result.error);
      } else {
        navigate(redirectTo, { replace: true });
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (isGoogleSubmitting) return;
    setIsGoogleSubmitting(true);
    setMessage(null);
    try {
      const result = await signInWithGoogle(remember);
      if (result.error) {
        setMessage(result.error);
      }
    } catch (error) {
      setMessage(getAuthErrorMessage(error instanceof Error ? error.message : undefined));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <section className="register-panel login-panel" aria-labelledby="login-title">
      <Link className="back-link" to="/">
        <ArrowLeft aria-hidden="true" size={15} />
        Quay lại trang chủ
      </Link>

      <div className="form-heading">
        <h1 id="login-title">Đăng nhập</h1>
        <p className="form-description">
          Dùng tài khoản LINEA để tiếp tục học.
        </p>
      </div>

      <form className="register-form" noValidate onSubmit={handleSubmit}>
        <FormField id="login-email" label="Địa chỉ email" required error={fieldErrors.email}>
          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="email"
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
          />
        </FormField>

        <FormField id="login-password" label="Mật khẩu" required className="password-field" error={fieldErrors.password}>
          <div className="password-input-wrap">
            <input
              id="login-password"
              name="password"
              type={isPasswordVisible ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? "login-password-error" : undefined}
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

        <div className="login-options"><label className="remember-login">
          <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.currentTarget.checked)} />
          <span>Ghi nhớ đăng nhập</span>
        </label><Link className="forgot-password-link" to="/forgot-password">Quên mật khẩu?</Link></div>

        {!configured && (
          <p className="form-message form-message-error" role="alert">
            Ứng dụng chưa được cấu hình Supabase. Vui lòng thử lại sau.
          </p>
        )}
        {message && <p className="form-message form-message-error" role="alert">{message}</p>}
        <Button className="submit-button" type="submit" disabled={isSubmitting || !configured}>
          {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
        </Button>

        <div className="form-divider" aria-label="hoặc">
          <span>hoặc</span>
        </div>

        <Button
          className="google-button"
          variant="outline"
          disabled={isGoogleSubmitting || !configured}
          onClick={handleGoogleSignIn}
        >
          <span className="google-mark" aria-hidden="true">G</span>
          {isGoogleSubmitting ? "Đang chuyển hướng..." : "Tiếp tục với Google"}
        </Button>

        <p className="login-signup">Chưa có tài khoản? <Link to="/register">Tạo tài khoản mới</Link></p>
      </form>
    </section>
  );
}
