import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { UserCheck, Loader2, Check, X } from 'lucide-react';
import Layout from '../components/Layout';
import RequirePermission from '../components/RequirePermission';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { PERMISSION_KEYS, PendingStaffRow, PendingStaffListResponse } from '../types';

/**
 * T-056: 시설장(또는 facility:staff:approve 위임) 이 신규 직원 가입 요청을
 * 승인/거부하는 페이지. 거부 시 거부 사유는 옵셔널.
 */

type RowState = 'idle' | 'saving' | 'ok' | 'err';

const StaffApprovalsInner: React.FC = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<PendingStaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [rejectingFor, setRejectingFor] = useState<PendingStaffRow | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const load = () => {
    setLoading(true);
    setError(null);
    apiClient
      .listPendingStaff()
      .then((res) => {
        setItems((res.data as PendingStaffListResponse).items);
      })
      .catch((err: any) => {
        setError(err?.response?.data?.detail || '목록 조회 실패');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  if (!user) return <Navigate to="/login" replace />;

  const setRow = (id: string, st: RowState, err?: string) => {
    setRowState((s) => ({ ...s, [id]: st }));
    if (err !== undefined) {
      setRowError((e) => ({ ...e, [id]: err }));
    } else if (st === 'ok' || st === 'idle') {
      setRowError((e) => {
        const next = { ...e };
        delete next[id];
        return next;
      });
    }
  };

  const approve = async (row: PendingStaffRow) => {
    setRow(row.user_id, 'saving');
    try {
      await apiClient.approveStaff(row.user_id);
      setItems((arr) => arr.filter((r) => r.user_id !== row.user_id));
      setRow(row.user_id, 'ok');
    } catch (err: any) {
      setRow(row.user_id, 'err', err?.response?.data?.detail || '승인 실패');
    }
  };

  const confirmReject = async () => {
    if (!rejectingFor) return;
    const row = rejectingFor;
    setRow(row.user_id, 'saving');
    setRejectingFor(null);
    try {
      await apiClient.rejectStaff(row.user_id, rejectReason.trim() || undefined);
      setItems((arr) => arr.filter((r) => r.user_id !== row.user_id));
      setRow(row.user_id, 'ok');
      setRejectReason('');
    } catch (err: any) {
      setRow(row.user_id, 'err', err?.response?.data?.detail || '거부 실패');
    }
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <UserCheck className="text-primary" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">직원 승인 대기</h1>
        </div>
        <p className="text-gray-600 mb-6">
          신규 직원 가입 신청을 검토하고 승인 또는 거부합니다. 거부는 영구 처리되어 같은 이메일로 재신청할 수 없습니다.
        </p>

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
        ) : items.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg py-12 text-center text-gray-500">
            대기 중인 신청이 없습니다.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
            {items.map((row) => {
              const state = rowState[row.user_id];
              const err = rowError[row.user_id];
              const disabled = state === 'saving';
              return (
                <div key={row.user_id} className="p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-gray-900">{row.name}</div>
                    <div className="text-sm text-gray-500 truncate">{row.email}</div>
                    {row.phone && (
                      <div className="text-xs text-gray-400 mt-0.5">{row.phone}</div>
                    )}
                    {err && <div className="text-xs text-red-600 mt-1">{err}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => approve(row)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      <Check size={16} />
                      <span>승인</span>
                    </button>
                    <button
                      onClick={() => {
                        setRejectingFor(row);
                        setRejectReason('');
                      }}
                      disabled={disabled}
                      className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      <X size={16} />
                      <span>거부</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 거부 사유 모달 */}
      {rejectingFor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-md w-full rounded-xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {rejectingFor.name} 님 거부
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              거부 사유는 선택 사항입니다. 입력하면 감사 로그에 함께 저장됩니다.
              거부된 계정은 동일 이메일로 재가입할 수 없습니다.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              maxLength={500}
              placeholder="(선택) 사유 입력"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setRejectingFor(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                취소
              </button>
              <button
                onClick={confirmReject}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

const StaffApprovalsPage: React.FC = () => (
  <RequirePermission permissionKey={PERMISSION_KEYS.FACILITY_STAFF_APPROVE}>
    <StaffApprovalsInner />
  </RequirePermission>
);

export default StaffApprovalsPage;
