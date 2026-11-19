import { Navigate } from "react-router-dom";

// Both entry points use the same authenticated backend workflow.
export default function AdminTeacherApprovalPage() {
  return <Navigate to="/admin/manage?tab=review&muc=giao-vien" replace />;
}
