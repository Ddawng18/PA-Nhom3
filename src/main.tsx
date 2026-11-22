import { lazy, StrictMode, Suspense, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, createRoutesFromElements, Navigate, Route, RouterProvider } from "react-router-dom";
import AuthProvider from "./auth/AuthProvider";
import CookieConsent from "./components/CookieConsent";
import UserRoleProvider from "./auth/UserRoleProvider";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminRoleGuard from "./components/AdminRoleGuard";
import TeacherRoleGuard from "./components/TeacherRoleGuard";
import StudentRoleGuard from "./components/StudentRoleGuard";
import AuthCallbackPage from "./pages/AuthCallbackPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import LoginPage from "./pages/LoginPage";
import MyCoursesPage from "./pages/MyCoursesPage";
import RegisterPage from "./pages/RegisterPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import CourseDetailPage from "./pages/CourseDetailPage";
import HomeRoute from "./components/HomeRoute";
import CoursesPage from "./pages/CoursesPage";

import "./styles/atelier.css";

const AdminTeacherApprovalPage = lazy(() => import("./pages/AdminTeacherApprovalPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const TeacherCourseFormPage = lazy(() => import("./pages/TeacherCourseFormPage"));
const TeacherOnboardingPage = lazy(() => import("./pages/TeacherOnboardingPage"));
const CourseLearningPage = lazy(() => import("./pages/CourseLearningPage"));
const CourseCompletePage = lazy(() => import("./pages/CourseCompletePage"));
const TeacherSubmissionsPage = lazy(() => import("./pages/TeacherSubmissionsPage"));
const StudentLearningOverviewPage = lazy(() => import("./pages/StudentLearningOverviewPage"));
const StudioPage = lazy(() => import("./pages/StudioPage"));
const CommunityPage = lazy(() => import("./pages/CommunityPage"));
const DemoOrdersPage = lazy(() => import("./pages/DemoOrdersPage"));
const ArtworksPage = lazy(() => import("./pages/ArtworksPage"));
const AdminManagementPage = lazy(() => import("./pages/AdminManagementPage"));
const AdminOverviewPage = lazy(() => import("./pages/AdminOverviewPage"));
const AdminAuditPage = lazy(() => import("./pages/AdminAuditPage"));
const AdminCommunityPage = lazy(() => import("./pages/AdminCommunityPage"));
const AdminDemoTeachersPage = lazy(() => import("./pages/AdminDemoTeachersPage"));
const AdminDemoTeacherEditPage = lazy(() => import("./pages/AdminDemoTeacherEditPage"));
const TeacherOverviewPage = lazy(() => import("./pages/TeacherOverviewPage"));
const TeacherSubmissionsQueuePage = lazy(() => import("./pages/TeacherSubmissionsQueuePage"));
const TeacherStudentsPage = lazy(() => import("./pages/TeacherStudentsPage"));
const TeacherProfilePage = lazy(() => import("./pages/TeacherProfilePage"));
const PricingFaqPage = lazy(() => import("./pages/PricingFaqPage"));

function RouteFallback() {
  return <div className="route-fallback" role="status" aria-live="polite">Đang tải trang…</div>;
}

function withFallback(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>;
}

const router = createBrowserRouter(createRoutesFromElements(
  <>
          <Route path="/teacher/onboarding" element={withFallback(<ProtectedRoute><TeacherOnboardingPage /></ProtectedRoute>)} />
          <Route path="/teacher" element={withFallback(<ProtectedRoute><TeacherRoleGuard><TeacherOverviewPage /></TeacherRoleGuard></ProtectedRoute>)} />
          <Route path="/teacher/submissions" element={withFallback(<ProtectedRoute><TeacherRoleGuard><TeacherSubmissionsQueuePage /></TeacherRoleGuard></ProtectedRoute>)} />
          <Route path="/teacher/students" element={withFallback(<ProtectedRoute><TeacherRoleGuard><TeacherStudentsPage /></TeacherRoleGuard></ProtectedRoute>)} />
          <Route path="/admin" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminOverviewPage /></AdminRoleGuard></ProtectedRoute>)} />
          <Route path="/admin/audit" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminAuditPage /></AdminRoleGuard></ProtectedRoute>)} />
          <Route path="/admin/community" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminCommunityPage /></AdminRoleGuard></ProtectedRoute>)} />
          <Route path="/admin/demo-teachers" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminDemoTeachersPage /></AdminRoleGuard></ProtectedRoute>)} />
          <Route path="/admin/demo-teachers/:teacherSlug" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminDemoTeacherEditPage /></AdminRoleGuard></ProtectedRoute>)} />
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
            element={<HomeRoute />}
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <StudentRoleGuard><DashboardPage /></StudentRoleGuard>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/teachers"
            element={withFallback(
              <ProtectedRoute>
                <AdminRoleGuard>
                  <AdminTeacherApprovalPage />
                </AdminRoleGuard>
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/settings"
            element={withFallback(
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/artworks"
            element={withFallback(
              <ProtectedRoute>
                <ArtworksPage />
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/my-courses"
            element={
              <ProtectedRoute>
                <MyCoursesPage />
              </ProtectedRoute>
            }
          />
          <Route path="/teachers/:teacherSlug" element={withFallback(<TeacherProfilePage />)} />
          <Route path="/pricing" element={withFallback(<PricingFaqPage />)} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/orders" element={withFallback(<ProtectedRoute><DemoOrdersPage /></ProtectedRoute>)} />
          <Route path="/admin/manage" element={withFallback(<ProtectedRoute><AdminRoleGuard><AdminManagementPage /></AdminRoleGuard></ProtectedRoute>)} />
          <Route path="/studio" element={withFallback(<StudioPage />)} />
          <Route path="/community" element={withFallback(<CommunityPage />)} />
          <Route path="/community/:postId" element={withFallback(<CommunityPage />)} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route
            path="/courses/:courseId/learn"
            element={withFallback(<ProtectedRoute><CourseLearningPage /></ProtectedRoute>)}
          />
          <Route
            path="/courses/:courseId/learn/:lessonId"
            element={withFallback(<ProtectedRoute><CourseLearningPage /></ProtectedRoute>)}
          />
          <Route
            path="/courses/:courseId/complete"
            element={withFallback(<ProtectedRoute><CourseCompletePage /></ProtectedRoute>)}
          />
          <Route
            path="/notifications"
            element={withFallback(
              <ProtectedRoute>
                <NotificationsPage />
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/teacher/courses/new"
            element={withFallback(
              <ProtectedRoute>
                <TeacherRoleGuard>
                  <TeacherCourseFormPage />
                </TeacherRoleGuard>
              </ProtectedRoute>,
            )}
          />
          <Route
            path="/teacher/courses/:courseId/edit"
            element={withFallback(
              <ProtectedRoute>
                <TeacherRoleGuard>
                  <TeacherCourseFormPage />
                </TeacherRoleGuard>
              </ProtectedRoute>,
            )}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
          <Route path="/progress" element={withFallback(<ProtectedRoute><StudentLearningOverviewPage mode="progress" /></ProtectedRoute>)} />
          <Route path="/assignments" element={withFallback(<ProtectedRoute><StudentLearningOverviewPage mode="assignments" /></ProtectedRoute>)} />
          <Route path="/teacher/courses/:courseId/submissions" element={withFallback(<ProtectedRoute><TeacherRoleGuard><TeacherSubmissionsPage /></TeacherRoleGuard></ProtectedRoute>)} />
  </>
));

function App() {
  return <AuthProvider><UserRoleProvider><RouterProvider router={router} /><CookieConsent /></UserRoleProvider></AuthProvider>;
}

const root = document.getElementById("root");

if (root) {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
}
