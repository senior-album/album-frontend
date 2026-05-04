import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-147 — 운영자 어드민 / 사진 처리 큐 모니터링 + 실패 작업 재큐.
 *
 * failed 행에는 "재시도" 버튼 — 백엔드가 status=pending 으로 reset, retry_count=0,
 * error 클리어, AdminAuditLog 에 photo_job_retry 적재.
 */

type AdminPhotoJob = {
  id: string;
  photo_id: string;
  facility_id: string;
  facility_name: string | null;
  status: string;
  error_message: string | null;
  retry_count: number;
  max_retries: number;
  photo_processing_status: string | null;
  photo_thumbnail_url: string | null;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
};

type ListResponse = {
  items: AdminPhotoJob[];
  total: number;
  page: number;
  size: number;
};

type FacilityOpt = { id: string; code: string; name: string };

const PAGE_SIZE = 50;

const STATUS_BADGE: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700 border-gray-200',
  processing: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
};

const AdminPhotoJobsPage: React.FC = () => {
  const { user } = useAuth();

  const [items, setItems] = useState<AdminPhotoJob[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [statusFilter, setStatusFilter] = useState<'' | 'pending' | 'processing' | 'completed' | 'failed'>('failed');
  const [facilityId, setFacilityId] = useState<string>('');
  const [facilities, setFacilities] = useState<FacilityOpt[]>([]);

  const [retrying, setRetrying] = useState<Record<string, boolean>>({});
  const [retryMsg, setRetryMsg] = useState<Record<string, string>>({});

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (!user?.is_operator) return;
    apiClient
      .listAdminFacilities({ page: 1, size: 200 })
      .then((res) => setFacilities(res.data.items.map((f: any) => ({ id: f.id, code: f.code, name: f.name }))))
      .catch(() => setFacilities([]));
  }, [user?.is_operator]);

  const reload = () => {
    if (!user?.is_operator) return;
    setLoading(true);
    const params: Record<string, string | number> = { page, size: PAGE_SIZE };
    if (statusFilter) params.status = statusFilter;
    if (facilityId) params.facility_id = facilityId;
    apiClient
      .listAdminPhotoJobs(params)
      .then((res) => {
        const data = res.data as ListResponse;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        setItems([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.is_operator, page, statusFilter, facilityId]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  const retry = async (jobId: string) => {
    setRetrying((s) => ({ ...s, [jobId]: true }));
    setRetryMsg((s) => ({ ...s, [jobId]: '' }));
    try {
      await apiClient.retryAdminPhotoJob(jobId);
      reload();
    } catch (err: any) {
      setRetryMsg((s) => ({ ...s, [jobId]: err?.response?.data?.detail || '재시도 실패' }));
    } finally {
      setRetrying((s) => ({ ...s, [jobId]: false }));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">사진 처리 큐</h1>
            <p className="text-xs text-gray-500">운영자 전용 — PhotoProcessingJob 모니터링 + 실패 작업 재큐</p>
          </div>
          <nav className="flex gap-3 text-xs">
            <Link to="/admin/stats" className="text-gray-500 hover:text-gray-900">통계</Link>
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-900">유저 관리</Link>
            <Link to="/admin/facilities" className="text-gray-500 hover:text-gray-900">시설 관리</Link>
            <Link to="/admin/guardians" className="text-gray-500 hover:text-gray-900">보호자 승인</Link>
            <Link to="/admin/legal-settings" className="text-gray-500 hover:text-gray-900">법령 설정</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <section className="bg-white rounded-lg shadow-soft p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <select
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as any);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="pending">대기</option>
              <option value="processing">처리 중</option>
              <option value="completed">완료</option>
              <option value="failed">실패</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">시설</label>
            <select
              value={facilityId}
              onChange={(e) => {
                setPage(1);
                setFacilityId(e.target.value);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={reload}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 inline-flex items-center gap-1"
          >
            <RefreshCw size={14} />
            새로고침
          </button>
          <div className="ml-auto text-xs text-gray-500">총 <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> 건</div>
        </section>

        <section className="bg-white rounded-lg shadow-soft overflow-x-auto">
          {loading && <p className="p-4 text-gray-400 text-sm">불러오는 중...</p>}
          {!loading && items.length === 0 && <p className="p-4 text-gray-400 text-sm">조건에 해당하는 작업이 없습니다.</p>}
          {!loading && items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">상태</th>
                  <th className="text-left px-3 py-2 font-medium">시설</th>
                  <th className="text-left px-3 py-2 font-medium">사진</th>
                  <th className="text-right px-3 py-2 font-medium">retry</th>
                  <th className="text-left px-3 py-2 font-medium">에러</th>
                  <th className="text-left px-3 py-2 font-medium">생성</th>
                  <th className="text-left px-3 py-2 font-medium">완료</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((j) => (
                  <tr key={j.id} className="hover:bg-gray-50 align-top">
                    <td className="px-3 py-2">
                      <span className={`inline-block text-xs px-2 py-0.5 rounded border ${STATUS_BADGE[j.status] ?? 'bg-gray-100 text-gray-700'}`}>{j.status}</span>
                      {j.photo_processing_status && (
                        <div className="text-xs text-gray-400 mt-1">photo: {j.photo_processing_status}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-gray-700">{j.facility_name ?? <span className="text-gray-400 italic">-</span>}</td>
                    <td className="px-3 py-2">
                      {j.photo_thumbnail_url ? (
                        <img src={j.photo_thumbnail_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <code className="text-xs text-gray-500">{j.photo_id.slice(0, 8)}…</code>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-xs text-gray-600">
                      {j.retry_count}/{j.max_retries}
                    </td>
                    <td className="px-3 py-2 text-xs text-red-600 max-w-xs truncate" title={j.error_message ?? ''}>
                      {j.error_message ?? '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {j.created_at ? new Date(j.created_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {j.completed_at ? new Date(j.completed_at).toLocaleString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {j.status === 'failed' && (
                        <>
                          <button
                            type="button"
                            disabled={!!retrying[j.id]}
                            onClick={() => retry(j.id)}
                            className="text-xs bg-primary text-white px-2 py-1 rounded hover:opacity-90 disabled:opacity-50 inline-flex items-center gap-1"
                          >
                            <RefreshCw size={12} />
                            {retrying[j.id] ? '…' : '재시도'}
                          </button>
                          {retryMsg[j.id] && <div className="text-xs text-red-600 mt-1">{retryMsg[j.id]}</div>}
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">이전</button>
            <span className="text-gray-600">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">다음</button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPhotoJobsPage;
