import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './pages/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import ResidentsPage from './pages/ResidentsPage';
import PhotosPage from './pages/PhotosPage';
import GuardianGalleryPage from './pages/GuardianGalleryPage';
import RegisterPage from './pages/RegisterPage';

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

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

          {/* Guardian Routes */}
          <Route
            path="/guardian"
            element={
              <ProtectedRoute requiredRole="guardian">
                <GuardianGalleryPage />
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
