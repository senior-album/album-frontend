import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './pages/ProtectedRoute';

import LoginPage from './pages/LoginPage';
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

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/auth/kakao/callback" element={<KakaoCallbackPage />} />
          <Route path="/select-role" element={<SelectRolePage />} />
          <Route path="/shared/:shareToken" element={<SharedPhotoPage />} />

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

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;
