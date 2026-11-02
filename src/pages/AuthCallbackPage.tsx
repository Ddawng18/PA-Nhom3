import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

export default function AuthCallbackPage() {
  const { session, loading } = useAuth();
  if (loading) return <p className="auth-loading" role="status">Đang hoàn tất đăng nhập...</p>;
  return <Navigate to={session ? "/" : "/login"} replace />;
}
