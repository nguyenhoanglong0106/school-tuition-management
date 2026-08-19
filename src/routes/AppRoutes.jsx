import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, RoleRoute, GuestRoute } from '@/auth/components/AuthGuard';
import { RequirePasswordChange } from '@/auth/components/RequirePasswordChange';
import { Spinner } from '@/components/common/UI';
import { useAuth } from '@/contexts/AuthContext';

import LoginPage from '@/auth/pages/LoginPage';
import ForgotPasswordPage from '@/auth/pages/ForgotPasswordPage';
import ResetPasswordPage from '@/auth/pages/ResetPasswordPage';
import ErrorPage from '@/pages/ErrorPage';

// Admin and Student areas are code-split: a student on a 4G connection never
// downloads the admin console bundle, and vice versa.
const AdminLayout = lazy(() => import('@/admin/layouts/AdminLayout'));
const AdminDashboard = lazy(() => import('@/admin/pages/Dashboard'));
const Students = lazy(() => import('@/admin/pages/Students'));
const StudentDetail = lazy(() => import('@/admin/pages/StudentDetail'));
const Teachers = lazy(() => import('@/admin/pages/Teachers'));
const TeacherDetail = lazy(() => import('@/admin/pages/TeacherDetail'));
const Subjects = lazy(() => import('@/admin/pages/Subjects'));
const Classes = lazy(() => import('@/admin/pages/Classes'));
const ClassDetail = lazy(() => import('@/admin/pages/ClassDetail'));
const Schedules = lazy(() => import('@/admin/pages/Schedules'));
const AdminAttendance = lazy(() => import('@/admin/pages/Attendance'));
const Fees = lazy(() => import('@/admin/pages/Fees'));
const Payments = lazy(() => import('@/admin/pages/Payments'));
const Finance = lazy(() => import('@/admin/pages/Finance'));
const AdminDocuments = lazy(() => import('@/admin/pages/Documents'));
const AdminNotifications = lazy(() => import('@/admin/pages/Notifications'));
const BankAccounts = lazy(() => import('@/admin/pages/BankAccounts'));
const SystemSettings = lazy(() => import('@/admin/pages/Settings'));

const StudentLayout = lazy(() => import('@/student/layouts/StudentLayout'));
const StudentHome = lazy(() => import('@/student/pages/Home'));
const StudentProfile = lazy(() => import('@/student/pages/Profile'));
const StudentClasses = lazy(() => import('@/student/pages/Classes'));
const StudentFees = lazy(() => import('@/student/pages/Fees'));
const StudentPayments = lazy(() => import('@/student/pages/Payments'));
const StudentSchedule = lazy(() => import('@/student/pages/Schedule'));
const StudentAttendance = lazy(() => import('@/student/pages/Attendance'));
const StudentDocuments = lazy(() => import('@/student/pages/Documents'));
const StudentNotifications = lazy(() => import('@/student/pages/Notifications'));
const StudentMore = lazy(() => import('@/student/pages/More'));

function PageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <Spinner size="lg" />
    </div>
  );
}

// Wraps an admin-only page so Teachers hitting the URL directly get a clean 403
// instead of relying purely on RLS returning empty data.
function AdminOnly({ children }) {
  return <RoleRoute allowedRoles={['ADMIN']}>{children}</RoleRoute>;
}

// The financial Dashboard (revenue, profit, overdue totals) is admin-only per
// the permission model — a Teacher who lands on /admin (their post-login
// redirect, same as Admin) must not see it, so route them to a page they
// actually have access to instead.
function DashboardGate() {
  const { isAdmin } = useAuth();
  return isAdmin ? <AdminDashboard /> : <Navigate to="/admin/classes" replace />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* Admin & Teacher area */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN', 'TEACHER']}>
                <RequirePasswordChange>
                  <AdminLayout />
                </RequirePasswordChange>
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardGate />} />
          <Route path="students" element={<Students />} />
          <Route path="students/:id" element={<StudentDetail />} />
          <Route path="teachers" element={<AdminOnly><Teachers /></AdminOnly>} />
          <Route path="teachers/:id" element={<AdminOnly><TeacherDetail /></AdminOnly>} />
          <Route path="subjects" element={<AdminOnly><Subjects /></AdminOnly>} />
          <Route path="classes" element={<Classes />} />
          <Route path="classes/:id" element={<ClassDetail />} />
          <Route path="schedules" element={<Schedules />} />
          <Route path="attendance" element={<AdminAttendance />} />
          <Route path="fees" element={<AdminOnly><Fees /></AdminOnly>} />
          <Route path="payments" element={<AdminOnly><Payments /></AdminOnly>} />
          <Route path="finance" element={<AdminOnly><Finance /></AdminOnly>} />
          <Route path="documents" element={<AdminDocuments />} />
          <Route path="notifications" element={<AdminNotifications />} />
          <Route path="bank-accounts" element={<AdminOnly><BankAccounts /></AdminOnly>} />
          <Route path="settings" element={<AdminOnly><SystemSettings /></AdminOnly>} />
        </Route>

        {/* Student / Parent PWA area */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['STUDENT']}>
                <RequirePasswordChange>
                  <StudentLayout />
                </RequirePasswordChange>
              </RoleRoute>
            </ProtectedRoute>
          }
        >
          <Route index element={<StudentHome />} />
          <Route path="profile" element={<StudentProfile />} />
          <Route path="classes" element={<StudentClasses />} />
          <Route path="fees" element={<StudentFees />} />
          <Route path="payments" element={<StudentPayments />} />
          <Route path="schedule" element={<StudentSchedule />} />
          <Route path="attendance" element={<StudentAttendance />} />
          <Route path="documents" element={<StudentDocuments />} />
          <Route path="notifications" element={<StudentNotifications />} />
          <Route path="more" element={<StudentMore />} />
        </Route>

        <Route path="/403" element={<ErrorPage code={403} />} />
        <Route path="/500" element={<ErrorPage code={500} />} />
        <Route path="*" element={<ErrorPage code={404} />} />
      </Routes>
    </Suspense>
  );
}
