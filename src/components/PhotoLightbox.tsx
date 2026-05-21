import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Minus, Plus, RotateCcw, X } from 'lucide-react';
import type { PhotoFace } from '../types';
import FaceBboxOverlay from './FaceBboxOverlay';

export interface LightboxPhoto {
  id: string;
  original_url: string;
  thumbnail_url: string | null;
  resident_name?: string | null;
  created_at: string;
  // T-324: 직원 동선 — 사진 위에 얼굴 bbox + 입소자 이름 라벨 오버레이.
  faces?: PhotoFace[];
}

interface PhotoLightboxProps {
  photos: LightboxPhoto[];
  index: number | null;
  onClose: () => void;
  onIndexChange: (newIndex: number) => void;
  // T-313: 사진 관리 페이지에서 라이트박스 우측(데스크탑) / 하단(모바일) 에
  // 태그 편집 패널을 끼워 넣기 위한 slot. 보호자 갤러리는 전달 안 함.
  sidebar?: React.ReactNode;
}

const ZOOM_STEP = 1.5;
const ZOOM_MIN = 1;
const ZOOM_MAX = 6;

const PhotoLightbox: React.FC<PhotoLightboxProps> = ({ photos, index, onClose, onIndexChange, sidebar }) => {
  const isOpen = index !== null && index >= 0 && index < photos.length;
  const photo = isOpen ? photos[index] : null;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [loaded, setLoaded] = useState(false);
  // T-324: bbox 좌표 정규화를 위한 원본 px 사이즈.
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  // 휠 한 번 굴림에 한 사진씩만 넘어가도록 throttle (트랙패드는 이벤트가 수십 번 폭발)
  const lastWheelRef = useRef(0);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setLoaded(false);
    setNaturalSize(null);
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

  const onWheel = useCallback((e: React.WheelEvent) => {
    const now = Date.now();
    if (now - lastWheelRef.current < 250) return;
    if (Math.abs(e.deltaY) < 5) return;
    lastWheelRef.current = now;
    if (e.deltaY > 0) goNext();
    else goPrev();
  }, [goNext, goPrev]);

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

  // T-313: sidebar 가 있으면 데스크탑은 좌우 분할 (이미지 + 사이드바),
  // 모바일은 상하 분할 (이미지 위 / 사이드바 아래) 로 레이아웃 전환.
  // 사이드바 없으면 기존 풀스크린 중앙 정렬 유지.
  const hasSidebar = Boolean(sidebar);

  return (
    <div
      className={`fixed inset-0 z-50 bg-black bg-opacity-90 select-none ${
        hasSidebar
          ? 'flex flex-col md:flex-row'
          : 'flex items-center justify-center'
      }`}
      onClick={onClose}
      onWheel={onWheel}
      role="dialog"
      aria-modal="true"
      aria-label="사진 확대보기"
    >
      {/* 이미지/툴바 영역 — sidebar 가 있으면 flex 자식, 없으면 부모 통째로 사용 */}
      <div
        className={
          hasSidebar
            ? 'relative flex-1 min-h-0 flex items-center justify-center overflow-hidden'
            : 'contents'
        }
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
        {/* T-324: img + FaceBboxOverlay 를 같은 wrapper 에 두고 transform 을
            wrapper 에 걸어 zoom/pan 시 bbox 도 같이 움직이게 한다. inline-block 으로
            wrapper 가 img 의 실제 렌더 사이즈를 따라가 bbox `inset-0` overlay 가 정확히
            덮음. */}
        <div
          className="relative inline-block transition-opacity duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            opacity: loaded ? 1 : 0,
          }}
        >
          <img
            key={photo.id}
            src={photo.original_url}
            alt={photo.resident_name || '사진'}
            draggable={false}
            onLoad={(e) => {
              setLoaded(true);
              const el = e.currentTarget;
              setNaturalSize({ w: el.naturalWidth, h: el.naturalHeight });
            }}
            onError={() => setLoaded(true)}
            className={`block object-contain ${
              hasSidebar
                ? 'max-w-full max-h-[50vh] md:max-h-[88vh]'
                : 'max-w-[95vw] max-h-[88vh]'
            }`}
          />
          <FaceBboxOverlay
            faces={photo.faces}
            naturalWidth={naturalSize?.w ?? null}
            naturalHeight={naturalSize?.h ?? null}
            variant="lightbox"
          />
        </div>
      </div>

      {/* 하단 도움말 (데스크톱만) */}
      <div
        className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white text-xs opacity-50 hidden sm:block"
        onClick={(e) => e.stopPropagation()}
      >
        ← → · 휠 이동 · + − 확대/축소 · 0 원래크기 · ESC 닫기
      </div>
      </div>

      {/* T-313: 사이드바 — 데스크탑은 우측 360px, 모바일은 하단 50vh.
          자체 스크롤. 라이트박스 dim 클릭 닫힘과 충돌하지 않게 stopPropagation. */}
      {hasSidebar && (
        <div
          className="bg-white md:w-[360px] md:flex-none w-full flex-1 min-h-0 overflow-y-auto md:max-h-screen border-t md:border-t-0 md:border-l border-gray-200"
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
        >
          {sidebar}
        </div>
      )}
    </div>
  );
};

export default PhotoLightbox;
