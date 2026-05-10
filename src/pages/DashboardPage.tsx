import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  Users,
  Image as ImageIcon,
  CheckCircle,
  Upload,
  Copy,
  Check,
  Loader2,
  UserPlus,
  UserX,
  ImageOff,
  AlertTriangle,
  ChevronRight,
  Settings,
} from 'lucide-react';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface DashboardStats {
  totalPhotos: number;
  photosToday: number;
  totalResidents: number;
  classifiedPhotos: number;
  classificationRate: number;
  facilityName: string;
  facilityCode: string;
  // T-031: 시설장 조치 항목
  invitations?: { pending: number; accepted: number; rejected: number };
  residentsWithoutGuardian?: { count: number; topNames: string[] };
  photosUnprocessed?: number;
  residentsWithoutFace?: { count: number; topNames: string[] };
}

const formatPreview = (names: string[] | undefined, total: number | undefined): string => {
  if (!names || names.length === 0) return '';
  const joined = names.join(', ');
  const remaining = Math.max(0, (total ?? names.length) - names.length);
  return remaining > 0 ? `${joined} 외 ${remaining}명` : joined;
};

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user?.facility_id || facility.id;
  const facilityName = stats?.facilityName || facility.name || '시설 이름';
  const facilityCode = stats?.facilityCode || facility.code || '';

  const fetchStats = useCallback(async () => {
    if (!facilityId) { setLoading(false); return; }
    try {
      const response = await apiClient.getFacilityStats(facilityId);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(facilityCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const onClickUploadArea = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || !facilityId) return;
    setIsUploading(true);
    setUploadProgress({ done: 0, total: selectedFiles.length });
    try {
      const { uploadedCount, failed } = await apiClient.uploadPhotos(
        facilityId,
        selectedFiles,
        (done, total) => setUploadProgress({ done, total }),
      );
      if (failed.length > 0) {
        alert(`${uploadedCount}장 업로드 성공, ${failed.length}장 실패. 잠시 후 다시 시도해주세요.`);
        // 실패한 사진은 selectedFiles 에 남겨 사용자가 재시도 / 제거 가능.
        setSelectedFiles(failed);
      } else {
        setSelectedFiles([]);
        setShowUploadModal(false);
      }
      await fetchStats();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const openModal = () => {
    setSelectedFiles([]);
    setShowUploadModal(true);
  };

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">대시보드</h1>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1">
              <p className="text-sm sm:text-base text-gray-600 truncate">{facilityName}</p>
              {facilityCode && (
                <React.Fragment>
                  <span className="text-gray-300 hidden sm:inline">|</span>
                  <div className="flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-md">
                    <span className="text-xs text-gray-500">시설코드:</span>
                    <code className="text-xs font-mono font-bold text-blue-600">{facilityCode}</code>
                    <button onClick={handleCopyCode} className="text-gray-400 hover:text-blue-600 transition ml-0.5" title="코드 복사">
                      {codeCopied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                    </button>
                  </div>
                </React.Fragment>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {user?.is_operator && (
              <>
                <button
                  onClick={() => navigate('/admin/stats')}
                  className="flex items-center gap-1.5 bg-blue-600 text-white px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 transition shadow-sm"
                  title="운영자 — 통계 대시보드 (홈)"
                >
                  <Settings size={16} />
                  운영자 홈
                </button>
                <button
                  onClick={() => navigate('/admin/users')}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition shadow-sm"
                  title="운영자 — 전체 유저 관리"
                >
                  <Settings size={16} />
                  유저 관리
                </button>
                <button
                  onClick={() => navigate('/admin/facilities')}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition shadow-sm"
                  title="운영자 — 전체 시설 관리"
                >
                  <Settings size={16} />
                  시설 관리
                </button>
                <button
                  onClick={() => navigate('/admin/guardians')}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition shadow-sm"
                  title="운영자 — 보호자 승인 현황 (전체 시설 across)"
                >
                  <Settings size={16} />
                  보호자 승인
                </button>
                <button
                  onClick={() => navigate('/admin/photo-jobs')}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition shadow-sm"
                  title="운영자 — 사진 처리 큐 모니터링"
                >
                  <Settings size={16} />
                  사진 처리
                </button>
                <button
                  onClick={() => navigate('/admin/legal-settings')}
                  className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 sm:px-4 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-medium hover:bg-gray-50 transition shadow-sm"
                  title="운영자 — 회사 정보 / 약관 본문 편집"
                >
                  <Settings size={16} />
                  법령 설정
                </button>
              </>
            )}
            <button
              onClick={openModal}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-blue-700 transition shadow-md"
            >
              <Upload size={20} />
              사진 업로드
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-500">통계 로딩 중...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard icon={ImageIcon} label="오늘 업로드" value={stats?.photosToday ?? 0} subtext={`총 ${stats?.totalPhotos ?? 0}개 사진`} color="blue" />
            <StatsCard icon={Users} label="총 입소자 수" value={stats?.totalResidents ?? 0} subtext="활성 상태" color="green" />
            <StatsCard icon={CheckCircle} label="분류 완료" value={stats?.classifiedPhotos ?? 0} subtext={`${stats?.classificationRate ?? 0}% 완료율`} color="purple" />
            <StatsCard icon={TrendingUp} label="분류율" value={`${stats?.classificationRate ?? 0}%`} subtext="AI 자동 분류" color="orange" />
          </div>
        )}

        {!loading && stats && stats.totalPhotos === 0 && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <Upload className="mx-auto text-gray-300 mb-4" size={64} />
            <h2 className="text-xl font-bold text-gray-900 mb-2">아직 업로드된 사진이 없습니다</h2>
            <p className="text-gray-500 mb-6">사진 업로드 버튼을 눌러 첫 사진을 업로드해보세요!</p>
            <button
              onClick={openModal}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              첫 사진 업로드하기
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">총 사진</h3>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalPhotos ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">활성 입소자</h3>
            <p className="text-3xl font-bold text-gray-900">{stats?.totalResidents ?? 0}</p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">분류 완료</h3>
            <p className="text-3xl font-bold text-gray-900">{stats?.classifiedPhotos ?? 0}</p>
          </div>
        </div>

        {/* T-031: 조치 필요 섹션 */}
        {!loading && stats && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">조치 필요</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* 1) 보호자 초대 현황 */}
              <button
                type="button"
                onClick={() => navigate('/guardians')}
                className="text-left bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 hover:shadow-lg transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                    <UserPlus size={20} />
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-2">보호자 초대 현황</h3>
                <div className="flex items-end gap-3 text-sm">
                  <div>
                    <div className="text-2xl font-bold text-yellow-600">{stats.invitations?.pending ?? 0}</div>
                    <div className="text-xs text-gray-500">대기</div>
                  </div>
                  <div className="text-gray-300">·</div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.invitations?.accepted ?? 0}</div>
                    <div className="text-xs text-gray-500">수락</div>
                  </div>
                  <div className="text-gray-300">·</div>
                  <div>
                    <div className="text-2xl font-bold text-gray-400">{stats.invitations?.rejected ?? 0}</div>
                    <div className="text-xs text-gray-500">거부</div>
                  </div>
                </div>
              </button>

              {/* 2) 미연결 어르신 */}
              <button
                type="button"
                onClick={() => navigate('/residents?filter=no-guardian')}
                className="text-left bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500 hover:shadow-lg transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-600">
                    <UserX size={20} />
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">미연결 어르신</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.residentsWithoutGuardian?.count ?? 0}명</p>
                <p className="text-xs text-gray-500 truncate" title={formatPreview(stats.residentsWithoutGuardian?.topNames, stats.residentsWithoutGuardian?.count)}>
                  {(stats.residentsWithoutGuardian?.count ?? 0) === 0
                    ? '모두 보호자 연결됨'
                    : formatPreview(stats.residentsWithoutGuardian?.topNames, stats.residentsWithoutGuardian?.count)}
                </p>
              </button>

              {/* 3) 미처리 사진 */}
              <button
                type="button"
                onClick={() => navigate('/photos?filter=unprocessed')}
                className="text-left bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500 hover:shadow-lg transition group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="p-2 rounded-lg bg-purple-100 text-purple-600">
                    <ImageOff size={20} />
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">미처리 사진</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.photosUnprocessed ?? 0}장</p>
                <p className="text-xs text-gray-500">
                  {(stats.photosUnprocessed ?? 0) === 0 ? '모두 처리됨' : '수동 태그 또는 기준 얼굴 재등록 필요'}
                </p>
              </button>

              {/* 4) 얼굴 미등록 경고 */}
              <button
                type="button"
                onClick={() => navigate('/residents?filter=no-face')}
                className={`text-left bg-white rounded-lg shadow-md p-6 border-l-4 ${
                  (stats.residentsWithoutFace?.count ?? 0) > 0 ? 'border-red-500' : 'border-green-500'
                } hover:shadow-lg transition group`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className={`p-2 rounded-lg ${
                    (stats.residentsWithoutFace?.count ?? 0) > 0
                      ? 'bg-red-100 text-red-600'
                      : 'bg-green-100 text-green-600'
                  }`}>
                    {(stats.residentsWithoutFace?.count ?? 0) > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-500 transition" />
                </div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">얼굴 미등록 어르신</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stats.residentsWithoutFace?.count ?? 0}명</p>
                <p className="text-xs text-gray-500 truncate" title={formatPreview(stats.residentsWithoutFace?.topNames, stats.residentsWithoutFace?.count)}>
                  {(stats.residentsWithoutFace?.count ?? 0) === 0
                    ? '모두 기준 얼굴 등록 완료'
                    : formatPreview(stats.residentsWithoutFace?.topNames, stats.residentsWithoutFace?.count)}
                </p>
              </button>
            </div>
          </div>
        )}
      </div>

      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => !isUploading && setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">사진 업로드</h2>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                handleFileSelect(e.target.files);
                if (e.target) e.target.value = '';
              }}
            />

            <div
              role="button"
              tabIndex={0}
              onClick={onClickUploadArea}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragOver(false);
                handleFileSelect(e.dataTransfer.files);
              }}
              style={{ cursor: 'pointer' }}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition mb-4 ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
              }`}
            >
              <Upload className="mx-auto text-gray-400 mb-2" size={48} />
              <p className="font-semibold text-gray-900 mb-1">
                여기를 클릭하거나 이미지를 드래그해서 업로드
              </p>
              <p className="text-sm text-gray-500">JPG, PNG 등 이미지 형식 지원 (다중 선택 가능)</p>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm font-semibold text-gray-700">선택된 파일 ({selectedFiles.length}개)</p>
                  <button onClick={() => setSelectedFiles([])} className="text-xs text-red-500 hover:text-red-700">
                    모두 제거
                  </button>
                </div>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="relative aspect-square bg-gray-100 rounded overflow-hidden group">
                      <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition"
                      >
                        x
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                disabled={isUploading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition disabled:opacity-50"
              >
                취소
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading || selectedFiles.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isUploading ? (
                  <React.Fragment>
                    <Loader2 className="animate-spin" size={18} />
                    <span>
                      {uploadProgress
                        ? `업로드 중... (${uploadProgress.done} / ${uploadProgress.total})`
                        : '업로드 중...'}
                    </span>
                  </React.Fragment>
                ) : (
                  <span>{selectedFiles.length > 0 ? selectedFiles.length + '개 ' : ''}업로드</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DashboardPage;
