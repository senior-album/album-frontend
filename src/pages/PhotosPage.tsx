import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Filter, Loader2, Image, Heart, Share2, Link2, Copy, X, Eye, EyeOff, CheckSquare, Square, Tag, Plus, UserPlus, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import PhotoUploader from '../components/PhotoUploader';
import PhotoLightbox, { LightboxPhoto } from '../components/PhotoLightbox';
import { apiClient } from '../utils/api';
import { Photo, Resident } from '../types';

// T-031: 미처리 = detected_unmatched | no_model | no_face (pending/queued 는 진행 중, classified/completed 는 성공이라 제외)
const UNPROCESSED_STATUSES: ReadonlyArray<string> = ['detected_unmatched', 'no_model', 'no_face'];
type PhotoFilter = 'all' | 'classified' | 'unclassified' | 'unprocessed';

// 페이지네이션 — 초기 100장, "더 보기" 마다 100장씩 추가.
// 백엔드는 skip/limit 지원, 응답이 PAGE_SIZE 미만이면 끝 도달로 판정.
const PAGE_SIZE = 100;

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
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [shareModal, setShareModal] = useState<{ photoId: string; url: string } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // T-313: 라이트박스 + 사이드바 태그 패널. lightboxIndex 는 filteredPhotos 의 인덱스.
  // photos 갱신 시 사이드바도 자동 최신화 (currentPhoto = filteredPhotos[lightboxIndex] 로 lookup).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [tagLoading, setTagLoading] = useState(false);

  // 페이지네이션 상태
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // refresh 시점에 현재 로드된 개수만큼 다시 가져와 페이징 상태 유지하기 위한 ref.
  // photos.length 를 fetchData useCallback deps 에 넣으면 photos 변경마다
  // fetchData 가 재생성돼 useEffect 가 무한 호출됨 — ref 로 우회.
  const photosCountRef = useRef(0);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user.facility_id || facility.id;

  const fetchData = useCallback(async () => {
    if (!facilityId) {
      setLoading(false);
      return;
    }
    try {
      // 사용자가 "더 보기" 로 N 장을 로드했으면 refresh 시에도 N 장 다시 가져와
      // 페이징 상태 유지 (auto-refresh 가 paged 데이터를 날리지 않도록).
      const refreshLimit = Math.max(photosCountRef.current, PAGE_SIZE);
      const [photosRes, residentsRes] = await Promise.all([
        apiClient.getFacilityPhotos(facilityId, { skip: 0, limit: refreshLimit }),
        apiClient.getFacilityResidents(facilityId),
      ]);
      const list = Array.isArray(photosRes.data) ? photosRes.data : [];
      setPhotos(list);
      setResidents(Array.isArray(residentsRes.data) ? residentsRes.data : []);
      // 응답이 가득 차서 왔으면 그 다음이 있을 가능성 — 더 보기 버튼 노출.
      setHasMore(list.length === refreshLimit);
    } catch (err: any) {
      console.error('[PhotosPage] Failed to fetch data:', err?.response?.status, err?.response?.data, err);
    } finally {
      setLoading(false);
    }
  }, [facilityId]);

  // photos 길이를 ref 에 동기화 — fetchData 가 deps 없이 최신 값 참조 가능.
  useEffect(() => {
    photosCountRef.current = photos.length;
  }, [photos.length]);

  const loadMore = async () => {
    if (loadingMore || !hasMore || !facilityId) return;
    setLoadingMore(true);
    try {
      const res = await apiClient.getFacilityPhotos(facilityId, {
        skip: photos.length,
        limit: PAGE_SIZE,
      });
      const next = Array.isArray(res.data) ? res.data : [];
      setPhotos((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err: any) {
      console.error('[PhotosPage] loadMore failed:', err?.response?.status, err);
    } finally {
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  // T-140: PhotoUploader 컴포넌트가 모바일 카메라/갤러리 분리 + 데스크탑 드래그앤드롭을
  // 통합 처리. 여기서는 실제 업로드 호출만 책임.
  // T-308: chunk 분할 (apiClient.uploadPhotos) — 30장+ 한 요청은 nginx 50M 초과로 413.
  // T-312: AbortController 로 진행 중 chunk 즉시 abort. cancelled 분기 안내 메시지.
  const uploadAbortRef = useRef<AbortController | null>(null);

  const doUpload = async (files: File[]) => {
    if (files.length === 0 || !facilityId) return;
    const controller = new AbortController();
    uploadAbortRef.current = controller;
    setIsUploading(true);
    setUploadProgress({ done: 0, total: files.length });
    try {
      const { uploadedCount, failed, skipped, cancelled } = await apiClient.uploadPhotos(
        facilityId,
        files,
        (done, total) => setUploadProgress({ done, total }),
        controller.signal,
      );
      if (cancelled) {
        alert(`업로드를 취소했습니다. ${uploadedCount}장 업로드 완료, ${skipped.length}장 건너뜀.`);
      } else if (failed.length > 0) {
        alert(`${uploadedCount}장 업로드 성공, ${failed.length}장 실패. 잠시 후 다시 시도해주세요.`);
      }
      await fetchData();
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed');
    } finally {
      uploadAbortRef.current = null;
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const cancelUpload = () => {
    uploadAbortRef.current?.abort();
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

  const openLightbox = (photo: Photo) => {
    if (selectMode) return;
    const idx = filteredPhotos.findIndex((p) => p.id === photo.id);
    if (idx >= 0) setLightboxIndex(idx);
  };

  const handleAddTag = async (photoId: string, residentId: string) => {
    setTagLoading(true);
    try {
      await apiClient.addPhotoTag(photoId, residentId);
      await fetchData();
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
      setLightboxIndex(null);
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

  // T-313: 라이트박스용 매핑 — filteredPhotos 변경 시에만 재계산.
  const lightboxPhotos: LightboxPhoto[] = useMemo(
    () =>
      filteredPhotos.map((p) => ({
        id: p.id,
        original_url: p.original_url,
        thumbnail_url: p.thumbnail_url ?? null,
        resident_name: p.matched_residents?.[0]?.resident_name ?? null,
        created_at: p.created_at,
      })),
    [filteredPhotos],
  );

  // 라이트박스가 가리키는 현재 사진 — photos 가 갱신되면 자동으로 최신.
  const currentLightboxPhoto =
    lightboxIndex !== null ? filteredPhotos[lightboxIndex] ?? null : null;

  // 인덱스가 filteredPhotos 길이를 벗어나면 (filter 변경, 사진 삭제 등) 닫음.
  useEffect(() => {
    if (lightboxIndex !== null && lightboxIndex >= filteredPhotos.length) {
      setLightboxIndex(null);
    }
  }, [filteredPhotos.length, lightboxIndex]);

  return (
    <Layout>
      <div className="space-y-6 sm:space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">사진 관리</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            총 {statsData.total}개 (분류됨: {statsData.classified}, 미분류: {statsData.unclassified})
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">사진 업로드</h2>
          <PhotoUploader
            onUpload={doUpload}
            isLoading={isUploading}
            progress={uploadProgress}
            onCancel={cancelUpload}
          />
        </div>

        <div className="bg-white rounded-lg shadow-soft p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">필터</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">분류 상태</label>
              <div className="flex flex-wrap gap-2">
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

        <div className="bg-white rounded-lg shadow-soft p-4 sm:p-6">
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

          {/* 선택 모드 액션바 — 모바일은 세로 stack, sm+ 에서 가로 */}
          {selectMode && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800 transition"
                >
                  {selectedIds.size === filteredPhotos.length ? '전체 해제' : '전체 선택'}
                </button>
                <span className="text-sm text-gray-500">{selectedIds.size}개 선택됨</span>
              </div>
              <div className="sm:ml-auto flex flex-wrap gap-2">
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
                        onClick={() => selectMode ? toggleSelect(photo.id) : openLightbox(photo)}
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
                        {/* T-140: 모바일은 항상 보이게 (호버 없음), md+ 는 호버 시 노출 */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleTogglePublish(photo.id); }}
                          className={`absolute top-2 right-2 z-10 p-1 rounded-full backdrop-blur-sm transition ${
                            photo.is_public
                              ? 'bg-green-500/80 text-white'
                              : 'bg-gray-500/60 text-white'
                          } opacity-100 md:opacity-0 md:group-hover:opacity-100`}
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
                        {/* 좋아요/공유 버튼 — T-140: 모바일은 항상 보이게, md+ 는 호버 시 */}
                        {!selectMode && (
                          <div className="absolute top-8 right-2 p-0 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition">
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

              {/* 더 보기 — 백엔드에 추가 페이지가 남아있을 때만 노출 */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="inline-flex items-center gap-2 px-6 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        불러오는 중...
                      </>
                    ) : (
                      <>더 보기 (현재 {photos.length}장)</>
                    )}
                  </button>
                </div>
              )}
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

      {/* T-313: 사진 관리 라이트박스 + 우측 사이드바 (모바일은 하단) — 좌우 키/ESC/줌/스크롤은 라이트박스 기본 동작 */}
      <PhotoLightbox
        photos={lightboxPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onIndexChange={setLightboxIndex}
        sidebar={
          currentLightboxPhoto && (
            <div className="p-5 space-y-4">
              {/* 현재 태그 */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1.5">
                  <Tag size={14} />
                  현재 분류된 입소자
                </h4>
                {(() => {
                  const currentTags = currentLightboxPhoto.matched_residents || [];
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
                            onClick={() => handleRemoveTag(currentLightboxPhoto.id, mr.resident_id)}
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
                  const currentTags = currentLightboxPhoto.matched_residents || [];
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
                          onClick={() => handleAddTag(currentLightboxPhoto.id, r.id)}
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

              {/* 공개/비공개 토글 + 사진 상태 */}
              <div className="pt-3 border-t space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">공개 여부</span>
                  <button
                    onClick={() => handleTogglePublish(currentLightboxPhoto.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition ${
                      currentLightboxPhoto.is_public
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {currentLightboxPhoto.is_public ? (
                      <>
                        <Eye size={14} />
                        공개 (클릭하여 비공개)
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} />
                        비공개 (클릭하여 공개)
                      </>
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-400">
                  상태: {currentLightboxPhoto.is_processed ? '분류됨' : '미분류'} ·{' '}
                  {new Date(currentLightboxPhoto.created_at).toLocaleString('ko-KR')}
                </div>
              </div>

              {/* 삭제 */}
              <div className="pt-2 border-t">
                <button
                  onClick={() => handleDeletePhoto(currentLightboxPhoto.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition"
                >
                  <Trash2 size={14} />
                  사진 삭제
                </button>
              </div>
            </div>
          )
        }
      />
    </Layout>
  );
};

export default PhotosPage;
