import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-146 — 운영자 어드민 / 보호자 승인 현황 (전체 시설 across).
 *
 * 운영자(`is_operator`) 가 아니면 즉시 /login 으로 리다이렉트.
 * 읽기 전용 모니터링 — 승인/반려 액션은 시설장이 기존 페이지에서 처리.
 */

type AdminGuardian = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_phone: string | null;
  facility_id: string | null;
  facility_name: string | null;
  resident_id: string | null;
  resident_name: string | null;
  relationship_type: string | null;
  request_message: string | null;
  is_approved: boolean;
  is_rejected: boolean;
  reject_reason: string | null;
  approved_at: string | null;
  created_at: string | null;
};

type ListResponse = {
  items: AdminGuardian[];
  total: number;
  page: number;
  size: number;
};

type FacilityOpt = { id: string; code: string; name: string };

const PAGE_SIZE = 50;

const STATE_LABELS: Record<string, { label: string; cls: string }> = {
  pending: { label: '승인 대기', cls: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  approved: { label: '승인됨', cls: 'bg-green-100 text-green-700 border-green-200' },
  rejected: { label: '거부됨', cls: 'bg-red-100 text-red-700 border-red-200' },
};

const guardianState = (g: AdminGuardian): keyof typeof STATE_LABELS =>
  g.is_approved ? 'approved' : g.is_rejected ? 'rejected' : 'pending';

const AdminGuardiansPage: React.FC = () => {
  const { user } = useAuth();

  const [items, setItems] = useState<AdminGuardian[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [state, setState] = useState<'' | 'pending' | 'approved' | 'rejected'>('pending');
  const [facilityId, setFacilityId] = useState<string>('');

  const [facilities, setFacilities] = useState<FacilityOpt[]>([]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  // 시설 목록 1회 캐시 (필터 dropdown 용)
  useEffect(() => {
    if (!user?.is_operator) return;
    apiClient
      .listAdminFacilities({ page: 1, size: 200 })
      .then((res) => {
        const data = res.data;
        setFacilities(data.items.map((f: any) => ({ id: f.id, code: f.code, name: f.name })));
      })
      .catch(() => setFacilities([]));
  }, [user?.is_operator]);

  useEffect(() => {
    if (!user?.is_operator) return;
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number> = { page, size: PAGE_SIZE };
    if (state) params.state = state;
    if (facilityId) params.facility_id = facilityId;
    apiClient
      .listAdminGuardians(params)
      .then((res) => {
        if (cancelled) return;
        const data = res.data as ListResponse;
        setItems(data.items);
        setTotal(data.total);
      })
      .catch(() => {
        if (cancelled) return;
        setItems([]);
        setTotal(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.is_operator, page, state, facilityId]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">보호자 승인 현황</h1>
            <p className="text-xs text-gray-500">운영자 전용 — 전체 시설 across 모니터링 (승인 액션은 시설장 페이지에서)</p>
          </div>
          <nav className="flex gap-3 text-xs">
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-900">유저 관리</Link>
            <Link to="/admin/facilities" className="text-gray-500 hover:text-gray-900">시설 관리</Link>
            <Link to="/admin/legal-settings" className="text-gray-500 hover:text-gray-900">법령 설정</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <section className="bg-white rounded-lg shadow-soft p-4 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">상태</label>
            <select
              value={state}
              onChange={(e) => {
                setPage(1);
                setState(e.target.value as '' | 'pending' | 'approved' | 'rejected');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="pending">승인 대기</option>
              <option value="approved">승인됨</option>
              <option value="rejected">거부됨</option>
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
                <option key={f.id} value={f.id}>
                  {f.name} ({f.code})
                </option>
              ))}
            </select>
          </div>

          <div className="ml-auto text-xs text-gray-500">
            총 <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> 건
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-soft overflow-x-auto">
          {loading && <p className="p-4 text-gray-400 text-sm">불러오는 중...</p>}
          {!loading && items.length === 0 && <p className="p-4 text-gray-400 text-sm">조건에 해당하는 보호자 요청이 없습니다.</p>}
          {!loading && items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">상태</th>
                  <th className="text-left px-3 py-2 font-medium">보호자</th>
                  <th className="text-left px-3 py-2 font-medium">시설</th>
                  <th className="text-left px-3 py-2 font-medium">입소자</th>
                  <th className="text-left px-3 py-2 font-medium">관계</th>
                  <th className="text-left px-3 py-2 font-medium">요청 메시지</th>
                  <th className="text-left px-3 py-2 font-medium">신청일</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((g) => {
                  const st = STATE_LABELS[guardianState(g)];
                  return (
                    <tr key={g.id} className="hover:bg-gray-50 align-top">
                      <td className="px-3 py-2">
                        <span className={`inline-block text-xs px-2 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                        {g.is_rejected && g.reject_reason && (
                          <div className="text-xs text-red-600 mt-1" title={g.reject_reason}>
                            사유: {g.reject_reason.slice(0, 30)}{g.reject_reason.length > 30 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{g.user_name}</div>
                        <div className="text-xs text-gray-500">{g.user_email}</div>
                        {g.user_phone && <div className="text-xs text-gray-400">{g.user_phone}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {g.facility_name ?? <span className="text-gray-400 italic">미지정</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {g.resident_name ?? <span className="text-gray-400 italic">미배정</span>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{g.relationship_type ?? '-'}</td>
                      <td className="px-3 py-2 text-xs text-gray-700 max-w-xs truncate" title={g.request_message ?? ''}>
                        {g.request_message ?? '-'}
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {g.created_at ? new Date(g.created_at).toLocaleString('ko-KR') : '-'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">
              이전
            </button>
            <span className="text-gray-600">{page} / {totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50">
              다음
            </button>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminGuardiansPage;
