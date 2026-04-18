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
    const grouped = photos.reduce(
      (acc, photo) => {
        const date = new Date(photo.uploadedAt).toLocaleDateString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        });
        if (!acc[date]) {
          acc[date] = [];
        }
        acc[date].push(photo);
        return acc;
      },
      {} as Record<string, Photo[]>
    );
    return grouped;
  };

  const handlePhotoClick = (photo: Photo) => {
    setSelectedPhoto(photo);
    if (onPhotoClick) {
      onPhotoClick(photo);
    }
  };

  const photoMap = groupByDate ? groupPhotosByDate(photos) : null;

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
                  {groupPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => handlePhotoClick(photo)}
                      className="group cursor-pointer relative bg-white rounded-lg overflow-hidden shadow-soft hover:shadow-soft-lg transition"
                    >
                      <div className="aspect-square bg-gray-200 overflow-hidden">
                        <img
                          src={photo.thumbnail || photo.url}
                          alt={photo.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      </div>

                      {showClassification && (
                        <div className="absolute top-2 right-2">
                          {photo.classified ? (
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

                      {photo.residentNames && photo.residentNames.length > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white px-2 py-1 text-xs">
                          {photo.residentNames.join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => handlePhotoClick(photo)}
              className="group cursor-pointer relative bg-white rounded-lg overflow-hidden shadow-soft hover:shadow-soft-lg transition"
            >
              <div className="aspect-square bg-gray-200 overflow-hidden">
                <img
                  src={photo.thumbnail || photo.url}
                  alt={photo.fileName}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                />
              </div>

              {showClassification && (
                <div className="absolute top-2 right-2">
                  {photo.classified ? (
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

              {photo.residentNames && photo.residentNames.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white px-2 py-1 text-xs">
                  {photo.residentNames.join(', ')}
                </div>
              )}
            </div>
          ))}
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
              <h3 className="font-semibold text-gray-900">{selectedPhoto.fileName}</h3>
              <button
                onClick={() => setSelectedPhoto(null)}
                className="p-1 hover:bg-gray-100 rounded transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6">
              <img
                src={selectedPhoto.url}
                alt={selectedPhoto.fileName}
                className="w-full rounded-lg mb-4"
              />

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">파일명</p>
                  <p className="font-medium text-gray-900">{selectedPhoto.fileName}</p>
                </div>

                <div>
                  <p className="text-sm text-gray-600">촬영 일시</p>
                  <p className="font-medium text-gray-900">
                    {new Date(selectedPhoto.uploadedAt).toLocaleString('ko-KR')}
                  </p>
                </div>

                {selectedPhoto.residentNames && selectedPhoto.residentNames.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">분류된 입소자</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedPhoto.residentNames.map((name, idx) => (
                        <span
                          key={idx}
                          className="bg-primary text-white px-3 py-1 rounded-full text-sm"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {!selectedPhoto.classified && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-yellow-800 text-sm">
                      이 사진은 아직 분류되지 않았습니다. AI 분석이 진행 중입니다.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoGrid;
