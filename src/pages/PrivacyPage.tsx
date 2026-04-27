import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { apiClient } from '../utils/api';

/**
 * T-020 PR3b — 동적 개인정보처리방침.
 *
 * 본문 (content) 은 consent_documents 의 활성 'privacy' row 에서, 회사 정보 (시행일·연락처
 * 등) 는 legal_settings 에서 읽는다. 운영자가 어드민 페이지에서 편집한 값이 그대로 노출.
 *
 * 시행일이 비어 있거나 미래면 amber 배너로 "초안 상태" 안내. 운영자가 시행일을 채우는 순간
 * 자동으로 숨겨짐.
 */

type ConsentDocument = {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  effective_from: string;
};

const PrivacyPage: React.FC = () => {
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
        const privacy = docs.find((d) => d.type === 'privacy');
        if (privacy) {
          setContent(privacy.content);
          setVersion(privacy.version);
        } else {
          setContent('');
        }
        setSettings(settingsRes.data ?? {});
      })
      .catch(() => {
        if (cancelled) return;
        setError('처리방침을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const effectiveDate = settings.privacy_effective_date || '';
  // 시행일이 비어있거나 오늘 기준 미래일 때 초안 상태로 간주.
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
          <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
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
                  본 방침은 초안 상태이며, 정식 시행 전에 변경될 수 있습니다.
                  변경 시 시행 7일 전 (중대 변경은 30일 전) 공지합니다.
                </p>
              )}

              {/* 본문 — 운영자가 어드민에서 편집한 markdown 을 그대로 표시 (현재는 plain pre 렌더, 추후 markdown 파서 도입 가능) */}
              <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
                {content || '약관 본문이 등록되지 않았습니다.'}
              </pre>

              {(settings.dpo_name || settings.dpo_email || settings.dpo_phone) && (
                <section className="pt-4 border-t border-gray-100">
                  <h2 className="text-base font-semibold text-gray-900 mb-2">개인정보 보호책임자</h2>
                  {settings.dpo_name && <p>책임자: {settings.dpo_name}</p>}
                  {settings.dpo_email && <p>이메일: {settings.dpo_email}</p>}
                  {settings.dpo_phone && <p>전화: {settings.dpo_phone}</p>}
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
