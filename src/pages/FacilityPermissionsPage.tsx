import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { CheckCircle2, Loader2, XCircle, Shield } from 'lucide-react';
import Layout from '../components/Layout';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { invalidateMyPermissionsCache } from '../hooks/useFacilityPermission';
import { PermissionKeyOut, StaffPermissionRow } from '../types';

/**
 * T-150: 시설장이 자기 시설 직원에게 메뉴 권한을 부여/회수하는 페이지.
 *
 * 접근: `is_admin=True` + `facility_id` 보유자만 (백엔드 가드 동일).
 * 시설장 본인 / 운영자 행은 토글 비활성화 + "자동 부여" 표시.
 */

type RowState = 'idle' | 'saving' | 'ok' | 'err';

const FacilityPermissionsPage: React.FC = () => {
  const { user } = useAuth();

  const [keys, setKeys] = useState<PermissionKeyOut[]>([]);
  const [staff, setStaff] = useState<StaffPermissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rowState, setRowState] = useState<Record<string, RowState>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user?.is_admin || !user.facility_id) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.listFacilityPermissionKeys(),
      apiClient.listFacilityStaffPermissions(),
    ])
      .then(([keysRes, staffRes]) => {
        if (cancelled) return;
        setKeys(keysRes.data as PermissionKeyOut[]);
        setStaff((staffRes.data as { items: StaffPermissionRow[] }).items);
        setError(null);
      })
      .catch((err: any) => {
        if (cancelled) return;
        setError(err?.response?.data?.detail || '권한 정보 조회에 실패했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.is_admin, user?.facility_id]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_admin || !user.facility_id) return <Navigate to="/dashboard" replace />;

  const cellKey = (userId: string, key: string) => `${userId}::${key}`;

  const togglePermission = async (
    row: StaffPermissionRow,
    key: string,
    nextOn: boolean,
  ) => {
    const k = cellKey(row.user_id, key);
    setRowState((s) => ({ ...s, [k]: 'saving' }));
    setRowError((e) => {
      const next = { ...e };
      delete next[k];
      return next;
    });

    try {
      if (nextOn) {
        await apiClient.grantFacilityPermission(row.user_id, key);
      } else {
        await apiClient.revokeFacilityPermission(row.user_id, key);
      }
      setStaff((arr) =>
        arr.map((r) => {
          if (r.user_id !== row.user_id) return r;
          const set = new Set(r.permission_keys);
          if (nextOn) set.add(key);
          else set.delete(key);
          return { ...r, permission_keys: Array.from(set).sort() };
        }),
      );
      // 본인 권한이 바뀌면 hook 캐시 무효화
      if (row.user_id === user.id) invalidateMyPermissionsCache();
      setRowState((s) => ({ ...s, [k]: 'ok' }));
      setTimeout(() => {
        setRowState((s) => {
          if (s[k] === 'ok') {
            const next = { ...s };
            delete next[k];
            return next;
          }
          return s;
        });
      }, 1500);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '저장 실패';
      setRowState((s) => ({ ...s, [k]: 'err' }));
      setRowError((e) => ({ ...e, [k]: String(detail) }));
    }
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-primary" size={28} />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">메뉴 권한 위임</h1>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-6">
          시설 직원에게 메뉴별 접근 권한을 위임합니다. 시설장(본인) 과 운영자는 모든 메뉴를 자동으로 볼 수 있습니다.
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
        ) : staff.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg py-12 text-center text-gray-500">
            소속된 직원이 없습니다.
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-medium text-gray-700">
                    직원
                  </th>
                  {keys.map((k) => (
                    <th
                      key={k.key}
                      className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-gray-700"
                      title={k.key}
                    >
                      {k.description}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((row) => {
                  const auto = row.has_all_via_role;
                  return (
                    <tr key={row.user_id} className={auto ? 'bg-blue-50/40' : undefined}>
                      <td className="px-2 sm:px-4 py-3">
                        <div className="font-medium text-gray-900">
                          {row.name}
                          {row.user_id === user.id && (
                            <span className="ml-2 text-xs text-blue-600">(본인)</span>
                          )}
                          {auto && (
                            <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              자동 부여
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{row.email}</div>
                      </td>
                      {keys.map((k) => {
                        const ck = cellKey(row.user_id, k.key);
                        const state = rowState[ck];
                        const checked = auto || row.permission_keys.includes(k.key);
                        const disabled = auto || state === 'saving';
                        return (
                          <td key={k.key} className="px-2 sm:px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                className="w-5 h-5 rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                                checked={checked}
                                disabled={disabled}
                                onChange={(e) => togglePermission(row, k.key, e.target.checked)}
                              />
                              {state === 'saving' && (
                                <Loader2 className="animate-spin text-gray-400" size={14} />
                              )}
                              {state === 'ok' && (
                                <CheckCircle2 className="text-green-500" size={14} />
                              )}
                              {state === 'err' && (
                                <span className="inline-flex items-center gap-1 text-red-500" title={rowError[ck]}>
                                  <XCircle size={14} />
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default FacilityPermissionsPage;
