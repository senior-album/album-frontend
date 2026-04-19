import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, Loader2, Image } from 'lucide-react';
import { apiClient } from '../utils/api';

interface SharedPhoto {
  photo_id: string;
  original_url: string;
  thumbnail_url?: string;
  matched_residents: { resident_name: string }[];
  like_count: number;
  created_at: string;
}

const SharedPhotoPage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [photo, setPhoto] = useState<SharedPhoto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!shareToken) return;
    apiClient
      .getSharedPhoto(shareToken)
      .then((res) => setPhoto(res.data))
      .catch(() => setError('공유 링크가 유효하지 않거나 만료되었습니다.'))
      .finally(() => setLoading(false));
  }, [shareToken]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={40} />
      </div>
    );
  }

  if (error || !photo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <Image className="text-gray-300 mb-4" size={64} />
        <p className="text-gray-600 text-lg">{error || '사진을 찾을 수 없습니다.'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-lg mx-auto py-8 px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <img
            src={photo.original_url}
            alt="shared"
            className="w-full"
          />
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Heart size={18} fill="currentColor" className="text-red-400" />
                <span className="text-sm text-gray-600">{photo.like_count}명이 좋아합니다</span>
              </div>
              <span className="text-xs text-gray-400">
                {new Date(photo.created_at).toLocaleDateString('ko-KR')}
              </span>
            </div>
            {photo.matched_residents.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {photo.matched_residents.map((mr, i) => (
                  <span
                    key={i}
                    className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
                  >
                    {mr.resident_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="text-center mt-6">
          <p className="text-sm text-gray-400">시니어앨범에서 공유된 사진입니다</p>
        </div>
      </div>
    </div>
  );
};

export default SharedPhotoPage;
