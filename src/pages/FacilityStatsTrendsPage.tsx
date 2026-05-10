import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { BarChart3, Loader2, TrendingUp, Users, ImageIcon, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import TrendLineChart from '../components/TrendLineChart';
import RequirePermission from '../components/RequirePermission';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PERMISSION_KEYS, StatsRange, StatsTrendBucket, StatsTrendsResponse } from '../types';

/**
 * T-143: 시설 사용 지표 트렌드 그래프 페이지.
 *
 * 권한: T-150 의 facility:stats:view 게이트 — 시설장 / 운영자 / 위임 직원.
 * 페이지 진입 시 RequirePermission 가 가드 + 백엔드도 require_permission 으로 재검증.
 */

const RANGES: { value: StatsRange; label: string }[] = [
  { value: '3m', label: '최근 3개월' },
  { value: '6m', label: '최근 6개월' },
  { value: '12m', label: '최근 12개월' },
];

interface KPICardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta?: { value: string; positive: boolean | null };
}

const KPICard: React.FC<KPICardProps> = ({ icon, label, value, delta }) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="flex items-center gap-2 text-gray-600 text-sm mb-1">
      {icon}
      <span>{label}</span>
    </div>
    <div className="text-2xl font-bold text-gray-900">{value}</div>
    {delta && (
      <div
        className={`text-xs mt-1 ${
          delta.positive === true
            ? 'text-green-600'
            : delta.positive === false
              ? 'text-red-600'
              : 'text-gray-500'
        }`}
      >
        전월 대비 {delta.value}
      </div>
    )}
  </div>
);

const FacilityStatsTrendsInner: React.FC = () => {
  const { user } = useAuth();
  const facilityId = user?.facility_id;

  const [range, setRange] = useState<StatsRange>('6m');
  const [data, setData] = useState<StatsTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!facilityId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    apiClient
      .getFacilityStatsTrends(facilityId, range)
      .then((res) => {
        if (cancelled) return;
        setData(res.data as StatsTrendsResponse);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.response?.data?.detail || '통계 조회에 실패했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, range]);

  const items: StatsTrendBucket[] = data?.items ?? [];
  const labels = items.map((i) => i.month);

  // KPI 카드 — 가장 최근 월 + 전월 대비 증감
  const kpis = useMemo(() => {
    if (items.length === 0) return null;
    const cur = items[items.length - 1];
    const prev = items.length >= 2 ? items[items.length - 2] : null;

    const fmtDelta = (curV: number, prevV: number | undefined, suffix = '') => {
      if (prevV === undefined) return undefined;
      const diff = curV - prevV;
      const sign = diff > 0 ? '+' : '';
      return {
        value: `${sign}${diff.toFixed(suffix === '%' ? 1 : 0)}${suffix}`,
        positive: diff === 0 ? null : diff > 0,
      };
    };

    return {
      uploaded: {
        value: cur.photos_uploaded,
        delta: fmtDelta(cur.photos_uploaded, prev?.photos_uploaded, '장'),
      },
      matching: {
        value: cur.matching_rate,
        delta: fmtDelta(cur.matching_rate, prev?.matching_rate, '%p'),
      },
      guardians: {
        value: cur.active_guardians,
        delta: fmtDelta(cur.active_guardians, prev?.active_guardians, '명'),
      },
      unprocessed: {
        value: cur.photos_unprocessed_eom,
        delta: fmtDelta(cur.photos_unprocessed_eom, prev?.photos_unprocessed_eom, '장'),
      },
    };
  }, [items]);

  if (!user) return <Navigate to="/login" replace />;
  if (!facilityId) return <Navigate to="/dashboard" replace />;

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <BarChart3 className="text-primary" size={28} />
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">시설 사용 지표</h1>
          </div>

          <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 self-start sm:self-auto">
            {RANGES.map((r) => (
              <button
                key={r.value}
                onClick={() => setRange(r.value)}
                className={`px-3 py-1.5 text-sm rounded transition ${
                  range === r.value
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2 text-gray-500 py-12 justify-center">
            <Loader2 className="animate-spin" size={20} />
            <span>불러오는 중...</span>
          </div>
        ) : (
          <>
            {kpis && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KPICard
                  icon={<ImageIcon size={16} />}
                  label="이번 달 업로드"
                  value={`${kpis.uploaded.value}장`}
                  delta={kpis.uploaded.delta}
                />
                <KPICard
                  icon={<TrendingUp size={16} />}
                  label="매칭률"
                  value={`${kpis.matching.value.toFixed(1)}%`}
                  delta={kpis.matching.delta}
                />
                <KPICard
                  icon={<Users size={16} />}
                  label="활성 보호자"
                  value={`${kpis.guardians.value}명`}
                  delta={kpis.guardians.delta}
                />
                <KPICard
                  icon={<AlertTriangle size={16} />}
                  label="미처리 사진 누적"
                  value={`${kpis.unprocessed.value}장`}
                  delta={kpis.unprocessed.delta}
                />
              </div>
            )}

            <div className="grid lg:grid-cols-2 gap-6">
              <ChartCard title="월별 사진 업로드 추이" subtitle="누적이 아닌 월별 신규">
                <TrendLineChart
                  labels={labels}
                  values={items.map((i) => i.photos_uploaded)}
                  unit="장"
                  color="#2563eb"
                />
              </ChartCard>
              <ChartCard title="얼굴 매칭률" subtitle="(분류완료 / 업로드) × 100">
                <TrendLineChart
                  labels={labels}
                  values={items.map((i) => i.matching_rate)}
                  unit="%"
                  color="#10b981"
                />
              </ChartCard>
              <ChartCard title="활성 보호자" subtitle="좋아요로 활동 흔적이 있는 distinct 보호자">
                <TrendLineChart
                  labels={labels}
                  values={items.map((i) => i.active_guardians)}
                  unit="명"
                  color="#f59e0b"
                />
              </ChartCard>
              <ChartCard title="미처리 사진 누적" subtitle="월말 시점 pending + failed">
                <TrendLineChart
                  labels={labels}
                  values={items.map((i) => i.photos_unprocessed_eom)}
                  unit="장"
                  color="#ef4444"
                />
              </ChartCard>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

const ChartCard: React.FC<{ title: string; subtitle?: string; children: React.ReactNode }> = ({
  title,
  subtitle,
  children,
}) => (
  <div className="bg-white border border-gray-200 rounded-lg p-4">
    <div className="mb-2">
      <div className="font-semibold text-gray-900">{title}</div>
      {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
    </div>
    {children}
  </div>
);

const FacilityStatsTrendsPage: React.FC = () => (
  <RequirePermission permissionKey={PERMISSION_KEYS.FACILITY_STATS_VIEW}>
    <FacilityStatsTrendsInner />
  </RequirePermission>
);

export default FacilityStatsTrendsPage;
