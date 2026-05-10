import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, Home, Users, Image, Shield, Menu, X, KeyRound, BarChart3, UserCheck, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFacilityPermission } from '../hooks/useFacilityPermission';
import { PERMISSION_KEYS } from '../types';
import { useState } from 'react';

interface LayoutProps {
  children: React.ReactNode;
  isSidebarHidden?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, isSidebarHidden = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { has: hasPermission } = useFacilityPermission();
  // T-140: 모바일에서는 off-canvas 드로어, md+ 에서는 항상 표시. drawerOpen 은 모바일 전용.
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/dashboard', icon: Home, label: '대시보드' },
    { path: '/residents', icon: Users, label: '입소자 관리' },
    { path: '/photos', icon: Image, label: '사진 관리' },
    { path: '/guardian-manage', icon: Shield, label: '보호자 관리' },
    // T-243: 이벤트 캘린더 — 모든 직원 노출 (별도 권한 게이트 없음, MVP).
    { path: '/facility/events', icon: Calendar, label: '이벤트 캘린더' },
    // T-143: 시설장 / 운영자 / 위임 받은 직원
    ...(hasPermission(PERMISSION_KEYS.FACILITY_STATS_VIEW)
      ? [{ path: '/facility/stats', icon: BarChart3, label: '시설 통계' }]
      : []),
    // T-056: 시설장 또는 facility:staff:approve 위임받은 직원
    ...(hasPermission(PERMISSION_KEYS.FACILITY_STAFF_APPROVE)
      ? [{ path: '/facility/staff-approvals', icon: UserCheck, label: '직원 승인' }]
      : []),
    // T-150: 시설장만 — 직원 메뉴 권한 위임
    ...(user?.is_admin
      ? [{ path: '/facility/permissions', icon: KeyRound, label: '메뉴 권한 위임' }]
      : []),
  ];

  if (isSidebarHidden) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white border-b border-gray-200 shadow-soft">
          <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4 flex justify-between items-center gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-base sm:text-lg">SA</span>
              </div>
              <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">Senior Album</h1>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 sm:px-4 py-2 text-gray-600 hover:text-red-600 transition flex-shrink-0"
            >
              <LogOut size={18} />
              <span className="hidden sm:inline">로그아웃</span>
            </button>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 md:flex">
      {/* 모바일 드로어 백드롭 */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — 모바일은 fixed off-canvas, md+ 는 relative 항상 표시 */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 w-64 bg-primary text-white shadow-lg
          transform transition-transform duration-300
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
          flex flex-col`}
      >
        <div className="p-6 flex items-center justify-between md:justify-start gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-primary font-bold text-lg">SA</span>
            </div>
            <span className="font-bold text-lg truncate">Senior Album</span>
          </div>
          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="md:hidden p-1 rounded-lg hover:bg-white hover:bg-opacity-10 transition flex-shrink-0"
            aria-label="메뉴 닫기"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path);
                  setDrawerOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive(item.path)
                    ? 'bg-secondary text-white'
                    : 'text-white hover:bg-white hover:bg-opacity-10'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-6 pt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-white hover:bg-white hover:bg-opacity-10 transition"
          >
            <LogOut size={20} />
            <span>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 shadow-soft sticky top-0 z-30">
          <div className="px-3 sm:px-6 py-3 sm:py-4 flex justify-between items-center gap-2">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
              aria-label="메뉴 열기"
            >
              <Menu size={24} />
            </button>
            <div className="hidden md:block flex-1" />
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <div className="text-right min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-500 hidden sm:block truncate">{user?.email}</p>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-primary rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                {user?.name?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-3 sm:p-6">
          <div className="max-w-7xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
