import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import GuestHomePage from "../pages/GuestHomePage";
import { dashboardByRole, getHomeRouteDecision } from "../logic/homeRoute";
import { useUserRole } from "../hooks/useUserRole";

export default function HomeRoute() {
  const { session, loading } = useAuth();
  const { role, loading: roleLoading, error } = useUserRole();
  const decision = getHomeRouteDecision({ loading, hasUser: session !== null });

  if (decision === "loading" || (decision === "dashboard" && roleLoading)) {
    return <p className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</p>;
  }
  if (decision === "dashboard") {
    return role
      ? <Navigate to={dashboardByRole[role]} replace />
      : <p className="auth-loading" role="alert">{error ?? "Không xác định được vai trò tài khoản."}</p>;
  }
  return <GuestHomePage />;
}
