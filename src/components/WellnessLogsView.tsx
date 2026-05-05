import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { apiClient } from '../utils/api';
import type {
  WellnessLog,
  WellnessLogUpsert,
  MobilityStatus,
  MealStatus,
} from '../types';

interface WellnessLogsViewProps {
  residentId: string;
  residentName?: string;
  /** read: 가디언, edit: 시설 직원. 권한은 백엔드가 강제하지만 UI 도 분기. */
  mode: 'read' | 'edit';
}

const MOBILITY_OPTIONS: { value: MobilityStatus; label: string }[] = [
  { value: 'independent', label: '자립 보행' },
  { value: 'walker', label: '보행기' },
  { value: 'wheelchair', label: '휠체어' },
  { value: 'bedridden', label: '와상' },
];

const MEAL_OPTIONS: { value: MealStatus; label: string; tone: string }[] = [
  { value: 'full', label: '완식', tone: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'partial', label: '일부', tone: 'bg-amber-100 text-amber-700 border-amber-300' },
  { value: 'refused', label: '거부', tone: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'skipped', label: '건너뜀', tone: 'bg-gray-100 text-gray-600 border-gray-300' },
];

const MOBILITY_LABEL: Record<MobilityStatus, string> = MOBILITY_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<MobilityStatus, string>,
);
const MEAL_LABEL: Record<MealStatus, string> = MEAL_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<MealStatus, string>,
);

const todayIso = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const shiftIso = (iso: string, days: number): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
};

const formatKoreanDate = (iso: string): string => {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const day = ['일', '월', '화', '수', '목', '금', '토'][dt.getDay()];
  return `${y}년 ${m}월 ${d}일 (${day})`;
};

const emptyDraft = (): WellnessLogUpsert => ({
  mobility_status: null,
  meal_breakfast: null,
  meal_lunch: null,
  meal_dinner: null,
  notes: '',
});

