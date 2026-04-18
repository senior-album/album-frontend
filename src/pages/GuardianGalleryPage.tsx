import React, { useState } from 'react';
import { Heart, Share2, Download, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { mockGuardianPhotos, mockResidents } from '../utils/mockData';
import PhotoGrid from '../components/PhotoGrid';
import { Photo } from '../types';

const GuardianGalleryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [photos, setPhotos] = useState<Photo[]>(mockGuardianPhotos);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const toggleFavorite = (photoId: string) => {
    setFavorites((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(photoId)) {
        newSet.delete(photoId);
      } else {
        newSet.add(photoId);
      }
      return newSet;
    });
  };

  const sortedPhotos = [...photos].sort((a, b) => {
    const dateA = new Date(a.uploadedAt).getTime();
    const dateB = new Date(b.uploadedAt).getTime();
    return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
  });

  // Get resident name from mock data
  const residentName = mockResidents.find((r) => r.id === 'res-001')?.name || '어머니';

  return (
    <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white shadow-soft">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-gray-100 rounded-lg transition"
              >
                <ChevronLeft size={24} className="text-primary" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-primary">
                  {residentName}님 갤러리
                </h1>
                <p className="text-sm text-gray-600">{photos.length}개의 소중한 순간</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user?.name}</p>
              </div>
              <div className="w-10 h-10 bg-guardian-brown rounded-full flex items-center justify-center text-white font-bold">
                {user?.name?.[0] || 'G'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-2xl shadow-soft p-6 border-l-4 border-guardian-brown">
            <p className="text-guardian-brown text-sm font-semibold mb-2">총 사진</p>
            <p className="text-4xl font-bold text-gray-900">{photos.length}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-6 border-l-4 border-guardian-brown">
            <p className="text-guardian-brown text-sm font-semibold mb-2">즐겨찾기</p>
            <p className="text-4xl font-bold text-gray-900">{favorites.size}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-6 border-l-4 border-guardian-brown">
            <p className="text-guardian-brown text-sm font-semibold mb-2">최신 업로드</p>
            <p className="text-lg font-semibold text-gray-900">
              {photos.length > 0
                ? new Date(photos[0].uploadedAt).toLocaleDateString('ko-KR')
                : '없음'}
            </p>
          </div>
        </div>

        {/* Filter and Sort */}
        <div className="bg-white rounded-2xl shadow-soft p-6 mb-8">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-900">사진 갤러리</h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-guardian-brown"
            >
              <option value="newest">최신순</option>
              <option value="oldest">오래된순</option>
            </select>
          </div>
        </div>

        {/* Photos Grid with Enhanced Layout */}
        <div className="space-y-12">
          {(() => {
            const grouped = sortedPhotos.reduce(
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

            return Object.entries(grouped).map(([date, groupPhotos]) => (
              <div key={date}>
                <div className="mb-6 pb-4 border-b-2 border-guardian-brown border-opacity-20">
                  <h3 className="text-lg font-semibold text-primary">{date}</h3>
                  <p className="text-sm text-gray-600">{groupPhotos.length}개의 사진</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {groupPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="group relative bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-lg transition transform hover:scale-105"
                    >
                      <div className="aspect-square bg-gray-200 overflow-hidden relative">
                        <img
                          src={photo.url}
                          alt={photo.fileName}
                          className="w-full h-full object-cover"
                        />

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center gap-3">
                          <button
                            onClick={() => toggleFavorite(photo.id)}
                            className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-3 hover:bg-red-50 transform hover:scale-110"
                          >
                            <Heart
                              size={24}
                              className={
                                favorites.has(photo.id)
                                  ? 'text-red-500 fill-red-500'
                                  : 'text-gray-600'
                              }
                            />
                          </button>
                          <button className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-3 hover:bg-blue-50 transform hover:scale-110">
                            <Share2 size={24} className="text-blue-600" />
                          </button>
                          <button className="opacity-0 group-hover:opacity-100 transition bg-white rounded-full p-3 hover:bg-green-50 transform hover:scale-110">
                            <Download size={24} className="text-green-600" />
                          </button>
                        </div>
                      </div>

                      {/* Photo Info */}
                      <div className="p-4">
                        <p className="text-sm text-gray-600">
                          {new Date(photo.uploadedAt).toLocaleTimeString('ko-KR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                        {photo.residentNames.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {photo.residentNames.map((name, idx) => (
                              <span
                                key={idx}
                                className="inline-block bg-guardian-brown bg-opacity-20 text-guardian-brown px-2 py-1 rounded text-xs font-medium"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ));
          })()}
        </div>

        {/* Empty State */}
        {photos.length === 0 && (
          <div className="text-center py-16">
            <div className="inline-block p-6 bg-guardian-cream rounded-2xl mb-4">
              <Heart size={48} className="text-guardian-brown opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              아직 공유된 사진이 없습니다
            </h3>
            <p className="text-gray-600">
              요양원에서 찍은 {residentName}님의 사진이 공유되면 여기에 나타납니다.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-primary text-white py-8 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-sm opacity-80">
            © 2024 Senior Album. 소중한 순간을 함께 나눕니다.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default GuardianGalleryPage;
