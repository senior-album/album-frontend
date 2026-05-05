import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react';

export interface LightboxPhoto {
  id: string;
  original_url: string;
  thumbnail_url: string | null;
  resident_name?: string | null;
  created_at: string;
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (newIndex: number) => void;
}

const ZOOM_STEP = 1.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, index, onClose, onIndexChange }) => {
  const isOpen = index !== null && index >= 0 && index < photos.length;
  const photo = isOpen ? photos[index] : null;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);

  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoaded(false);
  }, []);

  // 인덱스가 바뀌면 줌/팬 초기화 + 이미지 로딩 상태 리셋
  useEffect(() => {
    resetView();
  }, [index, resetView]);

  const goPrev = useCallback(() => {
    if (index === null) return;
    if (index > 0) onIndexChange(index - 1);
  }, [index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index === null) return;
    if (index < photos.length - 1) onIndexChange(index + 1);
  }, [index, onIndexChange, photos.length]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(ZOOM_MAX, z * ZOOM_STEP)), []);
  const zoomOut = useCallback(() => {
    setZoom((z) => {
      const next = Math.max(ZOOM_MIN, z / ZOOM_STEP);
      if (next === ZOOM_MIN) setPan({ x: 0, y: 0 });
      return next;
    });
  }, []);
  const zoomReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // 키보드 단축키 (열려 있을 때만)
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        zoomReset();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, goPrev, goNext, onClose, zoomIn, zoomOut, zoomReset]);

  // 줌 상태에서만 드래그 팬 활성
  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (zoom <= 1) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: pan.x, baseY: pan.y };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    const { startX, startY, baseX, baseY } = dragRef.current;
    setPan({ x: baseX + (e.clientX - startX), y: baseY + (e.clientY - startY) });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      // pointer 가 이미 release 된 경우 무시
    }
  };

  if (!isOpen || !photo) return null;

  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;
  const canZoomIn = zoom < ZOOM_MAX;
  const canZoomOut = zoom > ZOOM_MIN;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-90 flex items-center justify-center select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="사진 확대보기"
    >
      {/* 상단 툴바 */}
      <div
        className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 py-3 text-white z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm opacity-80">
          {index + 1} / {photos.length}
          {photo.resident_name && <span className="ml-3 font-medium">{photo.resident_name}</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={zoomOut}
            disabled={!canZoomOut}
            aria-label="축소"
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Minus size={20} />
          </button>
          <span className="text-xs w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            onClick={zoomIn}
            disabled={!canZoomIn}
            aria-label="확대"
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus size={20} />
          </button>
          <button
            type="button"
            onClick={zoomReset}
            disabled={zoom === 1 && pan.x === 0 && pan.y === 0}
            aria-label="원래 크기"
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <RotateCcw size={20} />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="p-2 rounded-full hover:bg-white hover:bg-opacity-10 ml-2"
          >
            <X size={22} />
          </button>
        </div>
      </div>

      {/* 좌측 이전 버튼 */}
      {hasPrev && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goPrev();
          }}
          aria-label="이전 사진"
          className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white"
        >
          <ChevronLeft size={28} />
        </button>
      )}

      {/* 우측 다음 버튼 */}
      {hasNext && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            goNext();
          }}
          aria-label="다음 사진"
          className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 p-2 sm:p-3 rounded-full bg-white bg-opacity-10 hover:bg-opacity-20 text-white"
        >
          <ChevronRight size={28} />
        </button>
      )}

      {/* 이미지 영역 — 클릭은 닫기로 전파되지 않게 막고, 줌 상태에선 드래그로 팬 */}
      <div
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{ cursor: zoom > 1 ? (dragRef.current ? 'grabbing' : 'grab') : 'default' }}
      >
        {!loaded && (
          <Loader2 className="absolute animate-spin text-white opacity-70" size={48} />
        )}
        <img
          key={photo.id}
          src={photo.original_url}
          alt={photo.resident_name || '사진'}
          draggable={false}
          onLoad={() => setLoaded(true)}
          onError={() => setLoaded(true)}
          className="max-w-[95vw] max-h-[88vh] object-contain transition-opacity duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            opacity: loaded ? 1 : 0,
          }}
        />
      </div>

      {/* 하단 도움말 (데스크톱만) */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-xs opacity-50 hidden sm:block"
        onClick={(e) => e.stopPropagation()}
      >
        ← → 이동 · + − 확대/축소 · 0 원래크기 · ESC 닫기
      </div>
    </div>
  );
};

export default PhotoLightbox;
