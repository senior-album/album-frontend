import React, { useState } from 'react';
import { TrendingUp, Users, Image, CheckCircle, Upload } from 'lucide-react';
import Layout from '../components/Layout';
import StatsCard from '../components/StatsCard';
import PhotoGrid from '../components/PhotoGrid';
import { mockStatsData, mockPhotos } from '../utils/mockData';
import { Photo } from '../types';

const DashboardPage: React.FC = () => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const stats = mockStatsData;
  const recentPhotos = mockPhotos.slice(0, 10);

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
            <p className="text-gray-600 mt-1">서울 행복 요양원</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:opacity-90 transition shadow-soft"
          >
            <Upload size={20} />
            사진 업로드
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Image}
            label="오늘 업로드"
            value={stats.photosToday}
            subtext={`총 ${stats.totalPhotos}개 사진`}
            color="blue"
          />
          <StatsCard
            icon={Users}
            label="총 입소자 수"
            value={stats.totalResidents}
            subtext="활성 상태"
            color="green"
          />
          <StatsCard
            icon={CheckCircle}
            label="분류 완료"
            value={stats.classifiedPhotos}
            subtext={`${stats.classificationRate}% 완료율`}
            color="purple"
          />
          <StatsCard
            icon={TrendingUp}
            label="분류율"
            value={`${stats.classificationRate}%`}
            subtext="AI 자동 분류"
            color="orange"
          />
        </div>

        {/* Recent Photos Section */}
        <div className="bg-white rounded-lg shadow-soft p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-900">최근 업로드된 사진</h2>
            <button className="text-primary hover:underline text-sm font-medium">
              모두 보기
            </button>
          </div>

          <PhotoGrid
            photos={recentPhotos}
            showClassification={true}
            groupByDate={false}
          />
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-soft p-6 border-l-4 border-blue-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">금주 업로드</h3>
            <p className="text-3xl font-bold text-gray-900">42</p>
            <p className="text-xs text-gray-500 mt-2">지난주 대비 8% 증가</p>
          </div>
          <div className="bg-white rounded-lg shadow-soft p-6 border-l-4 border-green-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">미분류 사진</h3>
            <p className="text-3xl font-bold text-gray-900">35</p>
            <p className="text-xs text-gray-500 mt-2">AI 분류 진행 중</p>
          </div>
          <div className="bg-white rounded-lg shadow-soft p-6 border-l-4 border-orange-500">
            <h3 className="text-gray-600 text-sm font-medium mb-2">활성 입소자</h3>
            <p className="text-3xl font-bold text-gray-900">5</p>
            <p className="text-xs text-gray-500 mt-2">1명 퇴실</p>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowUploadModal(false)}
        >
          <div
            className="bg-white rounded-lg max-w-2xl w-full p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold text-gray-900 mb-6">사진 업로드</h2>

            <div className="space-y-4 mb-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary transition cursor-pointer">
                <Upload className="mx-auto text-gray-400 mb-2" size={48} />
                <p className="font-semibold text-gray-900 mb-1">
                  이미지를 드래그하거나 클릭하여 업로드
                </p>
                <p className="text-sm text-gray-500">JPG, PNG, GIF 등 모든 이미지 형식 지원</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
              >
                취소
              </button>
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition"
              >
                업로드
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default DashboardPage;
