import React, { useRef, useState } from 'react';
import { Upload, FileIcon, X } from 'lucide-react';

interface PhotoUploaderProps {
  onUpload: (files: File[]) => Promise<void>;
  isLoading?: boolean;
}

const PhotoUploader: React.FC<PhotoUploaderProps> = ({ onUpload, isLoading = false }) => {
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
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

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    );

    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter((file) => file.type.startsWith('image/'));
      setSelectedFiles((prev) => [...prev, ...files]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    try {
      await onUpload(selectedFiles);
      setSelectedFiles([]);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Drag and Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
          dragOver
            ? 'border-primary bg-blue-50'
            : 'border-gray-300 bg-gray-50 hover:border-primary'
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
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="font-semibold text-gray-900">
              선택된 파일 ({selectedFiles.length})
            </h4>
            <button
              onClick={() => setSelectedFiles([])}
              className="text-sm text-gray-600 hover:text-red-600 transition"
            >
              모두 제거
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="relative bg-white border border-gray-200 rounded-lg overflow-hidden group"
              >
                <div className="aspect-square bg-gray-100 flex items-center justify-center">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleRemoveFile(index);
                  }}
                  className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                >
                  <X size={16} />
                </button>
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white px-2 py-1 text-xs truncate">
                  {file.name}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleUpload}
            disabled={isLoading || selectedFiles.length === 0}
            className="w-full bg-primary text-white py-3 rounded-lg font-medium hover:bg-primary hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '업로드 중...' : `${selectedFiles.length}개 사진 업로드`}
          </button>
        </div>
      )}
    </div>
  );
};

export default PhotoUploader;
