import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserRole } from "../hooks/useUserRole";
import { getTeacherRouteDecision } from "../logic/teacherCourse";

export default function TeacherRoleGuard({ children }: { children: ReactNode }) {
  const roleState = useUserRole();
  const decision = getTeacherRouteDecision(roleState);

  if (decision === "loading") {
    return <p className="auth-loading" role="status">Đang kiểm tra vai trò tài khoản...</p>;
  }
  if (decision === "error") {
    return <p className="auth-loading" role="alert">{roleState.error}</p>;
  }
  if (decision === "redirect") {
    return <Navigate to="/my-courses" replace />;
  }
  return children;
}
