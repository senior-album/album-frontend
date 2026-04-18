import React, { useState } from 'react';
import { Filter, Download } from 'lucide-react';
import Layout from '../components/Layout';
import PhotoGrid from '../components/PhotoGrid';
import PhotoUploader from '../components/PhotoUploader';
import { mockPhotos, mockResidents } from '../utils/mockData';
import { Photo } from '../types';

const PhotosPage: React.FC = () => {
  const [photos, setPhotos] = useState<Photo[]>(mockPhotos);
  const [filterBy, setFilterBy] = useState<'all' | 'classified' | 'unclassified'>('all');
  const [selectedResident, setSelectedResident] = useState<string>('all');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Mock: Add new photos
      const newPhotos = files.map((file, index) => ({
        id: `photo-${Date.now()}-${index}`,
        facilityId: 'fac-001',
        fileName: file.name,
        url: URL.createObjectURL(file),
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'staff-001',
        residentIds: [],
        residentNames: [],
        classified: false,
      }));

      setPhotos((prev) => [...newPhotos, ...prev]);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Filter photos
  const filteredPhotos = photos.filter((photo) => {
    let passes = true;

    if (filterBy === 'classified') {
      passes = photo.classified;
    } else if (filterBy === 'unclassified') {
      passes = !photo.classified;
    }

    if (selectedResident !== 'all') {
      passes = passes && photo.residentIds.includes(selectedResident);
    }

    return passes;
  });

  const stats = {
    total: photos.length,
    classified: photos.filter((p) => p.classified).length,
    unclassified: photos.filter((p) => !p.classified).length,
  };

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">사진 관리</h1>
            <p className="text-gray-600 mt-1">
              총 {stats.total}개 (분류됨: {stats.classified}, 미분류: {stats.unclassified})
            </p>
          </div>
          <button className="flex items-center gap-2 bg-gray-200 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300 transition">
            <Download size={20} />
            다운로드
          </button>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-soft p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">사진 업로드</h2>
          <PhotoUploader
            onUpload={handleUpload}
            isLoading={isUploading}
          />
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-soft p-6">
          <div className="flex items-center gap-3 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h3 className="font-semibold text-gray-900">필터</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Classification Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                분류 상태
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setFilterBy('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterBy === 'all'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  모두
                </button>
                <button
                  onClick={() => setFilterBy('classified')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterBy === 'classified'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  분류됨
                </button>
                <button
                  onClick={() => setFilterBy('unclassified')}
                  className={`px-4 py-2 rounded-lg font-medium transition ${
                    filterBy === 'unclassified'
                      ? 'bg-primary text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  미분류
                </button>
              </div>
            </div>

            {/* Resident Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                입소자
              </label>
              <select
                value={selectedResident}
                onChange={(e) => setSelectedResident(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">모든 입소자</option>
                {mockResidents.filter((r) => r.status === 'active').map((resident) => (
                  <option key={resident.id} value={resident.id}>
                    {resident.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Photos Grid */}
        <div className="bg-white rounded-lg shadow-soft p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-6">
            {filteredPhotos.length}개 사진
          </h3>

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">필터 조건에 맞는 사진이 없습니다.</p>
            </div>
          ) : (
            <PhotoGrid
              photos={filteredPhotos}
              showClassification={true}
              groupByDate={true}
            />
          )}
        </div>
      </div>
    </Layout>
  );
};

export default PhotosPage;
