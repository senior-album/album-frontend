import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../utils/api';

/**
 * T-020 PR3b — 동적 이용약관.
 *
 * 백엔드는 현재 보호자용 (terms_guardian) 만 publish 대상. 시설 사업자용 약관은 SaaS 계약서로
 * 별도 처리 — 본 페이지는 보호자용 본문 + 시행일을 동적으로 노출하고, 시설용은 "별도 계약서로
 * 제공" 안내로 대체. (필요 시 향후 terms_facility type 으로 확장.)
 */

type ConsentDocument = {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  effective_from: string;
};

const TermsPage: React.FC = () => {
  const [content, setContent] = useState<string | null>(null);
  const [version, setVersion] = useState<string>('');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      apiClient.getActiveConsents(),
      apiClient.getLegalSettings(),
    ])
      .then(([consentsRes, settingsRes]) => {
        if (cancelled) return;
        const docs: ConsentDocument[] = consentsRes.data ?? [];
        const terms = docs.find((d) => d.type === 'terms_guardian');
        if (terms) {
          setContent(terms.content);
          setVersion(terms.version);
        } else {
          setContent('');
        }
        setSettings(settingsRes.data ?? {});
      })
      .catch(() => {
        if (cancelled) return;
        setError('약관을 불러오지 못했습니다.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveDate = settings.terms_effective_date || '';
  const isDraft =
    !effectiveDate ||
    /^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) === false ||
    effectiveDate > new Date().toISOString().slice(0, 10);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/login" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">이용약관</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-soft p-6 sm:p-10 space-y-6 text-sm leading-relaxed text-gray-800">
          {loading && <p className="text-gray-400">불러오는 중...</p>}
          {!loading && error && (
            <p className="bg-red-50 border border-red-200 text-red-700 rounded p-3">{error}</p>
          )}
          {!loading && !error && (
            <>
              <p className="text-xs text-gray-500">
                {effectiveDate && `시행일: ${effectiveDate}`}
                {version && ` · 버전 ${version}`}
              </p>

              {isDraft && (
                <p className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-900">
                  본 약관은 초안 상태이며, 정식 시행 전에 변경될 수 있습니다.
                </p>
              )}

              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {content || '약관 본문이 등록되지 않았습니다.'}
              </pre>

              <p className="text-xs text-gray-500 pt-3 border-t border-gray-100">
                시설 사업자용 SaaS 이용약관은 계약서로 별도 제공됩니다.
                {settings.customer_support_email && ` 문의: ${settings.customer_support_email}`}
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default TermsPage;
