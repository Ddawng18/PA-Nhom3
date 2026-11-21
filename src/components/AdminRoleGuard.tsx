import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useUserRole } from "../hooks/useUserRole";
import { dashboardByRole } from "../logic/homeRoute";

export default function AdminRoleGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const roleState = useUserRole();

  if (roleState.loading) {
    return <p className="auth-loading" role="status">Đang kiểm tra quyền quản trị...</p>;
  }

  if (roleState.error) {
    return (
      <div className="teacher-access-message">
        <p role="alert">{roleState.error}</p>
        <Link className="button button-outline" to="/">Về tổng quan</Link>
      </div>
    );
  }

  if (roleState.role !== "admin") {
    return <Navigate to={roleState.role ? dashboardByRole[roleState.role] : "/"} replace />;
  }

  if (!user) return null;
  return children;
}
