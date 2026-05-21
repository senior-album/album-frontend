import React from 'react';
import type { PhotoFace } from '../types';

interface Props {
  faces: PhotoFace[] | undefined;
  // 원본 이미지 크기 (px) — bbox 좌표를 percentage 로 변환하는 데 필요. img onLoad
  // 에서 naturalWidth / naturalHeight 를 받아 전달.
  naturalWidth: number | null;
  naturalHeight: number | null;
  // 'thumbnail' = 그리드 섬네일 (라벨 짧게/생략), 'lightbox' = 라이트박스 (라벨 + confidence).
  variant?: 'thumbnail' | 'lightbox';
}

// T-324: 직원용 사진 위에 PhotoFace bbox + 입소자 이름 라벨을 오버레이한다.
//
// 좌표 처리:
// - bbox 좌표는 원본 이미지 px 기준. img 가 `naturalWidth/Height` 로 로드된 뒤
//   bbox 를 percentage 로 변환해 부모 wrapper 의 absolute 자식으로 배치.
// - 부모 wrapper 는 `position: relative` + `inset-0` overlay 라 img 크기 변경
//   (zoom, responsive) 에 자동 따라간다 — img 만 transform 되면 bbox 도 같이 transform.
//   (라이트박스에선 transform 이 img 에만 걸리므로 wrapper 안에서 같이 두면 OK.)
//
// 보호자 동선은 backend 가 faces=[] 로 응답하기 때문에 이 컴포넌트가 렌더링 자체를 안 함.
const FaceBboxOverlay: React.FC<Props> = ({ faces, naturalWidth, naturalHeight, variant = 'thumbnail' }) => {
  if (!faces || faces.length === 0) return null;
  if (!naturalWidth || !naturalHeight) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {faces.map((face) => {
        const left = (face.bbox_x1 / naturalWidth) * 100;
        const top = (face.bbox_y1 / naturalHeight) * 100;
        const width = ((face.bbox_x2 - face.bbox_x1) / naturalWidth) * 100;
        const height = ((face.bbox_y2 - face.bbox_y1) / naturalHeight) * 100;
        const labelText =
          face.resident_name
            ? variant === 'lightbox'
              ? `${face.resident_name} (${Math.round(face.confidence * 100)}%)`
              : face.resident_name
            : '미분류';
        // 매핑된 얼굴은 노란, 미분류는 회색 — 한눈 구분.
        const colorClass = face.resident_name
          ? 'border-yellow-400 bg-yellow-400/10'
          : 'border-gray-300 bg-gray-300/10';
        const labelClass = face.resident_name
          ? 'bg-yellow-400/90 text-gray-900'
          : 'bg-gray-700/80 text-white';
        return (
          <div
            key={face.id}
            className={`absolute border-2 ${colorClass}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            <span
              className={`absolute -top-5 left-0 text-[10px] sm:text-xs px-1 py-0.5 rounded ${labelClass} max-w-[120px] truncate font-medium`}
            >
              {labelText}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default FaceBboxOverlay;
