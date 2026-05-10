import React, { useState, useEffect, useCallback } from 'react';
import { Heart, Share2, Loader2, CheckCircle, Mail, Building2, Users, Phone, Search, ClipboardList } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import OtpVerificationModal from '../components/OtpVerificationModal';
import FacilityPicker, { FacilitySearchResult } from '../components/FacilityPicker';
import PhotoLightbox from '../components/PhotoLightbox';

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
  matched_resident_ids?: string[];
  original_url: string;
  thumbnail_url: string | null;
  created_at: string;
}

interface GuardianshipItem {
  guardian_id: string;
  facility_id: string;
  facility_name: string;
  resident_id: string | null;
  resident_name: string;
  relationship_type: string | null;
  request_message: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  reject_reason: string | null;
}

const GuardianGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  // 연락처 입력
  const [showContactBanner, setShowContactBanner] = useState(false);
  const [contactType] = useState<'phone' | 'email'>('phone');
  const [contactValue, setContactValue] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  // 시설 검색·선택 기반 연결 요청
  const [showConnectForm, setShowConnectForm] = useState(false);
  const [connectFacility, setConnectFacility] = useState<FacilitySearchResult | null>(null);
  const [connectRelationType, setConnectRelationType] = useState('');
  const [connectMessage, setConnectMessage] = useState('');
  const [connectingFacility, setConnectingFacility] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);

  // 라이트박스
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  useEffect(() => {
    // 연락처 미등록 시 배너 표시
    if (user && !user.phone && !user.email) {
      setShowContactBanner(true);
    }
  }, [user]);

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

  const handleSaveContact = async () => {
    if (!contactValue.trim()) return;
    setSavingContact(true);
    try {
      const data: { name?: string; phone?: string } = {};
      if (contactType === 'phone') {
        data.phone = contactValue.trim();
      } else {
        // email은 profile API에서 별도 지원 안 하므로 phone 필드로 처리하거나 별도 API 필요
        // 일단은 phone으로 저장
        data.phone = contactValue.trim();
      }
      await apiClient.updateGuardianProfile(data);
      setShowContactBanner(false);
      setContactValue('');
      // 연락처 저장 후 초대 다시 확인
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setSavingContact(false);
    }
  };

  const submitConnectRequest = async () => {
    if (!connectFacility) return;
    setConnectingFacility(true);
    try {
      const res = await apiClient.requestFacilityConnection({
        facility_code: connectFacility.code,
        relationship_type: connectRelationType || undefined,
        message: connectMessage || undefined,
      });
      alert(res.data.message);
      setShowConnectForm(false);
      setConnectFacility(null);
      setConnectRelationType('');
      setConnectMessage('');
      await fetchData();
    } catch (err: any) {
      const detail = err.response?.data?.detail || '연결 요청에 실패했습니다.';
      // 서버가 OTP 인증 만료/누락 을 감지하면 모달로 재인증 유도
      if (typeof detail === 'string' && detail.includes('휴대폰 인증')) {
        setShowOtpModal(true);
      } else {
        alert(detail);
      }
    } finally {
      setConnectingFacility(false);
    }
  };

  const handleConnectFacility = async () => {
    if (!connectFacility) return;
    // 이미 인증된 phone 이 있으면 바로 연결 요청. 서버가 1년 만료 등 이유로 거부하면
    // submitConnectRequest 의 fallback 이 OTP 모달을 띄움.
    if (user?.phone) {
      await submitConnectRequest();
    } else {
      setShowOtpModal(true);
    }
  };

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) newSet.delete(photoId);
      else newSet.add(photoId);
      return newSet;
    });
  };

  // 필터링된 사진
  const filteredPhotos = photos.filter((p: any) => {
    if (selectedFacility !== 'all' && p.facility_id !== selectedFacility) return false;
    if (selectedResident !== 'all') {
      const legacyMatch = p.resident_id === selectedResident;
      const multiMatch = Array.isArray(p.matched_resident_ids) &&
        p.matched_resident_ids.includes(selectedResident);
      if (!legacyMatch && !multiMatch) return false;
    }
    return true;
  });

  const sortedPhotos = [...filteredPhotos].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const allResidents = facilityGroups.flatMap((fg) =>
    fg.residents.map((r) => ({ ...r, facility_name: fg.facility_name, facility_id: fg.facility_id }))
  );

  const filteredResidents = selectedFacility === 'all'
    ? allResidents
    : allResidents.filter((r) => r.facility_id === selectedFacility);

  const guardianships: GuardianshipItem[] = approvalStatus?.guardianships || [];
  const approvedList = guardianships.filter((g) => g.is_approved);
  const pendingList = guardianships.filter((g) => !g.is_approved && !g.is_rejected);
  const rejectedList = guardianships.filter((g) => g.is_rejected);
  const hasApproved = approvedList.length > 0;
  const hasInvitations = invitations.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl font-bold text-primary">어르신 갤러리</h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                {hasApproved
                  ? `${facilityGroups.length}개 시설 · ${allResidents.length}명의 어르신 · ${photos.length}장의 사진`
                  : '시설과 연결하면 어르신의 사진을 볼 수 있어요'}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
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
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="animate-spin text-guardian-brown" size={40} />
            <span className="ml-3 text-gray-500 text-lg">불러오는 중...</span>
          </div>
        ) : (
          <>
            {/* 연락처 미등록 배너 */}
            {showContactBanner && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-4">
                <div className="flex items-start gap-3 mb-3">
                  <Phone size={20} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-amber-900">연락처를 등록해주세요</h3>
                    <p className="text-sm text-amber-700 mt-1">전화번호를 등록하면 시설에서 보내는 초대를 받을 수 있어요.</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    className="flex-1 px-3 py-2 border border-amber-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    onClick={handleSaveContact}
                    disabled={savingContact || !contactValue.trim()}
                    className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition disabled:opacity-50"
                  >
                    {savingContact ? <Loader2 className="animate-spin" size={16} /> : '저장'}
                  </button>
                  <button
                    onClick={() => setShowContactBanner(false)}
                    className="px-3 py-2 text-amber-600 hover:text-amber-800 text-sm"
                  >
                    나중에
                  </button>
                </div>
              </div>
            )}

            {/* 성공 메시지 */}
            {acceptMessage && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
                {acceptMessage}
              </div>
            )}

            {/* 초대 배너 */}
            {hasInvitations && (
              <div className="space-y-2 mb-4">
                {invitations.map((inv) => (
                  <div key={inv.id} className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-green-800">
                        <span className="font-bold">{inv.facility_name}</span>에서 <span className="font-bold">{inv.resident_name}</span>님의 보호자로 초대했습니다
                      </p>
                      {inv.message && <p className="text-xs text-green-600 mt-1 truncate">{inv.message}</p>}
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => handleAcceptInvitation(inv.id)} disabled={acceptingId === inv.id}
                        className="px-3 py-1.5 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 disabled:opacity-50 flex items-center gap-1">
                        {acceptingId === inv.id ? <Loader2 className="animate-spin" size={14} /> : <CheckCircle size={14} />}
                        수락
                      </button>
                      <button onClick={() => handleRejectInvitation(inv.id)} disabled={acceptingId === inv.id}
                        className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300 disabled:opacity-50">
                        거절
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 승인 대기 중인 요청 */}
            {pendingList.length > 0 && (
              <div className="space-y-2 mb-4">
                {pendingList.map((g) => (
                  <div key={g.guardian_id} className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 size={16} className="text-blue-500 animate-spin" />
                      <p className="text-sm text-blue-800">
                        <span className="font-bold">{g.facility_name}</span> 연결 요청 승인 대기 중
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 거절된 요청 */}
            {rejectedList.length > 0 && (
              <div className="space-y-2 mb-4">
                {rejectedList.map((g) => (
                  <div key={g.guardian_id} className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-red-800">
                      <span className="font-bold">{g.facility_name}</span> 연결 요청이 거절되었습니다.
                      {g.reject_reason && <span className="block text-xs mt-1">사유: {g.reject_reason}</span>}
                    </p>
                  </div>
                ))}
              </div>
            )}

            {/* 연결된 시설이 없을 때 안내 */}
            {!hasApproved && !hasInvitations && pendingList.length === 0 && (
              <div className="bg-white rounded-2xl shadow-soft p-8 text-center mb-6">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 size={32} className="text-primary" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">연동된 시설이 없습니다</h2>
                <p className="text-gray-500 text-sm mb-6">
                  아래에서 시설을 검색해 연결을 요청하거나, 시설에서 초대를 보내면 자동으로 연결됩니다.
                </p>
              </div>
            )}

            {/* 시설 검색·선택으로 연결 요청 */}
            {!showConnectForm ? (
              <div className="mb-6">
                <button
                  onClick={() => setShowConnectForm(true)}
                  className="w-full py-3 border-2 border-dashed border-primary border-opacity-40 rounded-xl text-primary font-medium hover:bg-blue-50 transition flex items-center justify-center gap-2"
                >
                  <Search size={18} />
                  시설 검색해서 연결 요청하기
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl shadow-soft p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 size={20} className="text-primary" />
                  시설 검색 · 연결 요청
                </h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">시설 검색 *</label>
                    <FacilityPicker value={connectFacility} onChange={setConnectFacility} />
                    <p className="text-xs text-gray-400 mt-1">시설 이름 · 주소 · 전화번호로 검색해 선택하세요</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">관계</label>
                    <select
                      value={connectRelationType}
                      onChange={(e) => setConnectRelationType(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">선택해주세요</option>
                      <option value="아들">아들</option>
                      <option value="딸">딸</option>
                      <option value="배우자">배우자</option>
                      <option value="손자녀">손자녀</option>
                      <option value="며느리">며느리</option>
                      <option value="사위">사위</option>
                      <option value="기타">기타</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">메시지 (선택)</label>
                    <input
                      type="text"
                      placeholder="예: 홍길동 어르신의 아들입니다"
                      value={connectMessage}
                      onChange={(e) => setConnectMessage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleConnectFacility}
                      disabled={connectingFacility || !connectFacility}
                      className="flex-1 py-2.5 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {connectingFacility ? <Loader2 className="animate-spin" size={16} /> : <CheckCircle size={16} />}
                      연결 요청
                    </button>
                    <button
                      onClick={() => { setShowConnectForm(false); setConnectFacility(null); }}
                      className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 승인된 보호자: 갤러리 */}
            {hasApproved && (
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
                            <div key={r.id} className="flex items-stretch gap-1">
                              <button
                                onClick={() => {
                                  setSelectedFacility(fg.facility_id);
                                  setSelectedResident(r.id);
                                }}
                                className={`flex-1 text-left px-3 py-2 rounded-lg transition text-sm ${
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
                              <button
                                onClick={() => navigate(`/guardian/residents/${r.id}/wellness-logs`)}
                                title={`${r.name}님 안부 일지 보기`}
                                className="px-2 rounded-lg bg-guardian-cream hover:bg-guardian-brown hover:text-white text-guardian-brown transition flex items-center justify-center"
                              >
                                <ClipboardList size={16} />
                              </button>
                            </div>
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
                                onClick={() => setLightboxIndex(sortedPhotos.indexOf(photo))}
                                className="group relative bg-white rounded-xl overflow-hidden shadow-soft hover:shadow-soft-lg transition transform hover:scale-105 cursor-pointer"
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
                                      onClick={(e) => { e.stopPropagation(); toggleFavorite(photo.id); }}
                                      className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-2 hover:bg-red-50"
                                    >
                                      <Heart size={18}
                                        className={favorites.has(photo.id) ? 'text-red-500 fill-red-500' : 'text-gray-600'} />
                                    </button>
                                    <button
                                      onClick={(e) => e.stopPropagation()}
                                      className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-2 hover:bg-blue-50"
                                    >
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
                      시설에서 사진을 업로드하면 여기에 나타납니다.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </main>

      <footer className="bg-primary text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm opacity-80">&copy; 2024 Senior Album. 소중한 순간을 함께 나눕니다.</p>
        </div>
      </footer>

      <OtpVerificationModal
        isOpen={showOtpModal}
        defaultPhone={user?.phone || ''}
        purpose="시설 연결 요청 전에 휴대폰 인증이 필요합니다."
        onVerified={async () => {
          setShowOtpModal(false);
          await submitConnectRequest();
        }}
        onClose={() => setShowOtpModal(false)}
      />

      <PhotoLightbox
        photos={sortedPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
      />
    </div>
  );
};

export default GuardianGalleryPage;
