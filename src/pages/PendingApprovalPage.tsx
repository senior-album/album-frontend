import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { Clock, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/**
 * T-056: register_staff 직후 또는 승인 전 staff 가 보는 랜딩 페이지.
 *
 * 백엔드는 verify_facility_access 가 미승인 staff 의 시설 데이터 호출을 차단.
 * 프론트는 추가 UX 로 미승인 상태의 직원을 이 페이지로 강제 redirect.
 *
 * 승인 받은 후엔 user.is_staff_approved=true 가 되어 자동으로 /dashboard 로 이동.
 */
const PendingApprovalPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // 비인증은 로그인으로
  if (!user) return <Navigate to="/login" replace />;
  // 이미 승인됐거나 시설장/운영자면 본 페이지에 머물 이유 없음 — 대시보드로
  if (user.is_admin || user.is_operator || user.is_staff_approved) {
    return <Navigate to="/dashboard" replace />;
  }
  // guardian 은 본 페이지 대상 아님
  if (user.role === 'guardian') return <Navigate to="/guardian" replace />;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-soft border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Clock className="text-amber-600" size={32} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">승인 대기 중</h1>
        <p className="text-gray-600 leading-relaxed">
          가입 신청이 접수되었습니다.<br />
          시설 관리자가 확인 후 승인하면 사용을 시작할 수 있습니다.
        </p>
        <div className="text-sm text-gray-500 mt-6 bg-gray-50 rounded-lg p-4">
          <div className="flex justify-between">
            <span>이름</span>
            <span className="font-medium text-gray-900">{user.name}</span>
          </div>
          <div className="flex justify-between mt-1">
            <span>이메일</span>
            <span className="font-medium text-gray-900">{user.email}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition"
        >
          <LogOut size={16} />
          <span>로그아웃</span>
        </button>
      </div>
    </div>
  );
};

export default PendingApprovalPage;
