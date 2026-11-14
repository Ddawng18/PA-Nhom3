import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import GuestHomePage from "../pages/GuestHomePage";
import { getHomeRouteDecision } from "../logic/homeRoute";

export default function HomeRoute() {
  const { session, loading } = useAuth();
  const decision = getHomeRouteDecision({ loading, hasUser: session !== null });

  if (decision === "loading") {
    return <p className="auth-loading" role="status">Đang kiểm tra phiên đăng nhập...</p>;
  }
  if (decision === "dashboard") return <Navigate to="/dashboard" replace />;
  return <GuestHomePage />;
}
