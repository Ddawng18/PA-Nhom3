import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useUserRole } from "../hooks/useUserRole";

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
        <Link className="button button-outline" to="/dashboard">Về tổng quan</Link>
      </div>
    );
  }

  if (roleState.role !== "admin") {
    return <Navigate to="/dashboard" replace state={{ from: "/admin/teachers" }} />;
  }

  if (!user) return null;
  return children;
}
