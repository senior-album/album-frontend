import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Phone, Mail, Building2, Heart, Shield, Bell, BellOff,
  ChevronLeft, Loader2, Edit3, Check, X, Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';

interface GuardianshipInfo {
  guardian_id: string;
  facility_id: string;
  facility_name: string;
  resident_id: string;
  resident_name: string;
  relationship_type: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  reject_reason: string | null;
}

interface ProfileData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface FacilityGroup {
  facility_id: string;
  facility_name: string;
  residents: {
    id: string;
    name: string;
    code: string;
    room_number: string | null;
    relationship_type: string | null;
    guardian_id: string;
  }[];
}

const GuardianMyPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [guardianships, setGuardianships] = useState<GuardianshipInfo[]>([]);
  const [facilityGroups, setFacilityGroups] = useState<FacilityGroup[]>([]);
  const [notificationEnabled, setNotificationEnabled] = useState(true);
  const [photoCount, setPhotoCount] = useState(0);

  // 프로필 수정
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [profileRes, statusRes, residentsRes, photosRes] = await Promise.all([
        apiClient.getGuardianProfile(),
        apiClient.getGuardianStatus(),
        apiClient.getGuardianResidents().catch(() => ({ data: [] })),
        apiClient.getGuardianPhotos().catch(() => ({ data: [] })),
      ]);

      setProfile(profileRes.data);
      setGuardianships(statusRes.data?.guardianships || []);
      setFacilityGroups(residentsRes.data || []);
      setPhotoCount(Array.isArray(photosRes.data) ? photosRes.data.length : 0);
      setNotificationEnabled(profileRes.data?.notification_enabled ?? true);
      setEditName(profileRes.data?.name || '');
      setEditPhone(profileRes.data?.phone || '');
    } catch (err) {
      console.error('Failed to fetch guardian data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await apiClient.updateGuardianProfile({
        name: editName || undefined,
        phone: editPhone || undefined,
      });
      setProfile((prev) => prev ? { ...prev, name: editName, phone: editPhone } : prev);
      setEditing(false);
    } catch (err) {
      console.error('Profile update failed:', err);
      alert('프로필 수정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleNotification = async () => {
    const newValue = !notificationEnabled;
    try {
      await apiClient.updateGuardianNotificationSettings(newValue);
      setNotificationEnabled(newValue);
    } catch (err) {
      console.error('Notification toggle failed:', err);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const approvedCount = guardianships.filter((g) => g.is_approved).length;
  const pendingCount = guardianships.filter((g) => !g.is_approved && !g.is_rejected).length;
  const totalResidents = facilityGroups.reduce((sum, fg) => sum + fg.residents.length, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white flex items-center justify-center">
        <Loader2 className="animate-spin text-guardian-brown" size={40} />
        <span className="ml-3 text-gray-500 text-lg">로딩 중...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-soft">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <button onClick={() => navigate('/guardian')} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft size={24} className="text-primary" />
              </button>
              <h1 className="text-xl font-bold text-primary">내 정보</h1>
            </div>
            <button
              onClick={() => navigate('/guardian')}
              className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition"
            >
              <ImageIcon size={16} />
              갤러리
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* 프로필 카드 */}
        <section className="bg-white rounded-2xl shadow-soft overflow-hidden">
          <div className="bg-gradient-to-r from-primary to-blue-400 px-6 py-8 text-white">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold backdrop-blur-sm">
                {profile?.name?.[0] || 'G'}
              </div>
              <div className="flex-1">
                {editing ? (
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="bg-white/20 backdrop-blur-sm text-white placeholder-white/60 px-3 py-1.5 rounded-lg text-lg font-bold w-full outline-none focus:bg-white/30"
                    placeholder="이름"
                  />
                ) : (
                  <h2 className="text-xl font-bold">{profile?.name}</h2>
                )}
                <p className="text-blue-100 text-sm mt-0.5">보호자</p>
              </div>
              {!editing ? (
                <button onClick={() => setEditing(true)} className="p-2 hover:bg-white/20 rounded-lg transition">
                  <Edit3 size={18} />
                </button>
              ) : (
                <div className="flex gap-1">
                  <button
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="p-2 hover:bg-white/20 rounded-lg transition"
                  >
                    {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />}
                  </button>
                  <button onClick={() => { setEditing(false); setEditName(profile?.name || ''); setEditPhone(profile?.phone || ''); }} className="p-2 hover:bg-white/20 rounded-lg transition">
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="flex items-center gap-3">
              <Mail size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">이메일</p>
                <p className="text-sm font-medium text-gray-900">{profile?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Phone size={18} className="text-gray-400" />
              <div className="flex-1">
                <p className="text-xs text-gray-400">전화번호</p>
                {editing ? (
                  <input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="text-sm font-medium text-gray-900 border border-gray-300 rounded-lg px-2 py-1 w-full outline-none focus:ring-2 focus:ring-primary"
                    placeholder="010-0000-0000"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900">{profile?.phone || '미등록'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User size={18} className="text-gray-400" />
              <div>
                <p className="text-xs text-gray-400">가입일</p>
                <p className="text-sm font-medium text-gray-900">
                  {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('ko-KR') : '-'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 통계 요약 */}
        <section className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl shadow-soft p-4 text-center">
            <p className="text-2xl font-bold text-primary">{totalResidents}</p>
            <p className="text-xs text-gray-500 mt-1">어르신</p>
          </div>
          <div className="bg-white rounded-xl shadow-soft p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{photoCount}</p>
            <p className="text-xs text-gray-500 mt-1">공유된 사진</p>
          </div>
          <div className="bg-white rounded-xl shadow-soft p-4 text-center">
            <p className="text-2xl font-bold text-guardian-brown">{facilityGroups.length}</p>
            <p className="text-xs text-gray-500 mt-1">시설</p>
          </div>
        </section>

        {/* 연결된 어르신 */}
        <section className="bg-white rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Heart size={20} className="text-red-400" />
            내 어르신
          </h3>

          {facilityGroups.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-6">연결된 어르신이 없습니다.</p>
          ) : (
            <div className="space-y-4">
              {facilityGroups.map((fg) => (
                <div key={fg.facility_id}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={16} className="text-primary" />
                    <span className="text-sm font-semibold text-gray-700">{fg.facility_name}</span>
                  </div>
                  <div className="space-y-2 ml-6">
                    {fg.residents.map((r) => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{r.name}</p>
                          <p className="text-xs text-gray-500">
                            {r.relationship_type && <span className="mr-2">{r.relationship_type}</span>}
                            {r.room_number && <span>{r.room_number}호</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => navigate(`/guardian?resident=${r.id}&facility=${fg.facility_id}`)}
                          className="text-xs font-medium text-primary hover:text-blue-700 transition"
                        >
                          사진 보기 →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 승인 상태 */}
        {guardianships.length > 0 && (
          <section className="bg-white rounded-2xl shadow-soft p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Shield size={20} className="text-blue-500" />
              승인 상태
            </h3>
            <div className="space-y-3">
              {guardianships.map((g) => (
                <div key={g.guardian_id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {g.facility_name} · {g.resident_name}
                    </p>
                    {g.relationship_type && (
                      <p className="text-xs text-gray-500">{g.relationship_type}</p>
                    )}
                  </div>
                  {g.is_approved ? (
                    <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">승인됨</span>
                  ) : g.is_rejected ? (
                    <div className="text-right">
                      <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">거부됨</span>
                      {g.reject_reason && (
                        <p className="text-xs text-red-500 mt-1">{g.reject_reason}</p>
                      )}
                    </div>
                  ) : (
                    <span className="px-2.5 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">대기 중</span>
                  )}
                </div>
              ))}
            </div>
            {pendingCount > 0 && (
              <p className="text-xs text-gray-500 mt-3">
                승인 대기 중인 요청이 {pendingCount}건 있습니다. 시설에서 승인하면 사진을 볼 수 있습니다.
              </p>
            )}
          </section>
        )}

        {/* 알림 설정 */}
        <section className="bg-white rounded-2xl shadow-soft p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            {notificationEnabled ? <Bell size={20} className="text-blue-500" /> : <BellOff size={20} className="text-gray-400" />}
            알림 설정
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900">새 사진 알림</p>
              <p className="text-xs text-gray-500">어르신의 새 사진이 공유되면 알림을 받습니다</p>
            </div>
            <button
              onClick={handleToggleNotification}
              className={`relative w-12 h-7 rounded-full transition-colors ${
                notificationEnabled ? 'bg-primary' : 'bg-gray-300'
              }`}
            >
              <div
                className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${
                  notificationEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </section>

        {/* 로그아웃 */}
        <section className="pb-8">
          <button
            onClick={handleLogout}
            className="w-full py-3 text-center text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition text-sm font-medium"
          >
            로그아웃
          </button>
        </section>
      </main>
    </div>
  );
};

export default GuardianMyPage;
