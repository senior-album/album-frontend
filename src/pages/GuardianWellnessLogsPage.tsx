import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import WellnessLogsView from '../components/WellnessLogsView';

interface ResidentEntry {
  id: string;
  name: string;
  facility_name?: string;
  room_number?: string | null;
}

interface FacilityGroup {
  facility_id: string;
  facility_name: string;
  residents: ResidentEntry[];
}

const GuardianWellnessLogsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { residentId } = useParams<{ residentId: string }>();

  const [resident, setResident] = useState<ResidentEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }
    apiClient
      .getGuardianResidents()
      .then((res) => {
        const groups = (res.data || []) as FacilityGroup[];
        for (const fg of groups) {
          const found = fg.residents.find((r) => r.id === residentId);
          if (found) {
            setResident({ ...found, facility_name: fg.facility_name });
            return;
          }
        }
        setError('해당 입소자에 대한 접근 권한이 없거나 정보를 찾을 수 없습니다.');
      })
      .catch(() => setError('입소자 정보를 불러오지 못했습니다.'))
      .finally(() => setLoading(false));
  }, [residentId]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-guardian-cream to-white">
      <header className="sticky top-0 z-40 bg-white shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/guardian')}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 transition"
          >
            <ChevronLeft size={18} />
            갤러리로
          </button>
          <div className="flex-1 text-center">
            <h1 className="text-lg font-bold text-primary truncate">
              {resident ? `${resident.name}님 안부 일지` : '안부 일지'}
            </h1>
            {resident?.facility_name && (
              <p className="text-xs text-gray-500 truncate">{resident.facility_name}</p>
            )}
          </div>
          <div className="w-7 h-7 bg-guardian-brown rounded-full flex items-center justify-center text-white text-xs font-bold">
            {user?.name?.[0] || 'G'}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-guardian-brown" size={28} />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        ) : residentId ? (
          <WellnessLogsView
            residentId={residentId}
            residentName={resident?.name}
            mode="read"
          />
        ) : null}
      </main>
    </div>
  );
};

export default GuardianWellnessLogsPage;
