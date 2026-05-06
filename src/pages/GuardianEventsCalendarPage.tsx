import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import EventsCalendar from '../components/EventsCalendar';
import { apiClient } from '../utils/api';

interface FacilityGroup {
  facility_id: string;
  facility_name: string;
}

const GuardianEventsCalendarPage: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const facilityIdParam = params.get('facility_id');

  const [facilities, setFacilities] = useState<FacilityGroup[]>([]);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>(facilityIdParam || '');
  const [facilityName, setFacilityName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiClient
      .getGuardianStatus()
      .then((res) => {
        const data = (res.data as {
          guardianships?: {
            facility_id: string;
            facility_name: string;
            is_approved: boolean;
          }[];
        }).guardianships ?? [];
        // 승인된 가디언십만 표시.
        const approved = data.filter((g) => g.is_approved);
        // facility_id 단위로 dedup.
        const seen = new Set<string>();
        const groups: FacilityGroup[] = [];
        approved.forEach((g) => {
          if (!seen.has(g.facility_id)) {
            seen.add(g.facility_id);
            groups.push({
              facility_id: g.facility_id,
              facility_name: g.facility_name,
            });
          }
        });
        setFacilities(groups);
        if (!selectedFacilityId && groups.length > 0) {
          setSelectedFacilityId(groups[0].facility_id);
        }
      })
      .catch(() => setError('시설 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedFacilityId) {
      const f = facilities.find((g) => g.facility_id === selectedFacilityId);
      setFacilityName(f?.facility_name || '');
    }
  }, [selectedFacilityId, facilities]);

  return (
    <Layout isSidebarHidden>
      <div className="mb-4">
        <button
          onClick={() => navigate('/guardian/mypage')}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft size={16} />
          마이페이지로
        </button>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          이벤트 캘린더{facilityName ? ` — ${facilityName}` : ''}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          시설 행사와 가족분 관련 일정을 확인합니다.
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
      ) : facilities.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">
          승인된 가디언십이 없어 이벤트를 표시할 수 없습니다.
        </div>
      ) : (
        <>
          {facilities.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">시설</label>
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {facilities.map((f) => (
                  <option key={f.facility_id} value={f.facility_id}>
                    {f.facility_name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedFacilityId && (
            <EventsCalendar facilityId={selectedFacilityId} mode="view" />
          )}
        </>
      )}
    </Layout>
  );
};

export default GuardianEventsCalendarPage;
