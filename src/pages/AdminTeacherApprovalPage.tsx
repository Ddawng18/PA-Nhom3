import { Navigate } from "react-router-dom";

// Both entry points use the same authenticated backend workflow.
export default function AdminTeacherApprovalPage() {
  return <Navigate to="/settings?tab=phe-duyet&muc=giao-vien" replace />;
}
