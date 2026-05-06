import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'staff' | 'guardian';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">로딩 중...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/login" replace />;
  }

  // T-056: 미승인 staff 는 시설 데이터 페이지 진입 차단 — 백엔드도 verify_facility_access
  // 가 막지만 UX 상 진입 자체를 막아 빈 화면·403 노출 방지. 시설장(is_admin)/운영자는 자동 통과.
  if (
    requiredRole === 'staff'
    && user.role === 'staff'
    && user.is_staff_approved === false
    && !user.is_admin
    && !user.is_operator
  ) {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
