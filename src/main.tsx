import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import TeacherRoleGuard from "./components/TeacherRoleGuard";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import LoginPage from "./pages/LoginPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import SettingsPage from "./pages/SettingsPage";
import TeacherCourseFormPage from "./pages/TeacherCourseFormPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
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
            element={<Navigate to="/settings" replace />}
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
