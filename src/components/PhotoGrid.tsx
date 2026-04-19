import React, { useState } from 'react';
import { Photo } from '../types';
import { X, Tag } from 'lucide-react';

interface PhotoGridProps {
  photos: Photo[];
  onPhotoClick?: (photo: Photo) => void;
  showClassification?: boolean;
  groupByDate?: boolean;
}

const PhotoGrid: React.FC<PhotoGridProps> = ({
  photos,
  onPhotoClick,
  showClassification = true,
  groupByDate = false,
}) => {
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);

  const groupPhotosByDate = (photos: Photo[]) => {
    return photos.reduce((acc, photo) => {
      const date = new Date(photo.created_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      if (!acc[date]) acc[date] = [];
      acc[date].push(photo);
      return acc;
    }, {} as Record<string, Photo[]>);
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    onPhotoClick?.(photo);
  };

  const photoMap = groupByDate ? groupPhotosByDate(photos) : null;

  const renderPhoto = (photo: Photo) => (
    <div
      key={photo.id}
      onClick={() => handlePhotoClick(photo)}
      className="group cursor-pointer relative bg-white rounded-lg overflow-hidden shadow-soft hover:shadow-soft-lg transition"
    >
      <div className="aspect-square bg-gray-200 overflow-hidden">
        <img
          src={photo.thumbnail_url || photo.original_url}
          alt="Photo"
          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          onError={(e) => {
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" fill="%23e5e7eb"><rect width="200" height="200"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14">No Image</text></svg>';
          }}
        />
      </div>

      {showClassification && (
        <div className="absolute top-2 right-2">
          {photo.is_processed ? (
            <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
              <Tag size={12} />
              분류됨
            </div>
          ) : (
            <div className="bg-yellow-500 text-white px-2 py-1 rounded text-xs font-medium">
              미분류
            </div>
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      {groupByDate && photoMap ? (
        <div className="space-y-8">
          {Object.entries(photoMap)
            .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
            .map(([date, groupPhotos]) => (
              <div key={date}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
                  {date}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {groupPhotos.map(renderPhoto)}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map(renderPhoto)}
        </div>
      )}

      {/* Photo Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">사진 상세</h3>
              <button onClick={() => setSelectedPhoto(null)} className="p-1 hover:bg-gray-100 rounded transition">
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <img
                src={selectedPhoto.original_url}
                alt="Photo detail"
                className="w-full rounded-lg mb-4"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23e5e7eb"><rect width="400" height="300"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16">Image not available</text></svg>';
                }}
              />

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">업로드 일시</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedPhoto.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">분류 상태</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    selectedPhoto.is_processed
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {selectedPhoto.is_processed ? '분류 완료' : '미분류 (AI 분석 대기)'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGrid;
