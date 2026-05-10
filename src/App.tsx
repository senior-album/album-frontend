import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './pages/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import ResidentsPage from './pages/ResidentsPage';
import PhotosPage from './pages/PhotosPage';
import GuardianManagePage from './pages/GuardianManagePage';
import GuardianGalleryPage from './pages/GuardianGalleryPage';
import RegisterPage from './pages/RegisterPage';
import KakaoCallbackPage from './pages/KakaoCallbackPage';
import SelectRolePage from './pages/SelectRolePage';
import SharedPhotoPage from './pages/SharedPhotoPage';
import GuardianMyPage from './pages/GuardianMyPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import AdminLegalSettingsPage from './pages/AdminLegalSettingsPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminFacilitiesPage from './pages/AdminFacilitiesPage';
import AdminGuardiansPage from './pages/AdminGuardiansPage';
import AdminPhotoJobsPage from './pages/AdminPhotoJobsPage';
import AdminStatsPage from './pages/AdminStatsPage';
import StaffWellnessLogsPage from './pages/StaffWellnessLogsPage';
import GuardianWellnessLogsPage from './pages/GuardianWellnessLogsPage';
import StaffEventsCalendarPage from './pages/StaffEventsCalendarPage';
import GuardianEventsCalendarPage from './pages/GuardianEventsCalendarPage';
import FacilityPermissionsPage from './pages/FacilityPermissionsPage';
import FacilityStatsTrendsPage from './pages/FacilityStatsTrendsPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import StaffApprovalsPage from './pages/StaffApprovalsPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
          <Route path="/select-role" element={<SelectRolePage />} />
          <Route path="/shared/:shareToken" element={<SharedPhotoPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />

          {/* Operator-only routes — 각 페이지 안에서 user.is_operator 검사 후 redirect */}
          <Route path="/admin/legal-settings" element={<AdminLegalSettingsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/facilities" element={<AdminFacilitiesPage />} />
          <Route path="/admin/guardians" element={<AdminGuardiansPage />} />
          <Route path="/admin/photo-jobs" element={<AdminPhotoJobsPage />} />
          <Route path="/admin/stats" element={<AdminStatsPage />} />

          {/* Staff Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="staff">
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/residents"
            element={
              <ProtectedRoute requiredRole="staff">
                <ResidentsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/photos"
            element={
              <ProtectedRoute requiredRole="staff">
                <PhotosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian-manage"
            element={
              <ProtectedRoute requiredRole="staff">
                <GuardianManagePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/residents/:residentId/wellness-logs"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffWellnessLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/permissions"
            element={
              <ProtectedRoute requiredRole="staff">
                <FacilityPermissionsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/stats"
            element={
              <ProtectedRoute requiredRole="staff">
                <FacilityStatsTrendsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/staff-approvals"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffApprovalsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/facility/events"
            element={
              <ProtectedRoute requiredRole="staff">
                <StaffEventsCalendarPage />
              </ProtectedRoute>
            }
          />
          {/* T-056: 미승인 staff 가 강제 redirect 되는 랜딩 — 자체 가드 (ProtectedRoute 안 씀) */}
          <Route path="/pending-approval" element={<PendingApprovalPage />} />

          {/* Guardian Routes */}
          <Route
            path="/guardian"
            element={
              <ProtectedRoute requiredRole="guardian">
                <GuardianGalleryPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian/mypage"
            element={
              <ProtectedRoute requiredRole="guardian">
                <GuardianMyPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian/residents/:residentId/wellness-logs"
            element={
              <ProtectedRoute requiredRole="guardian">
                <GuardianWellnessLogsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/guardian/events"
            element={
              <ProtectedRoute requiredRole="guardian">
                <GuardianEventsCalendarPage />
              </ProtectedRoute>
            }
          />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
