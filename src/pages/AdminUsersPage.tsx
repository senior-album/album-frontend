import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-144 — 운영자 어드민 / 전체 유저 관리.
 *
 * 운영자(`is_operator`) 가 아니면 즉시 /login 으로 리다이렉트.
 * 표 안에서 활성/시설관리자/운영자 토글 + 시설 변경 가능. 모든 토글은 PATCH 1
 * 요청으로 즉시 반영, 백엔드가 변경된 필드별로 AdminAuditLog 1 row 적재.
 *
 * hard delete 미지원 — 비활성화 토글로만 처리.
 */

type AdminUser = {
  id: string;
  email: string;
  name: string;
  role: 'staff' | 'guardian' | string;
  is_admin: boolean;
  is_operator: boolean;
  is_active: boolean;
  facility_id: string | null;
  facility_name: string | null;
  provider: string | null;
  phone: string | null;
  created_at: string | null;
};

type ListResponse = {
  items: AdminUser[];
  total: number;
  page: number;
  size: number;
};

const PAGE_SIZE = 50;

const AdminUsersPage: React.FC = () => {
  const { user } = useAuth();

  const [items, setItems] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // 필터
  const [role, setRole] = useState<'' | 'staff' | 'guardian'>('');
  const [activeFilter, setActiveFilter] = useState<'' | 'true' | 'false'>('');
  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  // 행별 저장 상태 (id → 'saving' | 'ok' | 'err' | undefined)
  const [rowState, setRowState] = useState<Record<string, 'saving' | 'ok' | { err: string }>>({});

  // 시설 변경 모달 상태
  const [editFacilityFor, setEditFacilityFor] = useState<AdminUser | null>(null);
  const [facilityIdInput, setFacilityIdInput] = useState('');

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  useEffect(() => {
    if (!user?.is_operator) return;
    let cancelled = false;
    setLoading(true);
    const params: Record<string, string | number | boolean> = { page, size: PAGE_SIZE };
    if (role) params.role = role;
    if (activeFilter) params.is_active = activeFilter;
    if (q) params.q = q;
    apiClient
      .listAdminUsers(params)
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
  }, [user?.is_operator, page, role, activeFilter, q]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const patchUser = async (target: AdminUser, body: Partial<Pick<AdminUser, 'is_active' | 'is_admin' | 'is_operator'>> & { facility_id?: string | null }) => {
    setRowState((s) => ({ ...s, [target.id]: 'saving' }));
    try {
      const res = await apiClient.patchAdminUser(target.id, body);
      const updated = res.data as AdminUser;
      setItems((arr) => arr.map((u) => (u.id === updated.id ? updated : u)));
      setRowState((s) => ({ ...s, [target.id]: 'ok' }));
      // 잠시 후 ok 상태 클리어
      setTimeout(() => {
        setRowState((s) => {
          if (s[target.id] === 'ok') {
            const next = { ...s };
            delete next[target.id];
            return next;
          }
          return s;
        });
      }, 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '저장 실패';
      setRowState((s) => ({ ...s, [target.id]: { err: detail } }));
    }
  };

  const openFacilityEdit = (u: AdminUser) => {
    setEditFacilityFor(u);
    setFacilityIdInput(u.facility_id ?? '');
  };

  const saveFacility = async () => {
    if (!editFacilityFor) return;
    const newId = facilityIdInput.trim();
    await patchUser(editFacilityFor, { facility_id: newId });
    setEditFacilityFor(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">전체 유저 관리</h1>
            <p className="text-xs text-gray-500">운영자 전용 — 활성/권한 토글 + 시설 배정</p>
          </div>
          <nav className="flex gap-3 text-xs">
            <Link to="/admin/facilities" className="text-gray-500 hover:text-gray-900">시설 관리</Link>
            <Link to="/admin/guardians" className="text-gray-500 hover:text-gray-900">보호자 승인</Link>
            <Link to="/admin/legal-settings" className="text-gray-500 hover:text-gray-900">법령 설정</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        {/* === 필터 === */}
        <section className="bg-white rounded-lg shadow-soft p-4 flex flex-wrap items-end gap-3">
          <form onSubmit={submitSearch} className="flex items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">검색</label>
              <div className="relative">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  placeholder="이메일 또는 이름"
                  className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button type="submit" className="bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              조회
            </button>
          </form>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">역할</label>
            <select
              value={role}
              onChange={(e) => {
                setPage(1);
                setRole(e.target.value as '' | 'staff' | 'guardian');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="staff">직원</option>
              <option value="guardian">보호자</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">활성</label>
            <select
              value={activeFilter}
              onChange={(e) => {
                setPage(1);
                setActiveFilter(e.target.value as '' | 'true' | 'false');
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">전체</option>
              <option value="true">활성</option>
              <option value="false">비활성</option>
            </select>
          </div>

          <div className="ml-auto text-xs text-gray-500">
            총 <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> 명
          </div>
        </section>

        {/* === 테이블 === */}
        <section className="bg-white rounded-lg shadow-soft overflow-x-auto">
          {loading && <p className="p-4 text-gray-400 text-sm">불러오는 중...</p>}
          {!loading && items.length === 0 && <p className="p-4 text-gray-400 text-sm">조건에 해당하는 유저가 없습니다.</p>}
          {!loading && items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">이름 / 이메일</th>
                  <th className="text-left px-3 py-2 font-medium">역할</th>
                  <th className="text-left px-3 py-2 font-medium">시설</th>
                  <th className="text-center px-3 py-2 font-medium">활성</th>
                  <th className="text-center px-3 py-2 font-medium">시설관리자</th>
                  <th className="text-center px-3 py-2 font-medium">운영자</th>
                  <th className="text-left px-3 py-2 font-medium">가입</th>
                  <th className="text-left px-3 py-2 font-medium">상태</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((u) => {
                  const state = rowState[u.id];
                  const isSelf = user.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2">
                        <div className="font-medium text-gray-900">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                        {u.provider && <div className="text-xs text-gray-400">via {u.provider}</div>}
                      </td>
                      <td className="px-3 py-2 text-gray-700">{u.role === 'staff' ? '직원' : '보호자'}</td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openFacilityEdit(u)}
                          className="text-left text-gray-700 hover:text-primary hover:underline"
                          title="시설 변경"
                        >
                          {u.facility_name ?? <span className="text-gray-400 italic">미배정</span>}
                        </button>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={u.is_active}
                          disabled={state === 'saving' || isSelf}
                          onChange={(e) => patchUser(u, { is_active: e.target.checked })}
                          title={isSelf ? '자기 자신은 비활성화할 수 없습니다' : '활성/비활성'}
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={u.is_admin}
                          disabled={state === 'saving'}
                          onChange={(e) => patchUser(u, { is_admin: e.target.checked })}
                          title="시설 관리자 권한"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={u.is_operator}
                          disabled={state === 'saving' || (isSelf && u.is_operator)}
                          onChange={(e) => patchUser(u, { is_operator: e.target.checked })}
                          title={isSelf && u.is_operator ? '자기 자신의 운영자 권한은 해제할 수 없습니다' : '운영자 권한'}
                        />
                      </td>
                      <td className="px-3 py-2 text-xs text-gray-500">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString('ko-KR') : '-'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        {state === 'saving' && <span className="text-gray-500">저장 중...</span>}
                        {state === 'ok' && <span className="text-green-600">저장됨</span>}
                        {state && typeof state === 'object' && 'err' in state && (
                          <span className="text-red-600" title={state.err}>{state.err}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {/* === 페이지네이션 === */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50"
            >
              이전
            </button>
            <span className="text-gray-600">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 border border-gray-300 rounded disabled:opacity-50"
            >
              다음
            </button>
          </div>
        )}
      </main>

      {/* === 시설 변경 모달 === */}
      {editFacilityFor && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => setEditFacilityFor(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-md w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-gray-900 mb-1">시설 변경</h3>
            <p className="text-xs text-gray-500 mb-3">
              {editFacilityFor.name} ({editFacilityFor.email})
              <br />
              현재: {editFacilityFor.facility_name ?? '미배정'}
            </p>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              새 시설 ID <span className="text-gray-400">(빈 값 = 시설 해제)</span>
            </label>
            <input
              type="text"
              value={facilityIdInput}
              onChange={(e) => setFacilityIdInput(e.target.value)}
              placeholder="facility uuid"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                type="button"
                onClick={() => setEditFacilityFor(null)}
                className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                취소
              </button>
              <button
                type="button"
                onClick={saveFacility}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
              >
                저장
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
