import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../hooks/useUserRole";
import { dashboardByRole } from "../logic/homeRoute";

export default function StudentRoleGuard({ children }: { children: ReactNode }) {
  const { role, loading, error } = useUserRole();

  if (loading) return <p className="auth-loading" role="status">Đang kiểm tra vai trò tài khoản...</p>;
  if (error || !role) {
    return <p className="auth-loading" role="alert">{error ?? "Không xác định được vai trò tài khoản."}</p>;
  }
  if (role !== "student") return <Navigate to={dashboardByRole[role]} replace />;
  return children;
}
