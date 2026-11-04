import { Navigate } from "react-router-dom";
import AuthLayout from "../components/AuthLayout";
import RegisterForm from "../components/RegisterForm";
import { useAuth } from "../auth/useAuth";
import "../styles/register.css";

export default function RegisterPage() {
  const { session, loading } = useAuth();

  if (loading) return <p className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</p>;
  if (session) return <Navigate to="/" replace />;

  return (
    <AuthLayout authLink={{ to: "/login", label: "Đăng nhập" }}>
      <RegisterForm />
    </AuthLayout>
  );
}
