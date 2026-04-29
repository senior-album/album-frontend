import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Edit2, Camera, Loader2, UserPlus, Phone, Trash2, CheckCircle, XCircle, Image, Upload, Download, FileSpreadsheet, X } from 'lucide-react';
import Layout from '../components/Layout';
import { apiClient } from '../utils/api';
import { Resident } from '../types';

type ResidentFilter = 'all' | 'no-guardian' | 'no-face';

const FILTER_LABELS: Record<ResidentFilter, string> = {
  'all': '전체',
  'no-guardian': '보호자 미연결',
  'no-face': '얼굴 미등록',
};

interface FaceInfo {
  doc_id: string;
  photo_url: string | null;
  resident_id: string;
}

const ResidentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterParam = searchParams.get('filter');
  const initialFilter: ResidentFilter =
    filterParam === 'no-guardian' || filterParam === 'no-face' ? filterParam : 'all';

  const [filter, setFilter] = useState<ResidentFilter>(initialFilter);
  const [residents, setResidents] = useState<Resident[]>([]);
  // T-031: 승인된(is_approved && !is_rejected) 보호자가 배정된 resident_id set
  const [approvedGuardianResidentIds, setApprovedGuardianResidentIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [showFaceListModal, setShowFaceListModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [saving, setSaving] = useState(false);
  const [faceUploading, setFaceUploading] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [faceDragOver, setFaceDragOver] = useState(false);
  const faceInputRef = useRef<HTMLInputElement>(null);

  // 기준 사진 목록
  const [faceCounts, setFaceCounts] = useState<Record<string, number>>({});
  const [faceList, setFaceList] = useState<FaceInfo[]>([]);
  const [faceListLoading, setFaceListLoading] = useState(false);
  const [deletingFaceId, setDeletingFaceId] = useState<string | null>(null);

  // 보호자 초대 폼
  const [inviteContactType, setInviteContactType] = useState<'phone' | 'email'>('phone');
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

  // T-030: CSV 일괄 import
  const [showCsvModal, setShowCsvModal] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvResult, setCsvResult] = useState<{
    created_count: number;
    error_count: number;
    created: { row: number; name: string }[];
    errors: { row: number; name?: string; reason: string }[];
  } | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    gender: '',
    room_number: '',
  });

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user.facility_id || facility.id;

  const fetchResidents = async () => {
    if (!facilityId) return;
    try {
      const [residentsRes, guardiansRes] = await Promise.all([
        apiClient.getFacilityResidents(facilityId),
        // T-031: 승인된 guardian 이 없는 resident 필터 계산용. 실패해도 입소자 로드는 진행.
        apiClient.getAllGuardians(facilityId).catch((err) => {
          console.error('Failed to fetch guardians (filter will default to empty set):', err);
          return { data: [] as any[] };
        }),
      ]);
      setResidents(residentsRes.data);

      const approvedIds = new Set<string>(
        (Array.isArray(guardiansRes.data) ? guardiansRes.data : [])
          .filter((g: any) => g.is_approved && !g.is_rejected && g.resident_id)
          .map((g: any) => g.resident_id as string),
      );
      setApprovedGuardianResidentIds(approvedIds);

      // 각 입소자의 기준 사진 수를 가져옴
      fetchFaceCounts(residentsRes.data);
    } catch (err) {
      console.error('Failed to fetch residents:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFaceCounts = async (residentsList: Resident[]) => {
    const counts: Record<string, number> = {};
    await Promise.all(
      residentsList.map(async (r) => {
        try {
          const res = await apiClient.getResidentFaces(r.id);
          counts[r.id] = res.data.face_count || 0;
        } catch {
          counts[r.id] = 0;
        }
      })
    );
    setFaceCounts(counts);
  };

  const openFaceListModal = async (resident: Resident) => {
    setSelectedResident(resident);
    setShowFaceListModal(true);
    setFaceListLoading(true);
    try {
      const res = await apiClient.getResidentFaces(resident.id);
      setFaceList(res.data.faces || []);
    } catch (err) {
      console.error('Failed to fetch faces:', err);
      setFaceList([]);
    } finally {
      setFaceListLoading(false);
    }
  };

  const handleDeleteFace = async (docId: string) => {
    if (!selectedResident) return;
    if (!confirm('이 기준 사진을 삭제하시겠습니까?')) return;
    setDeletingFaceId(docId);
    try {
      await apiClient.deleteResidentFace(selectedResident.id, docId);
      setFaceList((prev) => prev.filter((f) => f.doc_id !== docId));
      setFaceCounts((prev) => ({
        ...prev,
        [selectedResident.id]: Math.max(0, (prev[selectedResident.id] || 1) - 1),
      }));
    } catch (err: any) {
      alert(err.response?.data?.detail || '삭제에 실패했습니다.');
    } finally {
      setDeletingFaceId(null);
    }
  };

  useEffect(() => {
    fetchResidents();
  }, [facilityId]);

  const handleAddResident = () => {
    setFormData({ name: '', birth_date: '', gender: '', room_number: '' });
    setSelectedResident(null);
    setShowModal(true);
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setFormData({
      name: resident.name,
      birth_date: resident.birth_date || '',
      gender: resident.gender || '',
      room_number: resident.room_number || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (selectedResident) {
        // 수정 (PUT)
        await apiClient.getClient().put(`/residents/${selectedResident.id}`, formData);
      } else {
        // 등록 (POST)
        await apiClient.createResident({
          facility_id: facilityId,
          name: formData.name,
          birth_date: formData.birth_date || undefined,
          gender: formData.gender || undefined,
          room_number: formData.room_number || undefined,
        });
      }
      setShowModal(false);
      await fetchResidents();
    } catch (err: any) {
      alert(err.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getAge = (birthDate?: string) => {
    if (!birthDate) return '-';
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const activeResidents = residents.filter((r) => r.is_active);

  // T-031: URL param 과 filter state 동기화
  const applyFilter = (next: ResidentFilter) => {
    setFilter(next);
    const sp = new URLSearchParams(searchParams);
    if (next === 'all') sp.delete('filter');
    else sp.set('filter', next);
    setSearchParams(sp, { replace: true });
  };

  // T-030: CSV 일괄 import
  const openCsvModal = () => {
    setCsvFile(null);
    setCsvResult(null);
    setCsvError(null);
    setShowCsvModal(true);
  };

  const closeCsvModal = () => {
    if (csvUploading) return;
    setShowCsvModal(false);
  };

  const handleCsvDownloadTemplate = async () => {
    try {
      const res = await apiClient.downloadResidentImportTemplate();
      const url = URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'residents_template.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setCsvError('템플릿 다운로드에 실패했습니다.');
    }
  };

  const handleCsvUpload = async () => {
    if (!csvFile || !facilityId) return;
    setCsvUploading(true);
    setCsvError(null);
    setCsvResult(null);
    try {
      const res = await apiClient.importResidentsCsv(facilityId, csvFile);
      setCsvResult(res.data);
      // 1명이라도 성공했으면 목록 새로고침
      if (res.data?.created_count > 0) {
        await fetchResidents();
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '업로드에 실패했습니다.';
      setCsvError(typeof detail === 'string' ? detail : JSON.stringify(detail));
    } finally {
      setCsvUploading(false);
    }
  };

  const filteredResidents = activeResidents.filter((r) => {
    if (filter === 'no-guardian') return !approvedGuardianResidentIds.has(r.id);
    if (filter === 'no-face') return (faceCounts[r.id] ?? 0) === 0;
    return true;
  });

  const filterCounts: Record<ResidentFilter, number> = {
    'all': activeResidents.length,
    'no-guardian': activeResidents.filter((r) => !approvedGuardianResidentIds.has(r.id)).length,
    'no-face': activeResidents.filter((r) => (faceCounts[r.id] ?? 0) === 0).length,
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">입소자 관리</h1>
            <p className="text-gray-600 mt-1">총 {residents.length}명 ({activeResidents.length}명 활성)</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={openCsvModal}
              className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-3 rounded-lg font-medium hover:bg-gray-50 transition shadow-sm"
              title="CSV 파일로 한 번에 최대 100명 등록"
            >
              <FileSpreadsheet size={18} />
              CSV 일괄 등록
            </button>
            <button
              onClick={handleAddResident}
              className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-soft"
            >
              <Plus size={20} />
              입소자 등록
            </button>
          </div>
        </div>

        {/* T-031: 필터 탭 */}
        {!loading && activeResidents.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {(['all', 'no-guardian', 'no-face'] as ResidentFilter[]).map((key) => (
              <button
                key={key}
                onClick={() => applyFilter(key)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                  filter === key
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {FILTER_LABELS[key]}
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs ${
                  filter === key ? 'bg-white/20' : 'bg-white text-gray-500'
                }`}>
                  {filterCounts[key]}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-primary" size={32} />
            <span className="ml-3 text-gray-500">입소자 목록 로딩 중...</span>
          </div>
        ) : residents.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-lg shadow-soft p-12 text-center">
            <Plus className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">아직 등록된 입소자가 없습니다</h2>
            <p className="text-gray-500 mb-6">입소자를 등록하면 사진 분류에 활용됩니다.</p>
            <button
              onClick={handleAddResident}
              className="bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition"
            >
              첫 입소자 등록하기
            </button>
          </div>
        ) : (
          /* Residents Table */
          <div className="bg-white rounded-lg shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                입소자 목록 ({filteredResidents.length}
                {filter !== 'all' && ` / ${activeResidents.length}`})
              </h2>
              {filter !== 'all' && (
                <span className="text-sm text-gray-500">
                  필터: <span className="font-medium text-gray-700">{FILTER_LABELS[filter]}</span>
                </span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">생년월일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">호실</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">등록일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">코드</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">기준 사진</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">보호자</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {resident.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getAge(resident.birth_date)}세
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {resident.birth_date ? new Date(resident.birth_date).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {resident.room_number || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(resident.created_at).toLocaleDateString('ko-KR')}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                        {(resident as any).code || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          {(faceCounts[resident.id] || 0) > 0 ? (
                            <button
                              onClick={() => openFaceListModal(resident)}
                              className="flex items-center gap-1 text-green-600 hover:text-green-800 transition"
                              title="등록된 기준 사진 보기"
                            >
                              <CheckCircle size={16} />
                              <span className="font-medium">{faceCounts[resident.id]}장</span>
                            </button>
                          ) : (
                            <span className="flex items-center gap-1 text-gray-400">
                              <XCircle size={16} />
                              <span>없음</span>
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setSelectedResident(resident);
                              setFacePreview(null);
                              setFaceFile(null);
                              setShowFaceModal(true);
                            }}
                            className="ml-1 text-blue-500 hover:text-blue-700 transition"
                            title="기준 사진 추가 등록"
                          >
                            <Camera size={16} />
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <button
                          onClick={() => {
                            setSelectedResident(resident);
                            setInvitePhone('');
                            setInviteRelationship('');
                            setInviteMessage('');
                            setShowInviteModal(true);
                          }}
                          className="flex items-center gap-2 text-green-600 hover:text-green-800 transition"
                        >
                          <UserPlus size={18} />
                          <span>초대</span>
                        </button>
                      </td>
                      <td className="px-6 py-4 text-sm flex gap-2">
                        <button
                          onClick={() => handleEditResident(resident)}
                          className="text-blue-600 hover:text-blue-800 transition"
                        >
                          <Edit2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Resident Registration/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedResident ? '입소자 수정' : '입소자 등록'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">이름 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">생년월일</label>
                <input
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">성별</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">선택 안 함</option>
                  <option value="male">남성</option>
                  <option value="female">여성</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">호실</label>
                <input
                  type="text"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="예: 101호"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? '저장 중...' : selectedResident ? '수정' : '등록'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Face Registration Modal */}
      {showFaceModal && selectedResident && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowFaceModal(false); setFacePreview(null); setFaceFile(null); }}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedResident.name}님 기준 사진 등록
            </h2>

            <input
              ref={faceInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && file.type.startsWith('image/')) {
                  setFaceFile(file);
                  setFacePreview(URL.createObjectURL(file));
                }
                if (e.target) e.target.value = '';
              }}
            />

            <div className="space-y-4">
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  if (faceInputRef.current) {
                    faceInputRef.current.value = '';
                    faceInputRef.current.click();
                  }
                }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setFaceDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setFaceDragOver(false); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setFaceDragOver(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith('image/')) {
                    setFaceFile(file);
                    setFacePreview(URL.createObjectURL(file));
                  }
                }}
                style={{ cursor: 'pointer' }}
                className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
                  faceDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                }`}
              >
                {facePreview ? (
                  <div className="flex flex-col items-center">
                    <img src={facePreview} alt="preview" className="w-32 h-32 object-cover rounded-lg mb-2" />
                    <p className="text-sm text-gray-500">클릭하여 다른 사진 선택</p>
                  </div>
                ) : (
                  <div>
                    <Camera className="mx-auto text-gray-400 mb-2" size={48} />
                    <p className="font-semibold text-gray-900 mb-1">사진을 선택하거나 드래그하세요</p>
                    <p className="text-sm text-gray-500">얼굴이 명확하게 나온 정면 사진을 권장합니다</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>팁:</strong> 밝고 명확한 얼굴 사진이 AI 분류의 정확도를 높입니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowFaceModal(false); setFacePreview(null); setFaceFile(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  disabled={!faceFile || faceUploading}
                  onClick={async () => {
                    if (!faceFile || !selectedResident) return;
                    setFaceUploading(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', faceFile);
                      const res = await apiClient.registerResidentFace(selectedResident.id, fd);
                      const reclassified = res.data?.reclassified_photos || 0;
                      const msg = reclassified > 0
                        ? `${selectedResident.name}님의 기준 사진이 등록되었습니다.\n기존 미분류 사진 ${reclassified}장이 자동으로 분류되었습니다.`
                        : `${selectedResident.name}님의 기준 사진이 등록되었습니다.`;
                      alert(msg);
                      setShowFaceModal(false);
                      setFacePreview(null);
                      setFaceFile(null);
                      // 기준 사진 수 갱신
                      setFaceCounts((prev) => ({
                        ...prev,
                        [selectedResident.id]: (prev[selectedResident.id] || 0) + 1,
                      }));
                      await fetchResidents();
                    } catch (err: any) {
                      console.error('Face registration failed:', err);
                      const detail = err.response?.data?.detail || '얼굴 등록에 실패했습니다.';
                      alert(detail);
                    } finally {
                      setFaceUploading(false);
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {faceUploading ? '업로드 중...' : '업로드'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Face List Modal — 등록된 기준 사진 보기 */}
      {showFaceListModal && selectedResident && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFaceListModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-lg w-full p-8 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {selectedResident.name}님 기준 사진
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  등록된 기준 사진 {faceList.length}장
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedResident(selectedResident);
                  setFacePreview(null);
                  setFaceFile(null);
                  setShowFaceListModal(false);
                  setShowFaceModal(true);
                }}
                className="flex items-center gap-1 text-sm bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 transition"
              >
                <Camera size={16} />
                추가 등록
              </button>
            </div>

            {faceListLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={28} />
                <span className="ml-3 text-gray-500">로딩 중...</span>
              </div>
            ) : faceList.length === 0 ? (
              <div className="text-center py-12">
                <Image className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500 mb-4">등록된 기준 사진이 없습니다.</p>
                <button
                  onClick={() => {
                    setShowFaceListModal(false);
                    setFacePreview(null);
                    setFaceFile(null);
                    setShowFaceModal(true);
                  }}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  지금 등록하기
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {faceList.map((face, idx) => (
                  <div
                    key={face.doc_id}
                    className="relative group border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {face.photo_url ? (
                      <img
                        src={face.photo_url}
                        alt={`기준 사진 ${idx + 1}`}
                        className="w-full h-40 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = '';
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.classList.add('bg-gray-100');
                        }}
                      />
                    ) : (
                      <div className="w-full h-40 bg-gray-100 flex items-center justify-center">
                        <div className="text-center">
                          <Image className="mx-auto text-gray-300 mb-1" size={32} />
                          <p className="text-xs text-gray-400">URL 없음</p>
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white text-xs font-medium">#{idx + 1}</span>
                        <button
                          onClick={() => handleDeleteFace(face.doc_id)}
                          disabled={deletingFaceId === face.doc_id}
                          className="text-white/80 hover:text-red-400 transition p-1"
                          title="삭제"
                        >
                          {deletingFaceId === face.doc_id ? (
                            <Loader2 className="animate-spin" size={16} />
                          ) : (
                            <Trash2 size={16} />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowFaceListModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Guardian Modal */}
      {showInviteModal && selectedResident && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowInviteModal(false)}
        >
          <div className="bg-white rounded-lg max-w-md w-full p-8" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">보호자 초대</h2>
            <p className="text-sm text-gray-500 mb-6">
              <strong>{selectedResident.name}</strong>님의 보호자를 초대합니다
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const contactVal = inviteContactType === 'phone' ? invitePhone.trim() : inviteEmail.trim();
                if (!contactVal) { alert(inviteContactType === 'phone' ? '전화번호를 입력해주세요.' : '이메일을 입력해주세요.'); return; }
                setInviteSending(true);
                try {
                  await apiClient.createInvitation({
                    resident_id: selectedResident.id,
                    phone: inviteContactType === 'phone' ? invitePhone.trim() : undefined,
                    email: inviteContactType === 'email' ? inviteEmail.trim() : undefined,
                    relationship_type: inviteRelationship || undefined,
                    message: inviteMessage || undefined,
                  });
                  alert(`${contactVal}로 초대를 보냈습니다.\n보호자가 가입 후 초대를 수락하면 사진을 열람할 수 있습니다.`);
                  setShowInviteModal(false);
                  setInvitePhone('');
                  setInviteEmail('');
                } catch (err: any) {
                  alert(err.response?.data?.detail || '초대에 실패했습니다.');
                } finally {
                  setInviteSending(false);
                }
              }}
              className="space-y-4"
            >
              {/* 초대 방식 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">초대 방식</label>
                <div className="flex gap-2">
                  <button type="button"
                    onClick={() => setInviteContactType('phone')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${inviteContactType === 'phone' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    전화번호
                  </button>
                  <button type="button"
                    onClick={() => setInviteContactType('email')}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${inviteContactType === 'email' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                    이메일
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {inviteContactType === 'phone' ? '보호자 전화번호 *' : '보호자 이메일 *'}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  {inviteContactType === 'phone' ? (
                    <input
                      type="tel"
                      value={invitePhone}
                      onChange={(e) => setInvitePhone(e.target.value)}
                      placeholder="010-1234-5678"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  ) : (
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="guardian@example.com"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {inviteContactType === 'phone'
                    ? '보호자가 가입 시 사용할 전화번호를 입력하세요'
                    : '보호자가 가입 시 사용할 이메일을 입력하세요'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">관계</label>
                <select
                  value={inviteRelationship}
                  onChange={(e) => setInviteRelationship(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">선택해주세요</option>
                  <option value="아들">아들</option>
                  <option value="딸">딸</option>
                  <option value="배우자">배우자</option>
                  <option value="며느리">며느리</option>
                  <option value="사위">사위</option>
                  <option value="손자녀">손자녀</option>
                  <option value="기타">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">메시지 (선택)</label>
                <textarea
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  placeholder="보호자에게 보낼 메시지"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary h-20 resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={inviteSending}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {inviteSending ? <Loader2 className="animate-spin" size={16} /> : <UserPlus size={16} />}
                  {inviteSending ? '보내는 중...' : '초대 보내기'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* T-030: CSV 일괄 import 모달 */}
      {showCsvModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={closeCsvModal}
        >
          <div
            className="bg-white rounded-2xl shadow-xl max-w-xl w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <FileSpreadsheet size={18} className="text-primary" />
                <h3 className="text-base font-bold text-gray-900">입소자 CSV 일괄 등록</h3>
              </div>
              <button
                type="button"
                onClick={closeCsvModal}
                disabled={csvUploading}
                className="text-gray-400 hover:text-gray-700 p-1 disabled:opacity-50"
                aria-label="닫기"
              >
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-4 space-y-4">
              {/* 1) 안내 + 템플릿 다운로드 */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-900 space-y-2">
                <p className="font-medium">CSV 형식</p>
                <ul className="list-disc pl-5 space-y-0.5 text-xs">
                  <li>헤더 필수: <code className="font-mono">name, birth_date, gender, room_number, medical_notes</code></li>
                  <li><code className="font-mono">name</code> 만 필수, 나머지는 비워도 됩니다.</li>
                  <li>한 번에 최대 100명까지 등록.</li>
                  <li>주민번호 뒷자리는 저장하지 않습니다.</li>
                </ul>
                <button
                  type="button"
                  onClick={handleCsvDownloadTemplate}
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Download size={14} />
                  템플릿 CSV 다운로드
                </button>
              </div>

              {/* 2) 파일 선택 */}
              {!csvResult && (
                <div>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={(e) => {
                      setCsvFile(e.target.files?.[0] ?? null);
                      setCsvError(null);
                    }}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => csvInputRef.current?.click()}
                    disabled={csvUploading}
                    className="w-full border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary hover:bg-blue-50 transition disabled:opacity-50"
                  >
                    <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                    {csvFile ? (
                      <p className="text-sm text-gray-700">
                        <span className="font-medium">{csvFile.name}</span>
                        <span className="text-gray-400 ml-1">({(csvFile.size / 1024).toFixed(1)} KB)</span>
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">파일 선택 (CSV, 1MB 이하)</p>
                    )}
                  </button>
                </div>
              )}

              {/* 3) 에러 */}
              {csvError && (
                <p className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
                  {csvError}
                </p>
              )}

              {/* 4) 결과 */}
              {csvResult && (
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-3">
                      <p className="text-xs text-green-700">등록 완료</p>
                      <p className="text-2xl font-bold text-green-700">{csvResult.created_count}명</p>
                    </div>
                    <div className="flex-1 bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-700">오류</p>
                      <p className="text-2xl font-bold text-red-700">{csvResult.error_count}건</p>
                    </div>
                  </div>

                  {csvResult.errors.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-1.5">오류 상세</p>
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
                        {csvResult.errors.map((err, i) => (
                          <div key={i} className="px-3 py-2 text-xs flex items-start gap-2">
                            <span className="font-mono text-gray-400 shrink-0">행 {err.row}</span>
                            {err.name && <span className="text-gray-600 shrink-0">· {err.name}</span>}
                            <span className="text-red-600 flex-1">{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {csvResult.created_count > 0 && (
                    <p className="text-xs text-gray-500">
                      입소자 목록이 자동으로 새로고침되었습니다.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              {csvResult ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCsvResult(null);
                      setCsvFile(null);
                      setCsvError(null);
                    }}
                    className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    추가 업로드
                  </button>
                  <button
                    type="button"
                    onClick={closeCsvModal}
                    className="px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90"
                  >
                    닫기
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={closeCsvModal}
                    disabled={csvUploading}
                    className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    onClick={handleCsvUpload}
                    disabled={!csvFile || csvUploading}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {csvUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    {csvUploading ? '업로드 중...' : '업로드'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ResidentsPage;