const WellnessLogsView: React.FC<WellnessLogsViewProps> = ({
  residentId,
  residentName,
  mode,
}) => {
  const [logs, setLogs] = useState<WellnessLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<string>(todayIso());
  const [draft, setDraft] = useState<WellnessLogUpsert>(emptyDraft());
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const today = todayIso();

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.listWellnessLogs(residentId);
      setLogs(res.data as WellnessLog[]);
    } catch (err: any) {
      const detail =
        err.response?.data?.detail || err.message || '안부 일지를 불러오지 못했습니다.';
      setError(typeof detail === 'string' ? detail : '안부 일지를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [residentId]);

  // 선택된 날짜의 기존 일지를 draft 에 반영
  const selectedExisting = useMemo(
    () => logs.find((l) => l.log_date === selectedDate) || null,
    [logs, selectedDate],
  );

  useEffect(() => {
    if (selectedExisting) {
      setDraft({
        mobility_status: selectedExisting.mobility_status,
        meal_breakfast: selectedExisting.meal_breakfast,
        meal_lunch: selectedExisting.meal_lunch,
        meal_dinner: selectedExisting.meal_dinner,
        notes: selectedExisting.notes ?? '',
      });
    } else {
      setDraft(emptyDraft());
    }
    setSavedAt(null);
  }, [selectedExisting, selectedDate]);

  const handleSave = async () => {
    if (mode !== 'edit') return;
    if (selectedDate > today) {
      alert('미래 날짜의 안부 일지는 작성할 수 없습니다.');
      return;
    }
    setSaving(true);
    try {
      const body = {
        mobility_status: draft.mobility_status ?? null,
        meal_breakfast: draft.meal_breakfast ?? null,
        meal_lunch: draft.meal_lunch ?? null,
        meal_dinner: draft.meal_dinner ?? null,
        notes: draft.notes?.trim() ? draft.notes.trim() : null,
      };
      await apiClient.upsertWellnessLog(residentId, selectedDate, body);
      setSavedAt(Date.now());
      await fetchLogs();
    } catch (err: any) {
      const detail = err.response?.data?.detail || '저장에 실패했습니다.';
      alert(typeof detail === 'string' ? detail : '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 정보 */}
      <div className="bg-white rounded-xl shadow-soft p-5">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {residentName ? `${residentName}님 안부 일지` : '안부 일지'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {mode === 'edit'
                ? '거동·식사 상태를 매일 기록합니다. 같은 날짜를 다시 저장하면 갱신됩니다.'
                : '시설에서 작성한 일일 거동·식사 기록입니다.'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar size={16} />
            <span>최근 {logs.length}일 기록</span>
          </div>
        </div>
      </div>

      {/* 날짜 선택 + 편집 영역 */}
      <div className="bg-white rounded-xl shadow-soft p-5">
        <div className="flex items-center gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSelectedDate(shiftIso(selectedDate, -1))}
            className="p-2 rounded-lg hover:bg-gray-100 transition"
            aria-label="이전 날짜"
          >
            <ChevronLeft size={18} />
          </button>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <button
            type="button"
            onClick={() => {
              const next = shiftIso(selectedDate, 1);
              if (next > today) return;
              setSelectedDate(next);
            }}
            disabled={selectedDate >= today}
            className="p-2 rounded-lg hover:bg-gray-100 transition disabled:opacity-40"
            aria-label="다음 날짜"
          >
            <ChevronRight size={18} />
          </button>
          <button
            type="button"
            onClick={() => setSelectedDate(today)}
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 hover:bg-gray-50 transition"
          >
            오늘
          </button>
        </div>

        <div className="text-sm text-gray-700 font-medium mb-4">
          {formatKoreanDate(selectedDate)}
          {selectedExisting ? (
            <span className="ml-2 text-xs text-green-600">· 기록 있음</span>
          ) : (
            <span className="ml-2 text-xs text-gray-400">· 기록 없음</span>
          )}
        </div>

        {/* 거동 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">거동 상태</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {MOBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                disabled={mode !== 'edit'}
                onClick={() =>
                  setDraft((d) => ({
                    ...d,
                    mobility_status: d.mobility_status === opt.value ? null : opt.value,
                  }))
                }
                className={`py-2 rounded-lg text-sm font-medium border transition ${
                  draft.mobility_status === opt.value
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                } ${mode !== 'edit' ? 'cursor-default opacity-90' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 식사 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">식사</label>
          <div className="space-y-3">
            {(
              [
                { key: 'meal_breakfast', label: '아침' },
                { key: 'meal_lunch', label: '점심' },
                { key: 'meal_dinner', label: '저녁' },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-gray-600 w-12">{label}</span>
                <div className="flex gap-2 flex-wrap">
                  {MEAL_OPTIONS.map((opt) => {
                    const active = draft[key] === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={mode !== 'edit'}
                        onClick={() =>
                          setDraft((d) => ({
                            ...d,
                            [key]: d[key] === opt.value ? null : opt.value,
                          }))
                        }
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                          active ? opt.tone : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                        } ${mode !== 'edit' ? 'cursor-default' : ''}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 메모 */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-900 mb-2">메모</label>
          <textarea
            value={draft.notes ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
            rows={3}
            placeholder={
              mode === 'edit'
                ? '특이사항을 기록해주세요. (예: 아침에 두통 호소, 보호자에게 전달함)'
                : ''
            }
            disabled={mode !== 'edit'}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-50 disabled:text-gray-700"
          />
        </div>

        {mode === 'edit' && (
          <div className="flex items-center justify-end gap-3">
            {savedAt && (
              <span className="text-xs text-green-600">
                저장됨 ({new Date(savedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })})
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              {selectedExisting ? '갱신 저장' : '저장'}
            </button>
          </div>
        )}
      </div>

      {/* 최근 일지 목록 */}
      <div className="bg-white rounded-xl shadow-soft p-5">
        <h3 className="text-base font-semibold text-gray-900 mb-3">최근 기록</h3>
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="animate-spin text-primary" size={24} />
            <span className="ml-3 text-gray-500 text-sm">불러오는 중...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-400 text-sm">
            아직 기록된 안부 일지가 없습니다.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {logs.map((log) => {
              const meals = [
                ['아침', log.meal_breakfast],
                ['점심', log.meal_lunch],
                ['저녁', log.meal_dinner],
              ] as const;
              return (
                <li key={log.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedDate(log.log_date)}
                    className={`w-full text-left py-3 px-2 rounded-lg hover:bg-gray-50 transition ${
                      log.log_date === selectedDate ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-baseline justify-between gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">
                        {formatKoreanDate(log.log_date)}
                      </span>
                      {log.mobility_status && (
                        <span className="text-xs text-gray-500">
                          거동: {MOBILITY_LABEL[log.mobility_status as MobilityStatus] ?? log.mobility_status}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      {meals.map(([label, val]) => (
                        <span key={label}>
                          {label}:{' '}
                          {val ? (
                            <span className="font-medium text-gray-700">
                              {MEAL_LABEL[val as MealStatus] ?? val}
                            </span>
                          ) : (
                            <span className="text-gray-300">-</span>
                          )}
                        </span>
                      ))}
                    </div>
                    {log.notes && (
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{log.notes}</p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default WellnessLogsView;
