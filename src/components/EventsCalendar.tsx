import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X, Loader2, Trash2 } from 'lucide-react';
import { apiClient } from '../utils/api';
import type { CalendarEvent, EventType, Resident } from '../types';

interface EventsCalendarProps {
  facilityId: string;
  // 'edit' = 직원 — 등록/수정/삭제 가능. 'view' = 보호자 — read only.
  mode: 'edit' | 'view';
  // 직원 mode 에서 이벤트의 resident 선택지로 쓰일 입소자 목록.
  residents?: Resident[];
}

interface FormState {
  type: EventType;
  title: string;
  description: string;
  start_date: string; // YYYY-MM-DD
  start_time: string; // HH:MM
  end_date: string;
  end_time: string;
  all_day: boolean;
  resident_id: string; // '' = 시설 전체 행사
}

const EMPTY_FORM: FormState = {
  type: 'outing',
  title: '',
  description: '',
  start_date: '',
  start_time: '10:00',
  end_date: '',
  end_time: '11:00',
  all_day: true,
  resident_id: '',
};

const TYPE_LABEL: Record<EventType, string> = {
  birthday: '생신',
  outing: '외출/행사',
  other: '기타',
};

const TYPE_COLOR: Record<EventType, string> = {
  birthday: 'bg-pink-100 text-pink-800 border-pink-200',
  outing: 'bg-blue-100 text-blue-800 border-blue-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function buildMonthCells(monthStart: Date) {
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { date: Date; isCurrent: boolean }[] = [];
  for (let i = 0; i < startWeekday; i++) {
    const d = new Date(year, month, 1 - (startWeekday - i));
    cells.push({ date: d, isCurrent: false });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ date: new Date(year, month, i), isCurrent: true });
  }
  while (cells.length < 42) {
    const last = cells[cells.length - 1].date;
    cells.push({
      date: new Date(last.getFullYear(), last.getMonth(), last.getDate() + 1),
      isCurrent: false,
    });
  }
  return cells;
}

