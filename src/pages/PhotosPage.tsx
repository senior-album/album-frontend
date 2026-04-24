import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Upload, Loader2, Image, Heart, Share2, Link2, Copy, X, Eye, EyeOff, CheckSquare, Square, Tag, Plus, UserPlus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import { apiClient } from '../utils/api';
import { Photo, Resident } from '../types';

// T-031: 미처리 = detected_unmatched | no_model | no_face (pending/queued 는 진행 중, classified/completed 는 성공이라 제외)
const UNPROCESSED_STATUSES: ReadonlyArray<string> = ['detected_unmatched', 'no_model', 'no_face'];
type PhotoFilter = 'all' | 'classified' | 'unclassified' | 'unprocessed';

const PhotosPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlFilter = searchParams.get('filter');
  const initialFilter: PhotoFilter =
    urlFilter === 'classified' || urlFilter === 'unclassified' || urlFilter === 'unprocessed'
      ? urlFilter
      : 'all';

  const [photos, setPhotos] = useState<Photo[]>([]);
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterBy, setFilterBy] = useState<PhotoFilter>(initialFilter);
  const [selectedResident, setSelectedResident] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [shareModal, setShareModal] = useState<{ photoId: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [tagModal, setTagModal] = useState<Photo | null>(null);
  const [tagLoading, setTagLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user.facility_id || facility.id;

  const fetchData = useCallback(async () => {
    if (!facilityId) {
      setLoading(false);
      return;
    }
    try {
      const [photosRes, residentsRes] = await Promise.all([
        apiClient.getFacilityPhotos(facilityId),
        apiClient.getFacilityResidents(facilityId),
      ]);
      setPhotos(Array.isArray(photosRes.data) ? photosRes.data : []);
      setResidents(Array.isArray(residentsRes.data) ? residentsRes.data : []);
    } catch (err: any) {
      console.error('[PhotosPage] Failed to fetch data:', err?.response?.status, err?.response?.data, err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // tagModal이 열려있을 때 photos 갱신되면 모달도 갱신
  useEffect(() => {
    if (tagModal) {
      const updated = photos.find((p) => p.id === tagModal.id);
      if (updated) setTagModal(updated);
    }
  }, [photos]);

  // 처리 중인 사진이 있으면 자동 새로고침
  useEffect(() => {
    const hasQueued = photos.some(
      (p) => p.processing_status === 'queued' || p.processing_status === 'pending'
    );
    if (!hasQueued) return;

    const interval = setInterval(() => {
      fetchData();
    }, 3000);
    return () => clearInterval(interval);
  }, [photos, fetchData]);

  const doUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !facilityId) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i]);
      }
      await apiClient.uploadPhoto(facilityId, formData);
      await fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const onClickUploadArea = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    doUpload(e.target.files);
  };

  const onDragOverHandler = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const onDragLeaveHandler = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const onDropHandler = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    doUpload(e.dataTransfer.files);
  };

  const handleLike = async (photoId: string) => {
    try {
      const res = await apiClient.toggleLike(photoId);
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId
            ? { ...p, liked_by_me: res.data.liked, like_count: res.data.like_count }
            : p
        )
      );
    } catch (err) {
      console.error('Like failed:', err);
    }
  };

  const handleShare = async (photoId: string) => {
    try {
      const res = await apiClient.createShareLink(photoId);
      setShareModal({ photoId, url: res.data.share_url });
      setCopiedLink(false);
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  const copyShareLink = () => {
    if (shareModal) {
      navigator.clipboard.writeText(shareModal.url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const shareToKakao = () => {
    if (!shareModal) return;
    // 카카오톡 공유 (Kakao SDK 필요, 없으면 모바일 공유 URL)
    if ((window as any).Kakao?.Share) {
      (window as any).Kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title: '시니어앨범 사진',
          description: '사진이 공유되었습니다',
          imageUrl: '',
          link: { mobileWebUrl: shareModal.url, webUrl: shareModal.url },
        },
        buttons: [
          { title: '사진 보기', link: { mobileWebUrl: shareModal.url, webUrl: shareModal.url } },
        ],
      });
    } else {
      // Kakao SDK 미설치 시 URL 복사 fallback
      copyShareLink();
      alert('링크가 복사되었습니다. 카카오톡에 붙여넣기해서 공유하세요!');
    }
  };

  const toggleSelect = (photoId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(photoId)) next.delete(photoId);
      else next.add(photoId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map((p) => p.id)));
    }
  };

  const handleBulkPublish = async (isPublic: boolean) => {
    if (selectedIds.size === 0) return;
    try {
      await apiClient.bulkPublish(Array.from(selectedIds), isPublic);
      setPhotos((prev) =>
        prev.map((p) =>
          selectedIds.has(p.id) ? { ...p, is_public: isPublic } : p
        )
      );
      setSelectedIds(new Set());
      setSelectMode(false);
      alert(`${selectedIds.size}개 사진이 ${isPublic ? '공개' : '비공개'} 처리되었습니다.`);
    } catch (err) {
      console.error('Bulk publish failed:', err);
      alert('처리 중 오류가 발생했습니다.');
    }
  };

  const openTagModal = (photo: Photo) => {
    if (!selectMode) setTagModal(photo);
  };

  const handleAddTag = async (photoId: string, residentId: string) => {
    setTagLoading(true);
    try {
      await apiClient.addPhotoTag(photoId, residentId);
      await fetchData();
      // 모달 사진 정보도 갱신
      const updated = photos.find((p) => p.id === photoId);
      if (updated) {
        // fetchData로 갱신되니 tagModal도 갱신
        setTagModal((prev) => {
          if (!prev || prev.id !== photoId) return prev;
          return { ...prev }; // re-render trigger
        });
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '태그 추가 실패';
      alert(msg);
    } finally {
      setTagLoading(false);
    }
  };

  const handleRemoveTag = async (photoId: string, residentId: string) => {
    setTagLoading(true);
    try {
      await apiClient.removePhotoTag(photoId, residentId);
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || '태그 제거 실패';
      alert(msg);
    } finally {
      setTagLoading(false);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('이 사진을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.')) return;
    try {
      await apiClient.deletePhoto(photoId);
      setTagModal(null);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
    } catch (err) {
      console.error('Delete failed:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`선택한 ${selectedIds.size}장의 사진을 삭제하시겠습니까? 삭제 후 복구할 수 없습니다.`)) return;
    try {
      await apiClient.bulkDeletePhotos(Array.from(selectedIds));
      setPhotos((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      setSelectMode(false);
      alert(`${selectedIds.size}장의 사진이 삭제되었습니다.`);
    } catch (err) {
      console.error('Bulk delete failed:', err);
      alert('삭제 중 오류가 발생했습니다.');
    }
  };

  const handleTogglePublish = async (photoId: string) => {
    try {
      const res = await apiClient.togglePublish(photoId);
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, is_public: res.data.is_public } : p))
      );
    } catch (err) {
      console.error('Toggle publish failed:', err);
    }
  };

  // T-031: URL param 과 filter state 동기화
  const applyFilter = (next: PhotoFilter) => {
    setFilterBy(next);
    const sp = new URLSearchParams(searchParams);
    if (next === 'all') sp.delete('filter');
    else sp.set('filter', next);
    setSearchParams(sp, { replace: true });
  };

  const filteredPhotos = photos.filter((photo) => {
    let passes = true;
    if (filterBy === 'classified') passes = photo.is_processed;
    else if (filterBy === 'unclassified') passes = !photo.is_processed;
    else if (filterBy === 'unprocessed') {
      // 미처리 = AI 가 "안 한" 게 아니라 "실패 상태". 진행 중/성공 은 제외.
      passes = UNPROCESSED_STATUSES.includes((photo as any).processing_status);
    }
    if (selectedResident !== 'all') {
      // 다대다: matched_residents에 해당 입소자가 포함되어 있거나, 기존 resident_id 일치
      const inMatched = photo.matched_residents?.some(
        (mr) => mr.resident_id === selectedResident
      );
      passes = passes && (inMatched || photo.resident_id === selectedResident);
    }
    return passes;
  });

  const statsData = {
    total: photos.length,
    classified: photos.filter((p) => p.is_processed).length,
    unclassified: photos.filter((p) => !p.is_processed).length,
  };

  const groupedPhotos = filteredPhotos.reduce((acc, photo) => {
    const date = new Date(photo.created_at).toLocaleDateString('ko-KR');
    if (!acc[date]) acc[date] = [];
    acc[date].push(photo);
    return acc;
  }, {} as Record<string, Photo[]>);

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사진 관리</h1>
            <p className="text-gray-600 mt-1">
              총 {statsData.total}개 (분류됨: {statsData.classified}, 미분류: {statsData.unclassified})
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">사진 업로드</h2>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onFileInputChange}
          />

          <div
            role="button"
            tabIndex={0}
            onClick={onClickUploadArea}
            onDragOver={onDragOverHandler}
            onDragLeave={onDragLeaveHandler}
            onDrop={onDropHandler}
            style={{ cursor: 'pointer' }}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition ${
              dragOver
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center justify-center gap-3">
                <Loader2 className="animate-spin text-blue-500" size={32} />
                <p className="font-semibold text-gray-700">업로드 중...</p>
              </div>
            ) : (
              <div>
                <Upload className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="font-semibold text-gray-900 mb-1">
                  여기를 클릭하거나 이미지를 드래그해서 업로드
                </p>
                <p className="text-sm text-gray-500">JPG, PNG 등 이미지 형식 지원 (다중 선택 가능)</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">필터</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">분류 상태</label>
              <div className="flex gap-2">
                {([
                  { key: 'all' as const, label: '모두' },
                  { key: 'classified' as const, label: '분류됨' },
                  { key: 'unclassified' as const, label: '미분류' },
                  { key: 'unprocessed' as const, label: '미처리' },
                ]).map((f) => (
                  <button
                    key={f.key}
                    onClick={() => applyFilter(f.key)}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      filterBy === f.key
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">입소자</label>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">모든 입소자</option>
                {residents.filter((r) => r.is_active).map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">
              {filteredPhotos.length}개 사진
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  selectMode
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <CheckSquare size={16} />
                {selectMode ? '선택 해제' : '선택 모드'}
              </button>
            </div>
          </div>

          {/* 선택 모드 액션바 */}
          {selectMode && (
            <div className="flex items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <button
                onClick={selectAll}
                className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
              >
                {selectedIds.size === filteredPhotos.length ? '전체 해제' : '전체 선택'}
              </button>
              <span className="text-sm text-gray-500">{selectedIds.size}개 선택됨</span>
              <div className="ml-auto flex gap-2">
                <button
                  onClick={() => handleBulkPublish(true)}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 text-white text-sm font-medium rounded-lg hover:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Eye size={14} />
                  공개 처리
                </button>
                <button
                  onClick={() => handleBulkPublish(false)}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500 text-white text-sm font-medium rounded-lg hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <EyeOff size={14} />
                  비공개 처리
                </button>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-blue-500" size={32} />
              <span className="ml-3 text-gray-500">사진 로딩 중...</span>
            </div>
          ) : filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <Image className="mx-auto text-gray-300 mb-4" size={64} />
              <p className="text-gray-600">
                {photos.length === 0 ? '아직 업로드된 사진이 없습니다.' : '필터 조건에 맞는 사진이 없습니다.'}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedPhotos).map(([date, groupPhotos]) => (
                <div key={date}>
                  <h4 className="text-sm font-semibold text-gray-500 mb-4 border-b pb-2">{date}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {groupPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        onClick={() => selectMode ? toggleSelect(photo.id) : openTagModal(photo)}
                        className={`group relative bg-gray-100 rounded-lg overflow-hidden aspect-square hover:shadow-lg transition cursor-pointer ${
                          selectMode && selectedIds.has(photo.id) ? 'ring-3 ring-blue-500' : ''
                        }`}
                      >
                        <img
                          src={photo.thumbnail_url || photo.original_url}
                          alt="uploaded"
                          className="w-full h-full object-cover"
                        />
                        {/* 선택 모드 체크박스 */}
                        {selectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            {selectedIds.has(photo.id) ? (
                              <CheckSquare size={22} className="text-blue-500 drop-shadow" />
                            ) : (
                              <Square size={22} className="text-white drop-shadow" />
                            )}
                          </div>
                        )}
                        {/* 공개/비공개 표시 + 토글 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePublish(photo.id); }}
                          className={`absolute top-2 right-2 z-10 p-1 rounded-full backdrop-blur-sm transition ${
                            photo.is_public
                              ? 'bg-green-500/80 text-white'
                              : 'bg-gray-500/60 text-white'
                          } opacity-0 group-hover:opacity-100`}
                          title={photo.is_public ? '공개 (클릭하여 비공개)' : '비공개 (클릭하여 공개)'}
                        >
                          {photo.is_public ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        {/* 비공개 표시 배지 (항상 보임) */}
                        {!photo.is_public && !selectMode && (
                          <div className="absolute top-2 left-2 z-10">
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs font-medium bg-gray-800/70 text-gray-200 backdrop-blur-sm">
                              <EyeOff size={10} />
                              비공개
                            </span>
                          </div>
                        )}
                        {/* 좋아요/공유 버튼 (호버 시, 선택 모드가 아닐때) */}
                        {!selectMode && (
                          <div className="absolute top-8 right-2 p-0 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleLike(photo.id); }}
                              className={`p-1.5 rounded-full backdrop-blur-sm transition ${
                                photo.liked_by_me
                                  ? 'bg-red-500 text-white'
                                  : 'bg-black/40 text-white hover:bg-red-500'
                              }`}
                            >
                              <Heart size={14} fill={photo.liked_by_me ? 'currentColor' : 'none'} />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleShare(photo.id); }}
                              className="p-1.5 rounded-full bg-black/40 text-white hover:bg-blue-500 backdrop-blur-sm transition"
                            >
                              <Share2 size={14} />
                            </button>
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          {photo.matched_residents && photo.matched_residents.length > 0 && (
                            <div className="mb-1">
                              {photo.matched_residents.map((mr) => (
                                <span
                                  key={mr.resident_id}
                                  className="inline-block px-1.5 py-0.5 rounded text-xs font-medium bg-blue-500 text-white mr-1 mb-0.5"
                                >
                                  {mr.resident_name || '이름없음'}
                                </span>
                              ))}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                              photo.processing_status === 'queued' || photo.processing_status === 'pending'
                                ? 'bg-blue-500 text-white animate-pulse'
                                : photo.is_processed
                                  ? 'bg-green-500 text-white'
                                  : 'bg-yellow-500 text-white'
                            }`}>
                              {photo.processing_status === 'queued' || photo.processing_status === 'pending'
                                ? '처리 중...'
                                : photo.is_processed
                                  ? `분류됨 (${photo.matched_residents?.length || (photo.resident_id ? 1 : 0)}명)`
                                  : '미분류'}
                            </span>
                            {(photo.like_count ?? 0) > 0 && (
                              <span className="flex items-center gap-0.5 text-white text-xs">
                                <Heart size={12} fill="currentColor" className="text-red-400" />
                                {photo.like_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 공유 모달 */}
      {shareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShareModal(null)}>
          <div className="bg-white rounded-xl p-6 w-80 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">사진 공유</h3>
              <button onClick={() => setShareModal(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <button
                onClick={shareToKakao}
                className="w-full flex items-center gap-3 px-4 py-3 bg-yellow-300 hover:bg-yellow-400 rounded-lg transition font-medium text-gray-900"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3C6.48 3 2 6.58 2 10.94c0 2.8 1.86 5.27 4.66 6.67l-1.2 4.39 5.08-3.35c.48.05.97.08 1.46.08 5.52 0 10-3.58 10-7.94S17.52 3 12 3z"/>
                </svg>
                카카오톡으로 공유
              </button>
              <button
                onClick={copyShareLink}
                className="w-full flex items-center gap-3 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg transition font-medium text-gray-700"
              >
                {copiedLink ? <Copy size={20} className="text-green-500" /> : <Link2 size={20} />}
                {copiedLink ? '복사됨!' : '링크 복사'}
              </button>
              <p className="text-xs text-gray-400 text-center mt-2 break-all">{shareModal.url}</p>
            </div>
          </div>
        </div>
      )}

      {/* 태그 수정 모달 */}
      {tagModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setTagModal(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 사진 미리보기 */}
            <div className="relative bg-gray-900">
              <img
                src={tagModal.original_url || tagModal.thumbnail_url}
                alt="photo"
                className="w-full max-h-72 object-contain"
              />
              <button
                onClick={() => setTagModal(null)}
                className="absolute top-3 right-3 p-1.5 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* 현재 태그 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Tag size={14} />
                  현재 분류된 입소자
                </h4>
                {(() => {
                  // photos state에서 최신 정보 가져오기
                  const currentPhoto = photos.find((p) => p.id === tagModal.id);
                  const currentTags = currentPhoto?.matched_residents || tagModal.matched_residents || [];

                  if (currentTags.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 py-2">
                        분류된 입소자가 없습니다. 아래에서 입소자를 선택하여 태그하세요.
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      {currentTags.map((mr) => (
                        <span
                          key={mr.resident_id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                        >
                          {mr.resident_name || '이름없음'}
                          {mr.confidence != null && mr.confidence < 1.0 && (
                            <span className="text-xs text-blue-500">
                              ({Math.round((mr.confidence || 0) * 100)}%)
                            </span>
                          )}
                          <button
                            onClick={() => handleRemoveTag(tagModal.id, mr.resident_id)}
                            disabled={tagLoading}
                            className="ml-0.5 p-0.5 rounded-full hover:bg-blue-200 transition disabled:opacity-50"
                            title="태그 제거"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 입소자 추가 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <UserPlus size={14} />
                  입소자 태그 추가
                </h4>
                {(() => {
                  const currentPhoto = photos.find((p) => p.id === tagModal.id);
                  const currentTags = currentPhoto?.matched_residents || tagModal.matched_residents || [];
                  const taggedIds = new Set(currentTags.map((mr) => mr.resident_id));
                  const availableResidents = residents.filter(
                    (r) => r.is_active && !taggedIds.has(r.id)
                  );

                  if (availableResidents.length === 0) {
                    return (
                      <p className="text-sm text-gray-400 py-1">
                        추가 가능한 입소자가 없습니다.
                      </p>
                    );
                  }

                  return (
                    <div className="flex flex-wrap gap-2">
                      {availableResidents.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => handleAddTag(tagModal.id, r.id)}
                          disabled={tagLoading}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-gray-100 text-gray-700 hover:bg-green-100 hover:text-green-800 transition disabled:opacity-50"
                        >
                          <Plus size={12} />
                          {r.name}
                        </button>
                      ))}
                    </div>
                  );
                })()}
              </div>

              {/* 사진 상태 + 삭제 */}
              <div className="pt-3 border-t flex items-center justify-between">
                <div className="text-xs text-gray-400">
                  <span>
                    상태: {tagModal.is_processed ? '분류됨' : '미분류'} ·{' '}
                    {tagModal.is_public ? '공개' : '비공개'}
                  </span>
                  <span className="ml-2">{new Date(tagModal.created_at).toLocaleString('ko-KR')}</span>
                </div>
                <button
                  onClick={() => handleDeletePhoto(tagModal.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={14} />
                  삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default PhotosPage;
