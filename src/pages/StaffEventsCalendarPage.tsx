import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import EventsCalendar from '../components/EventsCalendar';
import { apiClient } from '../utils/api';
import type { Resident } from '../types';

const StaffEventsCalendarPage: React.FC = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId: string | undefined = user.facility_id || facility.id;

  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId) {
      setLoading(false);
      setError('시설 정보를 찾을 수 없습니다.');
      return;
    }
    apiClient
      .getFacilityResidents(facilityId, { limit: 500 })
      .then((res) => setResidents(res.data as Resident[]))
      .catch(() => setError('입소자 목록을 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [facilityId]);

  return (
    <Layout>
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">이벤트 캘린더</h1>
        <p className="text-sm text-gray-600 mt-1">
          시설 단위 일정 (생신·외출·기타) 을 등록하고 관리합니다.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : facilityId ? (
        <EventsCalendar facilityId={facilityId} mode="edit" residents={residents} />
      ) : null}
    </Layout>
  );
};

export default StaffEventsCalendarPage;