const EventsCalendar: React.FC<EventsCalendarProps> = ({
  facilityId,
  mode,
  residents = [],
}) => {
  const [monthCursor, setMonthCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const cells = useMemo(() => buildMonthCells(monthCursor), [monthCursor]);

  const residentNameById = useMemo(() => {
    const m = new Map<string, string>();
    residents.forEach((r) => m.set(r.id, r.name));
    return m;
  }, [residents]);

  const reload = async () => {
    setLoading(true);
    setError(null);
    // 한 달 + 양옆 padding 까지 포함하는 범위로 fetch (캘린더 grid 가 prev/next month 일부 표시).
    const from = cells[0].date;
    const lastCell = cells[cells.length - 1].date;
    const to = new Date(
      lastCell.getFullYear(),
      lastCell.getMonth(),
      lastCell.getDate(),
      23,
      59,
      59,
    );
    try {
      const res = await apiClient.listFacilityEvents(facilityId, {
        from: from.toISOString(),
        to: to.toISOString(),
      });
      setEvents(res.data as CalendarEvent[]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '이벤트를 불러오지 못했습니다.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facilityId, monthCursor]);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const key = ymd(new Date(ev.start_at));
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(ev);
    });
    return m;
  }, [events]);

  const today = new Date();

  const openCreateForm = (preselectDate?: Date) => {
    const base = preselectDate ?? selectedDate ?? today;
    setEditingEvent(null);
    setForm({
      ...EMPTY_FORM,
      start_date: ymd(base),
      end_date: ymd(base),
    });
    setShowForm(true);
  };

  const openEditForm = (ev: CalendarEvent) => {
    const start = new Date(ev.start_at);
    const end = ev.end_at ? new Date(ev.end_at) : null;
    setEditingEvent(ev);
    setForm({
      type: ev.type,
      title: ev.title,
      description: ev.description ?? '',
      start_date: ymd(start),
      start_time: `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`,
      end_date: end ? ymd(end) : ymd(start),
      end_time: end
        ? `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
        : '11:00',
      all_day: ev.all_day,
      resident_id: ev.resident_id ?? '',
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingEvent(null);
  };

  const buildIso = (date: string, time: string, allDay: boolean): string => {
    // all_day 면 시작 00:00, 종료 23:59 로 저장 (Date 객체 로컬 → ISO).
    const [y, mo, d] = date.split('-').map((s) => parseInt(s, 10));
    const [h, mi] = (allDay ? '00:00' : time).split(':').map((s) => parseInt(s, 10));
    return new Date(y, (mo || 1) - 1, d || 1, h || 0, mi || 0).toISOString();
  };

  const submitForm = async () => {
    if (!form.title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!form.start_date) {
      setError('시작 날짜를 입력해주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const start_at = buildIso(form.start_date, form.start_time, form.all_day);
      const end_at = form.end_date
        ? buildIso(
            form.end_date,
            form.all_day ? '23:59' : form.end_time,
            false,
          )
        : null;

      const body = {
        type: form.type,
        title: form.title.trim(),
        description: form.description.trim() || null,
        start_at,
        end_at,
        all_day: form.all_day,
        resident_id: form.resident_id || null,
      };

      if (editingEvent) {
        await apiClient.updateEvent(editingEvent.id, body);
      } else {
        await apiClient.createFacilityEvent(facilityId, body);
      }
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '저장 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async () => {
    if (!editingEvent) return;
    if (!confirm('이 이벤트를 삭제하시겠습니까?')) return;
    setSubmitting(true);
    try {
      await apiClient.deleteEvent(editingEvent.id);
      closeForm();
      await reload();
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        '삭제 중 오류가 발생했습니다.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const monthTitle = `${monthCursor.getFullYear()}년 ${monthCursor.getMonth() + 1}월`;

  const dayEvents = selectedDate
    ? eventsByDate.get(ymd(selectedDate)) ?? []
    : [];

  return (
    <div className="bg-white rounded-lg shadow-soft p-4 sm:p-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              setMonthCursor(
                new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1),
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="이전 달"
          >
            <ChevronLeft size={20} />
          </button>
          <h2 className="text-lg font-bold text-gray-900 min-w-[8rem] text-center">
            {monthTitle}
          </h2>
          <button
            onClick={() =>
              setMonthCursor(
                new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1),
              )
            }
            className="p-2 hover:bg-gray-100 rounded-lg transition"
            aria-label="다음 달"
          >
            <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setMonthCursor(new Date(today.getFullYear(), today.getMonth(), 1))}
            className="ml-2 px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition"
          >
            오늘
          </button>
        </div>

        {mode === 'edit' && (
          <button
            onClick={() => openCreateForm()}
            className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition text-sm"
          >
            <Plus size={16} />
            이벤트 등록
          </button>
        )}
      </div>

      {error && !showForm && (
        <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 mb-1 text-center text-xs font-medium text-gray-500">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : ''}>
            {w}
          </div>
        ))}
      </div>

      {/* grid */}
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded overflow-hidden">
        {cells.map((cell, idx) => {
          const dateKey = ymd(cell.date);
          const dayEvs = eventsByDate.get(dateKey) ?? [];
          const isToday = sameDay(cell.date, today);
          const isSelected = selectedDate && sameDay(cell.date, selectedDate);
          const dow = cell.date.getDay();
          return (
            <button
              key={idx}
              onClick={() => setSelectedDate(cell.date)}
              className={`bg-white min-h-[80px] sm:min-h-[100px] p-1 text-left transition ${
                cell.isCurrent ? '' : 'bg-gray-50 text-gray-400'
              } ${isSelected ? 'ring-2 ring-primary ring-inset' : ''} hover:bg-gray-50`}
            >
              <div
                className={`text-xs font-medium mb-1 ${
                  isToday
                    ? 'inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-white'
                    : dow === 0
                      ? 'text-red-500'
                      : dow === 6
                        ? 'text-blue-500'
                        : 'text-gray-700'
                } ${!cell.isCurrent ? 'opacity-50' : ''}`}
              >
                {cell.date.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayEvs.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (mode === 'edit') openEditForm(ev);
                      else setSelectedDate(cell.date);
                    }}
                    className={`text-[10px] sm:text-xs px-1 py-0.5 rounded truncate border ${TYPE_COLOR[ev.type]} hover:opacity-80 cursor-pointer`}
                    title={ev.title}
                  >
                    {ev.title}
                  </div>
                ))}
                {dayEvs.length > 3 && (
                  <div className="text-[10px] text-gray-500">
                    +{dayEvs.length - 3}개 더
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 선택 날짜 detail */}
      {selectedDate && (
        <div className="mt-4 border-t pt-4">
          <h3 className="font-medium text-gray-900 mb-2">
            {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월{' '}
            {selectedDate.getDate()}일 ({WEEKDAYS[selectedDate.getDay()]})
          </h3>
          {dayEvents.length === 0 ? (
            <p className="text-sm text-gray-500">이 날엔 등록된 이벤트가 없습니다.</p>
          ) : (
            <ul className="space-y-2">
              {dayEvents.map((ev) => {
                const start = new Date(ev.start_at);
                const end = ev.end_at ? new Date(ev.end_at) : null;
                const timeText = ev.all_day
                  ? '하루 종일'
                  : `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}` +
                    (end
                      ? ` – ${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`
                      : '');
                return (
                  <li
                    key={ev.id}
                    className={`border rounded-lg p-3 ${TYPE_COLOR[ev.type]} cursor-pointer hover:opacity-80`}
                    onClick={() => mode === 'edit' && openEditForm(ev)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium truncate">{ev.title}</div>
                        <div className="text-xs mt-0.5 opacity-80">
                          {TYPE_LABEL[ev.type]} · {timeText}
                          {ev.resident_id && residentNameById.get(ev.resident_id) && (
                            <> · {residentNameById.get(ev.resident_id)}</>
                          )}
                          {!ev.resident_id && <> · 시설 전체</>}
                        </div>
                        {ev.description && (
                          <p className="text-xs mt-1 whitespace-pre-wrap opacity-90">
                            {ev.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center pointer-events-none">
          <Loader2 className="animate-spin text-primary" size={24} />
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">
                {editingEvent ? '이벤트 수정' : '이벤트 등록'}
              </h3>
              <button onClick={closeForm} className="p-1 hover:bg-gray-100 rounded">
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-3">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">유형</label>
                <select
                  value={form.type}
                  onChange={(e) =>
                    setForm({ ...form, type: e.target.value as EventType })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="birthday">생신</option>
                  <option value="outing">외출/행사</option>
                  <option value="other">기타</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">대상</label>
                <select
                  value={form.resident_id}
                  onChange={(e) => setForm({ ...form, resident_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">시설 전체</option>
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">제목</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="예: 5월 야유회"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.all_day}
                  onChange={(e) => setForm({ ...form, all_day: e.target.checked })}
                />
                하루 종일
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">시작 날짜</label>
                  <input
                    type="date"
                    value={form.start_date}
                    onChange={(e) =>
                      setForm({ ...form, start_date: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>
                {!form.all_day && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">시작 시각</label>
                    <input
                      type="time"
                      value={form.start_time}
                      onChange={(e) =>
                        setForm({ ...form, start_time: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
                    />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-600 mb-1">종료 날짜 (선택)</label>
                  <input
                    type="date"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                </div>
                {!form.all_day && (
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">종료 시각</label>
                    <input
                      type="time"
                      value={form.end_time}
                      onChange={(e) =>
                        setForm({ ...form, end_time: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t flex items-center justify-between gap-2">
              {editingEvent ? (
                <button
                  onClick={onDelete}
                  disabled={submitting}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                >
                  <Trash2 size={16} />
                  삭제
                </button>
              ) : (
                <span />
              )}
              <div className="flex items-center gap-2">
                <button
                  onClick={closeForm}
                  disabled={submitting}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  onClick={() => void submitForm()}
                  disabled={submitting}
                  className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : editingEvent ? (
                    '수정'
                  ) : (
                    '등록'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventsCalendar;
