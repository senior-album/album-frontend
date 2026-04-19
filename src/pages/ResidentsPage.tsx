import React, { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Camera, Loader2, UserPlus, Phone, Trash2, CheckCircle, XCircle, Image } from 'lucide-react';
import Layout from '../components/Layout';
import { apiClient } from '../utils/api';
import { Resident } from '../types';

interface FaceInfo {
  doc_id: string;
  photo_url: string | null;
  resident_id: string;
}

const ResidentsPage: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>([]);
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
  const [invitePhone, setInvitePhone] = useState('');
  const [inviteRelationship, setInviteRelationship] = useState('');
  const [inviteMessage, setInviteMessage] = useState('');
  const [inviteSending, setInviteSending] = useState(false);

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
      const response = await apiClient.getFacilityResidents(facilityId);
      setResidents(response.data);
      // 각 입소자의 기준 사진 수를 가져옴
      fetchFaceCounts(response.data);
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

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">입소자 관리</h1>
            <p className="text-gray-600 mt-1">총 {residents.length}명 ({activeResidents.length}명 활성)</p>
          </div>
          <button
            onClick={handleAddResident}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-soft"
          >
            <Plus size={20} />
            입소자 등록
          </button>
        </div>

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
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">입소자 목록 ({activeResidents.length})</h2>
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
                  {activeResidents.map((resident) => (
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
                if (!invitePhone.trim()) { alert('전화번호를 입력해주세요.'); return; }
                setInviteSending(true);
                try {
                  await apiClient.createInvitation({
                    resident_id: selectedResident.id,
                    phone: invitePhone.trim(),
                    relationship_type: inviteRelationship || undefined,
                    message: inviteMessage || undefined,
                  });
                  alert(`${invitePhone}로 초대를 보냈습니다.\n보호자가 가입 후 초대를 수락하면 사진을 열람할 수 있습니다.`);
                  setShowInviteModal(false);
                } catch (err: any) {
                  alert(err.response?.data?.detail || '초대에 실패했습니다.');
                } finally {
                  setInviteSending(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  보호자 전화번호 *
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="tel"
                    value={invitePhone}
                    onChange={(e) => setInvitePhone(e.target.value)}
                    placeholder="010-1234-5678"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">보호자가 가입 시 사용할 전화번호를 입력하세요</p>
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
    </Layout>
  );
};

export default ResidentsPage;
