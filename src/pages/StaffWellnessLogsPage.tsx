import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import WellnessLogsView from '../components/WellnessLogsView';
import { apiClient } from '../utils/api';
import type { Resident } from '../types';

const StaffWellnessLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { residentId } = useParams<{ residentId: string }>();

  const [resident, setResident] = useState<Resident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const facility = JSON.parse(localStorage.getItem('facility') || '{}');
  const facilityId = user.facility_id || facility.id;

  useEffect(() => {
    if (!residentId || !facilityId) {
      setLoading(false);
      return;
    }
    apiClient
      .getFacilityResidents(facilityId)
      .then((res) => {
        const found = (res.data as Resident[]).find((r) => r.id === residentId) || null;
        setResident(found);
        if (!found) setError('해당 입소자를 찾을 수 없습니다.');
      })
      .catch(() => setError('입소자 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [residentId, facilityId]);

  return (
    <Layout>
      <div className="mb-4">
        <button
          onClick={() => navigate('/residents')}
          className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition"
        >
          <ChevronLeft size={16} />
          입소자 목록으로
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="animate-spin text-primary" size={28} />
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      ) : residentId ? (
        <WellnessLogsView
          residentId={residentId}
          residentName={resident?.name}
          mode="edit"
        />
      ) : null}
    </Layout>
  );
};

export default StaffWellnessLogsPage;
