import React, { useState, useEffect, useCallback } from 'react';
import { Shield, CheckCircle, XCircle, Clock, Loader2, UserCheck } from 'lucide-react';
import Layout from '../components/Layout';
import { apiClient } from '../utils/api';

interface ResidentItem {
  id: string;
  name: string;
  room_number: string | null;
}

interface GuardianRequest {
  id: string;
  user_id: string;
  resident_id: string | null;
  relationship_type: string | null;
  request_message: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  reject_reason: string | null;
  approved_at: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  resident_name: string | null;
}

const GuardianManagePage: React.FC = () => {
  const [pendingGuardians, setPendingGuardians] = useState<GuardianRequest[]>([]);
  const [allGuardians, setAllGuardians] = useState<GuardianRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all'>('pending');
  const [rejectModal, setRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [residents, setResidents] = useState<ResidentItem[]>([]);
  const [assignModal, setAssignModal] = useState<string | null>(null); // guardian_id for resident assignment
  const [assignResidentId, setAssignResidentId] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user.facility_id || facility.id;

  const fetchData = useCallback(async () => {
    if (!facilityId) return;
    try {
      const [pendingRes, allRes, residentsRes] = await Promise.all([
        apiClient.getPendingGuardians(facilityId),
        apiClient.getAllGuardians(facilityId),
        apiClient.getFacilityResidents(facilityId),
      ]);
      setPendingGuardians(pendingRes.data);
      setAllGuardians(allRes.data);
      setResidents(residentsRes.data || []);
    } catch (err) {
      console.error('Failed to fetch guardians:', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (guardianId: string, residentId?: string) => {
    // 시설코드 요청 (resident 미배정)이면 입소자 선택 모달 띄우기
    const guardian = pendingGuardians.find(g => g.id === guardianId);
    if (guardian && !guardian.resident_id && !residentId) {
      setAssignModal(guardianId);
      setAssignResidentId('');
      return;
    }

    setProcessing(guardianId);
    try {
      await apiClient.approveGuardian(guardianId, true, undefined, residentId);
      setAssignModal(null);
      await fetchData();
    } catch (err: any) {
      console.error('Approval failed:', err);
      alert(err.response?.data?.detail || '승인에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (guardianId: string) => {
    setProcessing(guardianId);
    try {
      await apiClient.approveGuardian(guardianId, false, rejectReason || undefined);
      setRejectModal(null);
      setRejectReason('');
      await fetchData();
    } catch (err) {
      console.error('Rejection failed:', err);
      alert('거부에 실패했습니다.');
    } finally {
      setProcessing(null);
    }
  };

  const approvedGuardians = allGuardians.filter(g => g.is_approved);
  const rejectedGuardians = allGuardians.filter(g => g.is_rejected);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">보호자 관리</h1>
            <p className="text-gray-600 mt-1">
              대기 {pendingGuardians.length}명 | 승인 {approvedGuardians.length}명 | 거부 {rejectedGuardians.length}명
            </p>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Clock size={18} />
            승인 대기 ({pendingGuardians.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 ${
              activeTab === 'all'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <UserCheck size={18} />
            전체 보호자 ({allGuardians.length})
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-blue-500" size={32} />
            <span className="ml-3 text-gray-500">로딩 중...</span>
          </div>
        ) : activeTab === 'pending' ? (
          /* 승인 대기 목록 */
          pendingGuardians.length === 0 ? (
            <div className="bg-white rounded-lg shadow-soft p-12 text-center">
              <CheckCircle className="mx-auto text-green-300 mb-4" size={64} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">대기 중인 요청이 없습니다</h2>
              <p className="text-gray-500">새로운 보호자 가입 요청이 들어오면 여기에 표시됩니다.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingGuardians.map((guardian) => (
                <div key={guardian.id} className="bg-white rounded-lg shadow-soft p-6 border-l-4 border-yellow-400">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-lg font-bold text-gray-900">{guardian.user_name}</h3>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                          승인 대기
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{guardian.user_email}</p>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-gray-700">
                          입소자: <strong>{guardian.resident_name}</strong>
                        </span>
                        {guardian.relationship_type && (
                          <span className="text-gray-500">
                            관계: <strong>{guardian.relationship_type}</strong>
                          </span>
                        )}
                      </div>
                      {guardian.request_message && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mt-1">
                          <p className="text-xs text-blue-700">
                            <span className="font-medium">메시지:</span> {guardian.request_message}
                          </p>
                        </div>
                      )}
                      {guardian.user_phone && (
                        <p className="text-sm text-gray-500">연락처: {guardian.user_phone}</p>
                      )}
                      <p className="text-xs text-gray-400">
                        신청일: {new Date(guardian.created_at).toLocaleString('ko-KR')}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(guardian.id)}
                        disabled={processing === guardian.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
                      >
                        <CheckCircle size={16} />
                        승인
                      </button>
                      <button
                        onClick={() => setRejectModal(guardian.id)}
                        disabled={processing === guardian.id}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        거부
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* 전체 보호자 목록 */
          allGuardians.length === 0 ? (
            <div className="bg-white rounded-lg shadow-soft p-12 text-center">
              <Shield className="mx-auto text-gray-300 mb-4" size={64} />
              <h2 className="text-xl font-bold text-gray-900 mb-2">등록된 보호자가 없습니다</h2>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-soft overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">보호자</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이메일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">입소자</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">관계</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">상태</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">신청일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {allGuardians.map((guardian) => (
                    <tr key={guardian.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{guardian.user_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{guardian.user_email}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{guardian.resident_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{guardian.relationship_type || '-'}</td>
                      <td className="px-6 py-4 text-sm">
                        {guardian.is_approved ? (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded">승인됨</span>
                        ) : guardian.is_rejected ? (
                          <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-medium rounded" title={guardian.reject_reason || ''}>거부됨</span>
                        ) : (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">대기중</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{new Date(guardian.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* 거부 사유 모달 */}
      {rejectModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => { setRejectModal(null); setRejectReason(''); }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-4">보호자 요청 거부</h2>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">거부 사유 (선택)</label>
              <textarea
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="거부 사유를 입력하세요 (선택사항)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 h-24 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setRejectModal(null); setRejectReason(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(rejectModal)}
                disabled={processing === rejectModal}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition disabled:opacity-50"
              >
                거부하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 입소자 배정 모달 (시설코드 요청 승인 시) */}
      {assignModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => { setAssignModal(null); setAssignResidentId(''); }}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-6 sm:p-8" onClick={e => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-gray-900 mb-2">입소자 배정</h2>
            <p className="text-sm text-gray-500 mb-4">
              시설코드로 요청한 보호자입니다. 연결할 입소자를 선택해주세요.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-900 mb-2">입소자 선택 *</label>
              <select
                value={assignResidentId}
                onChange={e => setAssignResidentId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">선택해주세요</option>
                {residents.map((r: any) => (
                  <option key={r.id} value={r.id}>
                    {r.name} {r.room_number ? `(${r.room_number})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setAssignModal(null); setAssignResidentId(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={() => {
                  if (!assignResidentId) { alert('입소자를 선택해주세요.'); return; }
                  handleApprove(assignModal, assignResidentId);
                }}
                disabled={processing === assignModal || !assignResidentId}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50"
              >
                승인 + 배정
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default GuardianManagePage;
