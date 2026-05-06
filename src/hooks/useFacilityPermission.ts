/**
 * T-150: 시설 메뉴 권한 hook.
 *
 * 로그인 유저 자기 권한 키를 한 번 fetch 해서 module-level 에 캐시.
 * AuthContext 변경(로그인/로그아웃) 시 캐시 invalidate.
 *
 * backend `has_permission` 의 자동 통과 규칙을 그대로 미러:
 *  - is_operator → 모든 키
 *  - is_admin + facility_id → facility:* 키
 *  - 그 외 → permission_keys 배열에 포함된 키만
 */
import { useEffect, useState } from 'react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { MyPermissions } from '../types';

let _cache: { userId: string; data: MyPermissions } | null = null;
let _inflight: Promise<MyPermissions> | null = null;

async function fetchMyPermissions(userId: string): Promise<MyPermissions> {
  if (_cache && _cache.userId === userId) return _cache.data;
  if (_inflight) return _inflight;
  _inflight = apiClient
    .getMyFacilityPermissions()
    .then((res) => {
      const data = res.data as MyPermissions;
      _cache = { userId, data };
      _inflight = null;
      return data;
    })
    .catch((err) => {
      _inflight = null;
      throw err;
    });
  return _inflight;
}

export function invalidateMyPermissionsCache() {
  _cache = null;
  _inflight = null;
}

interface UsePermissionResult {
  /** 키 단건 검사 — 미로드 / 검사 실패 시 false */
  has: (key: string) => boolean;
  /** 명시 부여된 키 목록 (auto-pass 는 미포함) */
  keys: string[];
  /** is_operator 또는 (is_admin + facility) 자동 통과 여부 */
  hasAllViaRole: boolean;
  isLoading: boolean;
}

export function useFacilityPermission(): UsePermissionResult {
  const { user } = useAuth();
  const [data, setData] = useState<MyPermissions | null>(
    _cache && user && _cache.userId === user.id ? _cache.data : null,
  );
  const [isLoading, setIsLoading] = useState<boolean>(
    !(_cache && user && _cache.userId === user.id),
  );

  useEffect(() => {
    if (!user) {
      setData(null);
      setIsLoading(false);
      invalidateMyPermissionsCache();
      return;
    }
    let cancelled = false;
    setIsLoading(true);
    fetchMyPermissions(user.id)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setData({ permission_keys: [], has_all_via_role: false });
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const has = (key: string): boolean => {
    if (!user || !data) return false;
    if (user.is_operator) return true;
    if (user.is_admin && key.startsWith('facility:')) return Boolean(user.facility_id);
    return data.permission_keys.includes(key);
  };

  return {
    has,
    keys: data?.permission_keys ?? [],
    hasAllViaRole: data?.has_all_via_role ?? false,
    isLoading,
  };
}
