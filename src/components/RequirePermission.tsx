/**
 * T-150: 권한 게이트 컴포넌트.
 *
 * 사용 예: 라우트 element 를 감싸거나 메뉴 아이템 conditional 렌더에 사용.
 *
 *   <RequirePermission permissionKey="facility:stats:view">
 *     <FacilityStatsPage />
 *   </RequirePermission>
 *
 * 로딩 중에는 spinner, 권한 없으면 fallback (기본 /dashboard 리다이렉트).
 */
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useFacilityPermission } from '../hooks/useFacilityPermission';

interface RequirePermissionProps {
  permissionKey: string;
  children: React.ReactNode;
  /** 권한 없을 때 보여줄 노드. 미지정 시 /dashboard 로 redirect. */
  fallback?: React.ReactNode;
}

const RequirePermission: React.FC<RequirePermissionProps> = ({
  permissionKey,
  children,
  fallback,
}) => {
  const { has, isLoading } = useFacilityPermission();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    );
  }

  if (!has(permissionKey)) {
    if (fallback !== undefined) return <>{fallback}</>;
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

export default RequirePermission;
