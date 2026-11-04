import { Navigate, useLocation } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import LoginForm from "../components/LoginForm";
import { useAuth } from "../auth/useAuth";
import "../styles/login.css";

export default function LoginPage() {
  const { session, loading } = useAuth();
  const location = useLocation();

  if (loading) return <p className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</p>;
  if (session) {
    const state = location.state;
    const from =
      typeof state === "object" &&
      state !== null &&
      "from" in state &&
      typeof state.from === "string" &&
      state.from.startsWith("/") &&
      !state.from.startsWith("//")
        ? state.from
        : "/settings";
    return <Navigate to={from} replace />;
  }

  return (
    <AuthLayout authLink={{ to: "/register", label: "Đăng Ký" }}>
      <LoginForm />
    </AuthLayout>
  );
}
