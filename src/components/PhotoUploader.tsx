import React, { useRef, useState } from 'react';
import { Upload, Loader2, Camera, ImageIcon } from 'lucide-react';

interface PhotoUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isLoading?: boolean;
  // T-308: 호출자가 chunk 분할 업로드 진행률 (처리한 파일 수 / 전체) 을 넘겨주면
  // dropzone 라벨에 "(n / N)" 형태로 노출.
  progress?: { done: number; total: number } | null;
}

// T-310: 선택 즉시 업로드. 업로드된 사진은 어차피 is_public=false 비공개라
// 별도 확정 단계 (selectedFiles 미리보기 + "N개 사진 업로드" 버튼) 가 마찰만 발생.
// drop / file input 변경 시 곧장 onUpload 호출하고, 진행률은 dropzone 자체에 표시.
const PhotoUploader: React.FC<PhotoUploaderProps> = ({
  onUpload,
  isLoading = false,
  progress,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // T-140: 모바일에서 카메라 우선 / 갤러리 선택 분리. capture 속성은 input 단독 분기.
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const triggerUpload = (files: File[]) => {
    if (files.length === 0 || isLoading) return;
    void onUpload(files);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (isLoading) return;
    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );
    triggerUpload(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) => file.type.startsWith('image/'));
      // 같은 파일 재선택 가능하도록 input 초기화
      e.target.value = '';
      triggerUpload(files);
    }
  };

  const progressLabel = progress
    ? `업로드 중... (${progress.done} / ${progress.total})`
    : '업로드 중...';

  return (
    <div className="space-y-4">
      {/* 모바일: 카메라 / 갤러리 두 버튼 (md 미만) */}
      <div className="md:hidden grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          disabled={isLoading}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-primary text-white rounded-lg hover:opacity-90 active:opacity-80 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Camera size={28} />
          <span className="font-medium">사진 촬영</span>
        </button>
        <button
          type="button"
          onClick={() => galleryInputRef.current?.click()}
          disabled={isLoading}
          className="flex flex-col items-center justify-center gap-2 p-4 bg-white border-2 border-primary text-primary rounded-lg hover:bg-blue-50 active:bg-blue-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ImageIcon size={28} />
          <span className="font-medium">갤러리에서 선택</span>
        </button>
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={galleryInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* 데스크탑: 드래그 앤 드롭 영역 (md 이상) */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`hidden md:block border-2 border-dashed rounded-lg p-8 text-center transition ${
          isLoading
            ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
            : dragOver
              ? 'border-primary bg-blue-50 cursor-pointer'
              : 'border-gray-300 bg-gray-50 hover:border-primary cursor-pointer'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="flex flex-col items-center">
          {isLoading ? (
            <React.Fragment>
              <div className="p-4 rounded-full mb-4 bg-primary">
                <Loader2 size={32} className="text-white animate-spin" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{progressLabel}</h3>
              <p className="text-sm text-gray-500">잠시만 기다려주세요</p>
            </React.Fragment>
          ) : (
            <React.Fragment>
              <div className={`p-4 rounded-full mb-4 ${dragOver ? 'bg-primary' : 'bg-gray-200'}`}>
                <Upload
                  size={32}
                  className={dragOver ? 'text-white' : 'text-gray-600'}
                />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                이미지를 여기로 드래그하거나 클릭하여 업로드
              </h3>
              <p className="text-sm text-gray-500">JPG, PNG, GIF 등 모든 이미지 형식 지원</p>
            </React.Fragment>
          )}
        </div>
      </div>

      {/* 모바일: 업로드 진행 중 표시 (카메라/갤러리 버튼 아래) */}
      {isLoading && (
        <div className="md:hidden flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-lg">
          <Loader2 size={20} className="text-primary animate-spin" />
          <span className="font-medium text-gray-700">{progressLabel}</span>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
