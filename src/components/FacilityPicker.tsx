import React, { useEffect, useRef, useState } from 'react';
import { Search, Building2, MapPin, Phone, Loader2, X, Check } from 'lucide-react';
import { apiClient } from '../utils/api';

interface FacilitySearchResult {
  id: string;
  name: string;
  address: string;
  phone_last4?: string | null;
  code: string;
}

interface FacilityPickerProps {
  value: FacilitySearchResult | null;
  onChange: (facility: FacilitySearchResult | null) => void;
  placeholder?: string;
}

const FacilityPicker: React.FC<FacilityPickerProps> = ({
  value,
  onChange,
  placeholder = '시설 이름, 주소, 전화번호로 검색',
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FacilitySearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // debounce 검색
  useEffect(() => {
    if (value) return; // 이미 선택된 상태면 검색 안 함
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setError('');
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      setError('');
      try {
        const resp = await apiClient.searchFacilities(q);
        setResults(resp.data);
        setHighlight(0);
      } catch (err: any) {
        const msg = err.response?.data?.detail || '검색에 실패했습니다.';
        setError(msg);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, value]);

  // 바깥 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (f: FacilitySearchResult) => {
    onChange(f);
    setQuery('');
    setResults([]);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleSelect(results[highlight]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  // 이미 선택된 상태 — 카드 UI
  if (value) {
    return (
      <div className="border-2 border-primary bg-blue-50 rounded-lg p-3 flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
          <Check className="text-white" size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-900 text-sm truncate">{value.name}</div>
          <div className="text-xs text-gray-600 flex items-center gap-1 mt-0.5">
            <MapPin size={12} className="flex-shrink-0" />
            <span className="truncate">{value.address}</span>
          </div>
          {value.phone_last4 && (
            <div className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Phone size={12} /> ****-{value.phone_last4}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
          aria-label="시설 선택 취소"
        >
          <X size={18} />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 animate-spin" size={16} />
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {error && (
            <div className="px-4 py-3 text-sm text-red-600">{error}</div>
          )}
          {!isLoading && !error && results.length === 0 && (
            <div className="px-4 py-4 text-sm text-gray-500 text-center">
              검색 결과가 없습니다.<br />
              <span className="text-xs text-gray-400">시설 관리자에게 문의해주세요.</span>
            </div>
          )}
          {results.map((f, idx) => (
            <button
              key={f.id}
              type="button"
              onClick={() => handleSelect(f)}
              onMouseEnter={() => setHighlight(idx)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 transition ${
                idx === highlight ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start gap-2">
                <Building2 className="text-gray-400 flex-shrink-0 mt-0.5" size={16} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 text-sm truncate">{f.name}</div>
                  <div className="text-xs text-gray-500 truncate">{f.address}</div>
                  {f.phone_last4 && (
                    <div className="text-xs text-gray-400 mt-0.5">전화 ****-{f.phone_last4}</div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && query.trim().length > 0 && query.trim().length < 2 && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-4 py-3 text-xs text-gray-500">
          2글자 이상 입력해주세요.
        </div>
      )}
    </div>
  );
};

export default FacilityPicker;
export type { FacilitySearchResult };
