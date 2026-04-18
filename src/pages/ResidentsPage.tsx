import React, { useState } from 'react';
import { Plus, Edit2, UserPlus, Trash2, Camera } from 'lucide-react';
import Layout from '../components/Layout';
import { mockResidents } from '../utils/mockData';
import { Resident } from '../types';

const ResidentsPage: React.FC = () => {
  const [residents, setResidents] = useState<Resident[]>(mockResidents);
  const [showModal, setShowModal] = useState(false);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dateOfBirth: '',
    admissionDate: '',
  });

  const handleAddResident = () => {
    setFormData({ name: '', dateOfBirth: '', admissionDate: '' });
    setSelectedResident(null);
    setShowModal(true);
  };

  const handleEditResident = (resident: Resident) => {
    setSelectedResident(resident);
    setFormData({
      name: resident.name,
      dateOfBirth: resident.dateOfBirth,
      admissionDate: resident.admissionDate,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedResident) {
      setResidents(
        residents.map((r) =>
          r.id === selectedResident.id
            ? {
                ...r,
                ...formData,
              }
            : r
        )
      );
    } else {
      const newResident: Resident = {
        id: `res-${Date.now()}`,
        facilityId: 'fac-001',
        ...formData,
        status: 'active',
      };
      setResidents([...residents, newResident]);
    }
    setShowModal(false);
  };

  const handleDeleteResident = (id: string) => {
    if (confirm('정말로 이 입소자를 삭제하시겠습니까?')) {
      setResidents(residents.filter((r) => r.id !== id));
    }
  };

  const getAge = (dateOfBirth: string) => {
    const birth = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const activeResidents = residents.filter((r) => r.status === 'active');
  const inactiveResidents = residents.filter((r) => r.status === 'inactive');

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

        {/* Active Residents */}
        <div className="bg-white rounded-lg shadow-soft overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-semibold text-gray-900">활성 입소자 ({activeResidents.length})</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">생년월일</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">입소일</th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">기준 사진</th>
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
                      {getAge(resident.dateOfBirth)}세
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(resident.dateOfBirth).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(resident.admissionDate).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => {
                          setSelectedResident(resident);
                          setShowFaceModal(true);
                        }}
                        className="flex items-center gap-2 text-secondary hover:text-primary transition"
                      >
                        <Camera size={18} />
                        <span>등록</span>
                      </button>
                    </td>
                    <td className="px-6 py-4 text-sm flex gap-2">
                      <button
                        onClick={() => handleEditResident(resident)}
                        className="text-blue-600 hover:text-blue-800 transition"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteResident(resident.id)}
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Inactive Residents */}
        {inactiveResidents.length > 0 && (
          <div className="bg-white rounded-lg shadow-soft overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-lg font-semibold text-gray-900">비활성 입소자 ({inactiveResidents.length})</h2>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">이름</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">나이</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">입소일</th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inactiveResidents.map((resident) => (
                    <tr key={resident.id} className="hover:bg-gray-50 transition opacity-60">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {resident.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {getAge(resident.dateOfBirth)}세
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(resident.admissionDate).toLocaleDateString('ko-KR')}
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

      {/* Resident Registration Modal */}
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
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  이름
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  생년월일
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  입소일
                </label>
                <input
                  type="date"
                  value={formData.admissionDate}
                  onChange={(e) => setFormData({ ...formData, admissionDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
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
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
                >
                  {selectedResident ? '수정' : '등록'}
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
          onClick={() => setShowFaceModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-md w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {selectedResident.name}님 기준 사진 등록
            </h2>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition cursor-pointer">
                <Camera className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="font-semibold text-gray-900 mb-1">
                  사진을 선택하거나 드래그하세요
                </p>
                <p className="text-sm text-gray-500">얼굴이 명확하게 나온 정면 사진을 권장합니다</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900">
                  <strong>팁:</strong> 밝고 명확한 얼굴 사진이 AI 분류의 정확도를 높입니다.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowFaceModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => setShowFaceModal(false)}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
                >
                  업로드
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ResidentsPage;
