import { Link, Navigate } from "react-router-dom";
import { getAuthErrorMessage } from "../auth/errors";
import { useAuth } from "../auth/useAuth";

export default function AuthCallbackPage() {
  const { session, loading } = useAuth();
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const errorDescription =
    searchParams.get("error_description") ??
    hashParams.get("error_description") ??
    searchParams.get("error") ??
    hashParams.get("error");

  if (loading) return <p className="auth-loading" role="status">Đang hoàn tất đăng nhập...</p>;

  if (errorDescription) {
    return (
      <p className="auth-loading" role="alert">
        {getAuthErrorMessage(errorDescription)}{" "}
        <Link to="/login">Quay lại đăng nhập</Link>
      </p>
    );
  }

  return <Navigate to={session ? "/dashboard" : "/login"} replace />;
}
