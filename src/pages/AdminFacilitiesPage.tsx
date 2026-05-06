import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Building2, Copy, Check, CheckCircle2, Circle } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-145 — 운영자 어드민 / 전체 시설 관리.
 * T-141 — 신규 시설 생성 시 온보딩 위저드 (코드 / 가입 URL / QR / 다음 단계 안내).
 *
 * 운영자(`is_operator`) 가 아니면 즉시 /login 으로 리다이렉트.
 * 시설 목록 + 직원/입소자/사진 카운트 + 생성·수정 모달.
 *
 * code 변경 불가 (백엔드 PATCH 가 받지 않음). hard delete 미지원 — 추후 백엔드
 * `Facility.is_active` 컬럼 추가 시 토글 UI 추가 예정.
 */

type AdminFacility = {
  id: string;
  code: string;
  name: string;
  address: string;
  phone: string;
  staff_count: number;
  resident_count: number;
  photo_count: number;
  created_at: string | null;
};

type ListResponse = {
  items: AdminFacility[];
  total: number;
  page: number;
  size: number;
};

type DraftFacility = {
  id?: string;
  code?: string;
  name: string;
  address: string;
  phone: string;
};

const PAGE_SIZE = 50;

const AdminFacilitiesPage: React.FC = () => {
  const { user } = useAuth();

  const [items, setItems] = useState<AdminFacility[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [qInput, setQInput] = useState('');
  const [q, setQ] = useState('');

  const [draft, setDraft] = useState<DraftFacility | null>(null); // null = 모달 닫힘
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // T-141: 시설 생성 직후의 결과. set 되면 모달이 위저드 Step 2 (안내) 로 전환.
  const [created, setCreated] = useState<AdminFacility | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((k) => (k === key ? null : k)), 1500);
    } catch {
      // clipboard API 실패는 silent — 사용자가 수동 복사 가능
    }
  };

  const signupUrl = (code: string) =>
    `${window.location.origin}/register?facility_code=${encodeURIComponent(code)}`;

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / PAGE_SIZE)), [total]);

  const reload = () => {
    if (!user?.is_operator) return;
    setLoading(true);
    const params: Record<string, string | number> = { page, size: PAGE_SIZE };
    if (q) params.q = q;
    apiClient
      .listAdminFacilities(params)
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
  }, [user?.is_operator, page, q]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  const submitSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setQ(qInput.trim());
  };

  const openCreate = () => {
    setDraft({ name: '', address: '', phone: '' });
    setError(null);
  };

  const openEdit = (f: AdminFacility) => {
    setDraft({ id: f.id, code: f.code, name: f.name, address: f.address, phone: f.phone });
    setError(null);
  };

  const submitDraft = async () => {
    if (!draft) return;
    if (!draft.name.trim() || !draft.address.trim()) {
      setError('이름과 주소는 필수입니다.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (draft.id) {
        await apiClient.patchAdminFacility(draft.id, {
          name: draft.name.trim(),
          address: draft.address.trim(),
          phone: draft.phone.trim(),
        });
        setDraft(null);
        reload();
      } else {
        const res = await apiClient.createAdminFacility({
          name: draft.name.trim(),
          address: draft.address.trim(),
          phone: draft.phone.trim(),
        });
        // 위저드 Step 2 — 코드/URL/QR 안내. 모달은 사용자가 "완료" 누를 때 닫음.
        setCreated(res.data as AdminFacility);
        reload();
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const closeWizard = () => {
    setDraft(null);
    setCreated(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">전체 시설 관리</h1>
            <p className="text-xs text-gray-500">운영자 전용 — 시설 목록 + 생성/수정 (코드 변경 불가)</p>
          </div>
          <nav className="flex gap-3 text-xs">
            <Link to="/admin/stats" className="text-gray-500 hover:text-gray-900">통계</Link>
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-900">유저 관리</Link>
            <Link to="/admin/guardians" className="text-gray-500 hover:text-gray-900">보호자 승인</Link>
            <Link to="/admin/photo-jobs" className="text-gray-500 hover:text-gray-900">사진 처리</Link>
            <Link to="/admin/legal-settings" className="text-gray-500 hover:text-gray-900">법령 설정</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-4">
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
                  placeholder="이름 또는 주소"
                  className="pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
            <button type="submit" className="bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90">
              조회
            </button>
          </form>

          <div className="ml-auto flex items-center gap-3">
            <div className="text-xs text-gray-500">총 <span className="font-semibold text-gray-900">{total}</span> 시설</div>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 bg-primary text-white px-3 py-2 rounded-lg text-sm font-medium hover:opacity-90"
            >
              <Plus size={14} />
              시설 추가
            </button>
          </div>
        </section>

        <section className="bg-white rounded-lg shadow-soft overflow-x-auto">
          {loading && <p className="p-4 text-gray-400 text-sm">불러오는 중...</p>}
          {!loading && items.length === 0 && <p className="p-4 text-gray-400 text-sm">조건에 해당하는 시설이 없습니다.</p>}
          {!loading && items.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-xs text-gray-600">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">코드</th>
                  <th className="text-left px-3 py-2 font-medium">이름</th>
                  <th className="text-left px-3 py-2 font-medium">주소</th>
                  <th className="text-left px-3 py-2 font-medium">전화</th>
                  <th className="text-right px-3 py-2 font-medium">직원</th>
                  <th className="text-right px-3 py-2 font-medium">입소자</th>
                  <th className="text-right px-3 py-2 font-medium">사진</th>
                  <th className="text-left px-3 py-2 font-medium">생성</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((f) => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-blue-700">{f.code}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{f.name}</td>
                    <td className="px-3 py-2 text-gray-700">{f.address}</td>
                    <td className="px-3 py-2 text-gray-700">{f.phone || <span className="text-gray-400">-</span>}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.staff_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.resident_count}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{f.photo_count}</td>
                    <td className="px-3 py-2 text-xs text-gray-500">
                      {f.created_at ? new Date(f.created_at).toLocaleDateString('ko-KR') : '-'}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(f)}
                        className="text-primary hover:underline text-xs"
                      >
                        수정
                      </button>
                    </td>
                  </tr>
                ))}
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

      {draft && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
          onClick={() => {
            // 위저드 Step 2 (created) 진행 중엔 backdrop 클릭으로 안 닫힘 — 운영자가 명시적 "완료" 눌러야 함.
            if (saving || created) return;
            setDraft(null);
          }}
        >
          <div
            className={`bg-white rounded-lg shadow-xl w-full p-5 ${created ? 'max-w-lg' : 'max-w-md'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {created ? (
              // ===== T-141 위저드 Step 2 — 시설 생성 직후 안내 =====
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-1 flex items-center gap-2">
                  <CheckCircle2 size={20} className="text-green-600" />
                  시설 등록 완료
                </h3>
                <p className="text-xs text-gray-500 mb-4">
                  <span className="font-medium text-gray-700">{created.name}</span> 의 가입 코드가 발급되었습니다. 시설장에게 아래 정보를 전달해 주세요.
                </p>

                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">시설 코드</div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-lg font-semibold text-blue-700 flex-1">{created.code}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('code', created.code)}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-300 rounded"
                      >
                        {copiedKey === 'code' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        {copiedKey === 'code' ? '복사됨' : '복사'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-[10px] uppercase tracking-wide text-gray-500 mb-1">가입 URL</div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-gray-800 flex-1 break-all">{signupUrl(created.code)}</code>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('url', signupUrl(created.code))}
                        className="inline-flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 px-2 py-1 border border-gray-300 rounded shrink-0"
                      >
                        {copiedKey === 'url' ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
                        {copiedKey === 'url' ? '복사됨' : '복사'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-center">
                    <div className="text-center">
                      <QRCodeSVG value={signupUrl(created.code)} size={140} level="M" />
                      <p className="text-[10px] text-gray-500 mt-2">QR 스캔 → 가입 페이지 이동</p>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="text-xs font-semibold text-gray-700 mb-2">다음 단계</div>
                    <ul className="space-y-1.5 text-xs">
                      <li className="flex items-start gap-2 text-green-700">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                        <span>시설 등록</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-600">
                        <Circle size={14} className="mt-0.5 shrink-0" />
                        <span>시설장에게 코드와 가입 URL 전달 (이메일·메신저·인쇄)</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-600">
                        <Circle size={14} className="mt-0.5 shrink-0" />
                        <span>시설장 회원가입 (가입 시 자동 승인 — 별도 운영자 작업 불필요)</span>
                      </li>
                      <li className="flex items-start gap-2 text-gray-600">
                        <Circle size={14} className="mt-0.5 shrink-0" />
                        <span>시설장이 직원 초대 / 입소자 등록 / 첫 사진 업로드 진행</span>
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex justify-end mt-5">
                  <button
                    type="button"
                    onClick={closeWizard}
                    className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90"
                  >
                    완료
                  </button>
                </div>
              </>
            ) : (
              // ===== Step 1 — 시설 정보 입력 (생성/수정 공용) =====
              <>
                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <Building2 size={18} />
                  {draft.id ? '시설 수정' : '시설 추가'}
                </h3>

                {draft.code && (
                  <p className="text-xs text-gray-500 mb-3">
                    코드 <code className="font-mono text-blue-700">{draft.code}</code>
                    <span className="text-gray-400 ml-2">(코드는 변경 불가)</span>
                  </p>
                )}

                {error && (
                  <p className="bg-red-50 border border-red-200 text-red-700 text-xs rounded p-2 mb-3">{error}</p>
                )}

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">이름 *</label>
                    <input
                      type="text"
                      value={draft.name}
                      onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">주소 *</label>
                    <input
                      type="text"
                      value={draft.address}
                      onChange={(e) => setDraft({ ...draft, address: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">전화</label>
                    <input
                      type="text"
                      value={draft.phone}
                      onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                      placeholder="02-1234-5678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 mt-5">
                  <button type="button" disabled={saving} onClick={() => setDraft(null)} className="px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">
                    취소
                  </button>
                  <button type="button" disabled={saving} onClick={submitDraft} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                    {saving ? '저장 중...' : draft.id ? '저장' : '생성'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFacilitiesPage;
