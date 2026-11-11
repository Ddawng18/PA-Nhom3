import type { ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import { useTeacherApproval } from "../hooks/useTeacherApproval";
import { useUserRole } from "../hooks/useUserRole";
import { getTeacherRouteDecision } from "../logic/teacherCourse";

export default function TeacherRoleGuard({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const roleState = useUserRole();
  const approval = useTeacherApproval(roleState.role === "teacher" ? user?.id ?? null : null);
  const decision = getTeacherRouteDecision(roleState);

  if (decision === "loading") {
    return <p className="auth-loading" role="status">Đang kiểm tra vai trò tài khoản...</p>;
  }
  if (decision === "error") {
    return (
      <div className="teacher-access-message">
        <p role="alert">{roleState.error}</p>
        <Link className="button button-outline" to="/my-courses">Về khóa học của tôi</Link>
      </div>
    );
  }
  if (decision === "redirect") {
    return <Navigate to="/my-courses" replace />;
  }
  if (approval.loading) return <p className="auth-loading" role="status">Đang kiểm tra hồ sơ giáo viên...</p>;
  if (approval.error) {
    return (
      <div className="teacher-access-message">
        <p role="alert">{approval.error}</p>
        <button className="button button-outline" type="button" onClick={approval.retry}>Thử lại</button>
      </div>
    );
  }
  if (approval.status !== "DA_DUYET") {
    return (
      <div className="teacher-access-message">
        <p role="alert">Bạn cần là giáo viên đã được duyệt để tạo khóa học.</p>
        <Link className="button button-outline" to="/my-courses">Về khóa học của tôi</Link>
      </div>
    );
  }
  return children;
}
