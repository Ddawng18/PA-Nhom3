import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoleGuard from "./components/AdminRoleGuard";
import TeacherRoleGuard from "./components/TeacherRoleGuard";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import AdminTeacherApprovalPage from "./pages/AdminTeacherApprovalPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import NotificationsPage from "./pages/NotificationsPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import TeacherCourseFormPage from "./pages/TeacherCourseFormPage";
import TeacherOnboardingPage from "./pages/TeacherOnboardingPage";
import CourseLearningPage from "./pages/CourseLearningPage";
import TeacherSubmissionsPage from "./pages/TeacherSubmissionsPage";
import StudentLearningOverviewPage from "./pages/StudentLearningOverviewPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/teacher/onboarding" element={<ProtectedRoute><TeacherOnboardingPage /></ProtectedRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/reset-password"
            element={
              <ProtectedRoute>
                <ResetPasswordPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={
              <ProtectedRoute>
                <AdminRoleGuard>
                  <AdminTeacherApprovalPage />
                </AdminRoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCoursesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/courses/:courseId"
            element={<ProtectedRoute><CourseLearningPage /></ProtectedRoute>}
          />
          <Route
            path="/courses/:courseId/learn/:lessonId"
            element={<ProtectedRoute><CourseLearningPage /></ProtectedRoute>}
          />
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/new"
            element={
              <ProtectedRoute>
                <TeacherRoleGuard>
                  <TeacherCourseFormPage />
                </TeacherRoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher/courses/:courseId/edit"
            element={
              <ProtectedRoute>
                <TeacherRoleGuard>
                  <TeacherCourseFormPage />
                </TeacherRoleGuard>
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/progress" element={<ProtectedRoute><StudentLearningOverviewPage mode="progress" /></ProtectedRoute>} />
          <Route path="/assignments" element={<ProtectedRoute><StudentLearningOverviewPage mode="assignments" /></ProtectedRoute>} />
          <Route path="/teacher/courses/:courseId/submissions" element={<ProtectedRoute><TeacherRoleGuard><TeacherSubmissionsPage /></TeacherRoleGuard></ProtectedRoute>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
