import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import GuestHomePage from "../pages/GuestHomePage";
import { getHomeRouteDecision } from "../logic/homeRoute";
import { useUserRole } from "../hooks/useUserRole";

export default function HomeRoute() {
  const { session, loading } = useAuth();
  const { role, loading: roleLoading } = useUserRole();
  const decision = getHomeRouteDecision({ loading, hasUser: session !== null });

  if (decision === "loading" || (decision === "dashboard" && roleLoading)) {
    return <p className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</p>;
  }
  if (decision === "dashboard") {
    if (role === "admin") return <Navigate to="/admin/manage" replace />;
    if (role === "teacher") return <Navigate to="/my-courses" replace />;
    return <Navigate to="/dashboard" replace />;
  }
  return <GuestHomePage />;
}
