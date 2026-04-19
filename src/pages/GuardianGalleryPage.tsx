import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Share2, ChevronLeft, Loader2, CheckCircle, XCircle, Mail, Building2, Users, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';

interface InvitationItem {
  id: string;
  facility_name: string;
  resident_name: string;
  relationship_type: string | null;
  message: string | null;
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
  }[];
}

interface PhotoItem {
  id: string;
  facility_id: string;
  resident_id: string | null;
  resident_name: string | null;
  original_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

const GuardianGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [facilityGroups, setFacilityGroups] = useState<FacilityGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [approvalStatus, setApprovalStatus] = useState<any>(null);

  // 필터
  const [selectedFacility, setSelectedFacility] = useState<string>('all');
  const [selectedResident, setSelectedResident] = useState<string>('all');

  // 초대
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [acceptMessage, setAcceptMessage] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const [statusRes, invRes] = await Promise.all([
        apiClient.getGuardianStatus(),
        apiClient.getMyInvitations(),
      ]);
      setApprovalStatus(statusRes.data);
      setInvitations(invRes.data);

      const guardianships = statusRes.data?.guardianships || [];
      const hasApproved = guardianships.some((g: any) => g.is_approved);

      if (hasApproved) {
        const [photosRes, residentsRes] = await Promise.all([
          apiClient.getGuardianPhotos(),
          apiClient.getGuardianResidents(),
        ]);
        setPhotos(photosRes.data);
        setFacilityGroups(residentsRes.data);
      }
    } catch (err) {
      console.error('Failed to fetch guardian data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptInvitation = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      const res = await apiClient.acceptInvitation(invitationId);
      setAcceptMessage(res.data.message);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '수락에 실패했습니다.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectInvitation = async (invitationId: string) => {
    setAcceptingId(invitationId);
    try {
      await apiClient.rejectInvitation(invitationId);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '거절에 실패했습니다.');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) newSet.delete(photoId);
      else newSet.add(photoId);
      return newSet;
    });
  };

  // 필터링된 사진 (다대다 매핑도 체크)
  const filteredPhotos = photos.filter((p: any) => {
    if (selectedFacility !== 'all' && p.facility_id !== selectedFacility) return false;
    if (selectedResident !== 'all') {
      // 레거시 resident_id 체크
      const legacyMatch = p.resident_id === selectedResident;
      // matched_resident_ids 배열에서도 체크 (다대다 매핑)
      const multiMatch = Array.isArray(p.matched_resident_ids) &&
        p.matched_resident_ids.includes(selectedResident);
      if (!legacyMatch && !multiMatch) return false;
    }
    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  // 전체 입소자 목록 (필터 드롭다운용)
  const allResidents = facilityGroups.flatMap((fg) =>
    fg.residents.map((r) => ({ ...r, facility_name: fg.facility_name, facility_id: fg.facility_id }))
  );

  // 선택된 시설에 따라 입소자 필터
  const filteredResidents = selectedFacility === 'all'
    ? allResidents
    : allResidents.filter((r) => r.facility_id === selectedFacility);

  const guardianships = approvalStatus?.guardianships || [];
  const approvedList = guardianships.filter((g: any) => g.is_approved);
  const hasApproved = approvedList.length > 0;
  const hasInvitations = invitations.length > 0;

  // ========== 초대도 없고 승인도 없는 상태 ==========
  if (!loading && !hasApproved && !hasInvitations) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail size={32} className="text-primary" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">초대를 기다리고 있어요</h2>
            <p className="text-gray-500 text-sm mb-6">
              시설에서 보호자 초대를 보내면 여기에 표시됩니다.
              시설 직원에게 가입 시 사용한 전화번호를 알려주세요.
            </p>

            {acceptMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4">
                {acceptMessage}
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">내 전화번호</p>
              <p className="text-sm font-medium text-gray-900">{user?.phone || '등록된 번호 없음'}</p>
              {!user?.phone && (
                <p className="text-xs text-red-500 mt-1">전화번호가 등록되지 않았습니다.</p>
              )}
            </div>

            <button onClick={handleLogout} className="px-6 py-2 text-gray-500 hover:text-red-600 transition text-sm">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 초대 수락 대기 (승인된 것 없음) ==========
  if (!loading && hasInvitations && !hasApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Mail size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">초대가 도착했어요!</h2>
            <p className="text-gray-500 text-sm mt-1">시설에서 보호자 초대를 보냈습니다.</p>
          </div>

          {acceptMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-3 py-2 rounded-lg text-sm mb-4">
              {acceptMessage}
            </div>
          )}

          <div className="space-y-4">
            {invitations.map((inv) => (
              <div key={inv.id} className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-400">
                <div className="mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{inv.facility_name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    <span className="font-medium">{inv.resident_name}</span>님의 보호자로 초대되었습니다
                  </p>
                  {inv.relationship_type && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded">
                      {inv.relationship_type}
                    </span>
                  )}
                  {inv.message && (
                    <div className="mt-3 bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500 mb-1">시설 메시지</p>
                      <p className="text-sm text-gray-700">{inv.message}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {new Date(inv.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleAcceptInvitation(inv.id)}
                    disabled={acceptingId === inv.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
                  >
                    {acceptingId === inv.id ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                    수락
                  </button>
                  <button
                    onClick={() => handleRejectInvitation(inv.id)}
                    disabled={acceptingId === inv.id}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    거절
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-6">
            <button onClick={handleLogout} className="px-6 py-2 text-gray-500 hover:text-red-600 transition text-sm">
              로그아웃
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ========== 승인된 보호자: 갤러리 ==========
  return (
    <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button onClick={handleLogout} className="p-2 hover:bg-gray-100 rounded-lg transition">
                <ChevronLeft size={24} className="text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-primary">어르신 갤러리</h1>
                <p className="text-sm text-gray-600">
                  {facilityGroups.length}개 시설 · {allResidents.length}명의 어르신 · {photos.length}장의 사진
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasInvitations && (
                <div className="relative">
                  <Mail size={20} className="text-green-600" />
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {invitations.length}
                  </span>
                </div>
              )}
              <button
                onClick={() => navigate('/guardian/mypage')}
                className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                <div className="w-7 h-7 bg-guardian-brown rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {user?.name?.[0] || 'G'}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:inline">{user?.name}</span>
                <UserIcon size={14} className="text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 추가 초대 배너 */}
      {hasInvitations && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
          {invitations.map((inv) => (
            <div key={inv.id} className="bg-green-50 border border-green-200 rounded-lg p-4 mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-green-800">
                {inv.facility_name}에서 {inv.resident_name}님의 보호자로 초대했습니다
              </p>
              <div className="flex gap-2">
                <button onClick={() => handleAcceptInvitation(inv.id)} disabled={acceptingId === inv.id}
                  className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50">수락</button>
                <button onClick={() => handleRejectInvitation(inv.id)} disabled={acceptingId === inv.id}
                  className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50">거절</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-guardian-brown" size={40} />
            <span className="ml-3 text-gray-500 text-lg">사진을 불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* 시설/입소자 카드 */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users size={20} />
                내 어르신
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {facilityGroups.map((fg) => (
                  <div key={fg.facility_id} className="bg-white rounded-xl shadow-soft p-5 border-l-4 border-primary">
                    <div className="flex items-center gap-2 mb-3">
                      <Building2 size={16} className="text-primary" />
                      <h3 className="font-semibold text-gray-900">{fg.facility_name}</h3>
                    </div>
                    <div className="space-y-2">
                      {fg.residents.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedFacility(fg.facility_id);
                            setSelectedResident(r.id);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-lg transition text-sm ${
                            selectedResident === r.id
                              ? 'bg-primary text-white'
                              : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span className="font-medium">{r.name}</span>
                          {r.relationship_type && (
                            <span className={`ml-2 text-xs ${selectedResident === r.id ? 'text-blue-100' : 'text-gray-400'}`}>
                              ({r.relationship_type})
                            </span>
                          )}
                          {r.room_number && (
                            <span className={`ml-1 text-xs ${selectedResident === r.id ? 'text-blue-100' : 'text-gray-400'}`}>
                              · {r.room_number}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 필터 바 */}
            <div className="bg-white rounded-xl shadow-soft p-4 mb-8 flex flex-wrap items-center gap-4">
              <button
                onClick={() => { setSelectedFacility('all'); setSelectedResident('all'); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  selectedFacility === 'all' && selectedResident === 'all'
                    ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                전체 ({photos.length})
              </button>

              {facilityGroups.length > 1 && facilityGroups.map((fg) => (
                <button
                  key={fg.facility_id}
                  onClick={() => { setSelectedFacility(fg.facility_id); setSelectedResident('all'); }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    selectedFacility === fg.facility_id && selectedResident === 'all'
                      ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {fg.facility_name} ({photos.filter(p => p.facility_id === fg.facility_id).length})
                </button>
              ))}

              {filteredResidents.length > 1 && (
                <div className="border-l border-gray-300 pl-4 flex flex-wrap gap-2">
                  {filteredResidents.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => { if (selectedFacility === 'all') setSelectedFacility(r.facility_id); setSelectedResident(r.id); }}
                      className={`px-3 py-1.5 rounded-lg text-sm transition ${
                        selectedResident === r.id
                          ? 'bg-guardian-brown text-white' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 사진 그리드 */}
            {sortedPhotos.length > 0 ? (
              <div className="space-y-10">
                {(() => {
                  const grouped = sortedPhotos.reduce((acc, photo) => {
                    const date = new Date(photo.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric', month: '2-digit', day: '2-digit',
                    });
                    if (!acc[date]) acc[date] = [];
                    acc[date].push(photo);
                    return acc;
                  }, {} as Record<string, PhotoItem[]>);

                  return Object.entries(grouped).map(([date, groupPhotos]) => (
                    <div key={date}>
                      <div className="mb-4 pb-3 border-b-2 border-guardian-brown border-opacity-20">
                        <h3 className="text-lg font-semibold text-primary">{date}</h3>
                        <p className="text-sm text-gray-600">{groupPhotos.length}장</p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {groupPhotos.map((photo) => (
                          <div key={photo.id}
                            className="group relative bg-white rounded-xl overflow-hidden shadow-soft hover:shadow-soft-lg transition transform hover:scale-105"
                          >
                            <div className="aspect-square bg-gray-200 overflow-hidden relative">
                              <img
                                src={photo.thumbnail_url || photo.original_url}
                                alt="Gallery photo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23f5f0eb"><rect width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14">Photo</text></svg>';
                                }}
                              />
                              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center gap-2">
                                <button
                                  onClick={() => toggleFavorite(photo.id)}
                                  className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-2 hover:bg-red-50"
                                >
                                  <Heart size={18}
                                    className={favorites.has(photo.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'} />
                                </button>
                                <button className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-2 hover:bg-blue-50">
                                  <Share2 size={18} className="text-blue-600" />
                                </button>
                              </div>
                            </div>
                            <div className="p-3">
                              {photo.resident_name && allResidents.length > 1 && (
                                <p className="text-xs font-medium text-primary mb-0.5">{photo.resident_name}</p>
                              )}
                              <p className="text-xs text-gray-500">
                                {new Date(photo.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            ) : (
              <div className="text-center py-16">
                <div className="inline-block p-6 bg-guardian-cream rounded-2xl mb-4">
                  <Heart size={48} className="text-guardian-brown opacity-50" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {selectedResident !== 'all' ? '이 어르신의 사진이 아직 없습니다' : '아직 공유된 사진이 없습니다'}
                </h3>
                <p className="text-gray-600">
                  요양원에서 사진을 업로드하면 여기에 나타납니다.
                </p>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="bg-primary text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm opacity-80">© 2024 Senior Album. 소중한 순간을 함께 나눕니다.</p>
        </div>
      </footer>
    </div>
  );
};

export default GuardianGalleryPage;
