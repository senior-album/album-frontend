import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Users, Building2, ImageIcon, ListChecks, UserCheck, Activity } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-148 — 운영자 어드민 / 통계 대시보드 (운영자 홈).
 *
 * 운영자(`is_operator`) 가 아니면 즉시 /login 으로 리다이렉트.
 * 백엔드 GET /admin/stats 의 결과를 카드 + 미니 막대 그래프로 시각화.
 */

type Counts = { total: number; by: Record<string, number> };

type StatsResponse = {
  users: Counts;
  facilities: Counts;
  residents: Counts;
  photos: Counts;
  photo_jobs: Counts;
  guardians: Counts;
  user_signups_7d: { date: string; count: number }[];
  photo_uploads_7d: { date: string; count: number }[];
};

const Card: React.FC<{ icon: React.ReactNode; label: string; value: number; subtext?: string; color?: string }> = ({
  icon, label, value, subtext, color = 'bg-blue-50 text-blue-700',
}) => (
  <div className="bg-white rounded-lg shadow-soft p-4 flex items-start gap-3">
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 tabular-nums">{value.toLocaleString()}</div>
      {subtext && <div className="text-xs text-gray-500 mt-1">{subtext}</div>}
    </div>
  </div>
);

const MiniBar: React.FC<{ data: { date: string; count: number }[]; label: string }> = ({ data, label }) => {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="bg-white rounded-lg shadow-soft p-4">
      <div className="text-xs text-gray-500 mb-2">{label} (최근 7일)</div>
      <div className="flex items-end gap-1 h-32">
        {data.map((d) => {
          const h = Math.max(2, Math.round((d.count / max) * 100));
          return (
            <div key={d.date} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="text-xs text-gray-600 tabular-nums">{d.count}</div>
              <div
                className="w-full bg-blue-500 rounded-t"
                style={{ height: `${h}%` }}
                title={`${d.date}: ${d.count}`}
              />
              <div className="text-xs text-gray-400">{d.date.slice(5)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const AdminStatsPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.is_operator) return;
    let cancelled = false;
    setLoading(true);
    setErr(null);
    apiClient
      .getAdminStats()
      .then((res) => !cancelled && setStats(res.data))
      .catch((e) => !cancelled && setErr(e?.response?.data?.detail || '통계를 불러오지 못했습니다.'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [user?.is_operator]);

  const photoBacklog = useMemo(() => {
    if (!stats) return 0;
    return (stats.photo_jobs.by.pending ?? 0) + (stats.photo_jobs.by.processing ?? 0);
  }, [stats]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 flex flex-wrap items-center gap-3 sm:gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">운영자 통계</h1>
            <p className="text-xs text-gray-500">전 플랫폼 카운트 + 최근 7일 추세</p>
          </div>
          <nav className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-900">유저 관리</Link>
            <Link to="/admin/facilities" className="text-gray-500 hover:text-gray-900">시설 관리</Link>
            <Link to="/admin/guardians" className="text-gray-500 hover:text-gray-900">보호자 승인</Link>
            <Link to="/admin/photo-jobs" className="text-gray-500 hover:text-gray-900">사진 처리</Link>
            <Link to="/admin/legal-settings" className="text-gray-500 hover:text-gray-900">법령 설정</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {loading && <p className="text-gray-400 text-sm">불러오는 중...</p>}
        {err && <p className="bg-red-50 border border-red-200 text-red-700 text-sm rounded p-3">{err}</p>}
        {stats && (
          <>
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                icon={<Users size={20} />}
                label="유저"
                value={stats.users.total}
                subtext={`직원 ${stats.users.by.staff ?? 0} · 보호자 ${stats.users.by.guardian ?? 0} · 운영자 ${stats.users.by.operator ?? 0}`}
                color="bg-blue-50 text-blue-700"
              />
              <Card
                icon={<Building2 size={20} />}
                label="시설"
                value={stats.facilities.total}
                color="bg-purple-50 text-purple-700"
              />
              <Card
                icon={<UserCheck size={20} />}
                label="입소자 (활성)"
                value={stats.residents.total}
                color="bg-emerald-50 text-emerald-700"
              />
              <Card
                icon={<ImageIcon size={20} />}
                label="사진"
                value={stats.photos.total}
                subtext={`오늘 ${stats.photos.by.today ?? 0} · 처리완료 ${stats.photos.by.processed ?? 0} · 공개 ${stats.photos.by.public ?? 0}`}
                color="bg-amber-50 text-amber-700"
              />
            </section>

            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card
                icon={<ListChecks size={20} />}
                label="처리 큐 적체"
                value={photoBacklog}
                subtext={`pending ${stats.photo_jobs.by.pending ?? 0} · processing ${stats.photo_jobs.by.processing ?? 0}`}
                color="bg-yellow-50 text-yellow-700"
              />
              <Card
                icon={<Activity size={20} />}
                label="처리 실패"
                value={stats.photo_jobs.by.failed ?? 0}
                subtext="실패한 작업은 사진 처리 페이지에서 재시도"
                color="bg-red-50 text-red-700"
              />
              <Card
                icon={<UserCheck size={20} />}
                label="보호자 대기"
                value={stats.guardians.by.pending ?? 0}
                subtext={`승인 ${stats.guardians.by.approved ?? 0} · 거부 ${stats.guardians.by.rejected ?? 0}`}
                color="bg-orange-50 text-orange-700"
              />
              <Card
                icon={<Users size={20} />}
                label="활성 유저"
                value={stats.users.by.active ?? 0}
                subtext={`전체 ${stats.users.total} 중`}
                color="bg-indigo-50 text-indigo-700"
              />
            </section>

            <section className="grid lg:grid-cols-2 gap-4">
              <MiniBar data={stats.user_signups_7d} label="가입자" />
              <MiniBar data={stats.photo_uploads_7d} label="사진 업로드" />
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminStatsPage;
