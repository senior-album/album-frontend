import React, { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowLeft, Save, Send } from 'lucide-react';
import { apiClient } from '../utils/api';
import { useAuth } from '../context/AuthContext';

/**
 * T-020 PR3b — 운영자 어드민. /admin/legal-settings.
 *
 * 두 섹션으로 구성:
 *  1) 회사 정보 (legal_settings KV 편집) — Save 버튼 1개로 변경된 키만 PUT.
 *  2) 약관 본문 publish — type 선택 후 새 version 입력 + content (markdown)
 *     공백 → POST /consents/admin/publish 로 신규 row 생성, 이전 활성 row 자동 만료.
 *
 * 운영자 (user.is_operator) 가 아니면 즉시 /login 으로 리다이렉트.
 */

type SettingKey = string;

const SETTING_LABELS: Record<string, { label: string; placeholder?: string }> = {
  company_name: { label: '회사명' },
  company_address: { label: '회사 주소' },
  ceo_name: { label: '대표자명' },
  business_no: { label: '사업자등록번호', placeholder: '123-45-67890' },
  dpo_name: { label: '개인정보 보호책임자' },
  dpo_email: { label: 'DPO 이메일' },
  dpo_phone: { label: 'DPO 전화', placeholder: '02-1234-5678' },
  privacy_effective_date: { label: '개인정보처리방침 시행일', placeholder: 'YYYY-MM-DD' },
  terms_effective_date: { label: '이용약관 시행일', placeholder: 'YYYY-MM-DD' },
  customer_support_email: { label: '고객 지원 이메일' },
};

type ConsentDocumentRow = {
  id: string;
  type: string;
  version: string;
  title: string;
  content: string;
  is_mandatory: boolean;
  effective_from: string;
  effective_until: string | null;
};

const CONSENT_TYPE_LABELS: Record<string, string> = {
  terms_guardian: '보호자 이용약관',
  privacy: '개인정보처리방침',
  sensitive_info: '민감정보 처리 동의서',
  marketing: '마케팅·알림 수신 동의',
};

const AdminLegalSettingsPage: React.FC = () => {
  const { user } = useAuth();

  // 회사 정보
  const [settings, setSettings] = useState<Record<SettingKey, string>>({});
  const [originalSettings, setOriginalSettings] = useState<Record<SettingKey, string>>({});
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsMsg, setSettingsMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  // 약관 본문
  const [docs, setDocs] = useState<ConsentDocumentRow[]>([]);
  const [publishType, setPublishType] = useState<string>('privacy');
  const [publishVersion, setPublishVersion] = useState<string>('');
  const [publishTitle, setPublishTitle] = useState<string>('');
  const [publishContent, setPublishContent] = useState<string>('');
  const [publishIsMandatory, setPublishIsMandatory] = useState<boolean | null>(null); // null = 이전값 승계
  const [publishing, setPublishing] = useState(false);
  const [publishMsg, setPublishMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.is_operator) return;
    let cancelled = false;
    setLoading(true);
    Promise.all([apiClient.getLegalSettings(), apiClient.getAllConsentDocuments()])
      .then(([settingsRes, docsRes]) => {
        if (cancelled) return;
        const data = settingsRes.data ?? {};
        setSettings(data);
        setOriginalSettings(data);
        setDocs(docsRes.data ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setSettingsMsg({ kind: 'err', text: '데이터를 불러오지 못했습니다.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.is_operator]);

  if (!user) return <Navigate to="/login" replace />;
  if (!user.is_operator) return <Navigate to="/login" replace />;

  const handleSettingChange = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const dirtySettings = Object.keys(settings).reduce<Record<string, string>>((acc, k) => {
    if (settings[k] !== (originalSettings[k] ?? '')) acc[k] = settings[k];
    return acc;
  }, {});

  const saveSettings = async () => {
    if (Object.keys(dirtySettings).length === 0) return;
    setSettingsSaving(true);
    setSettingsMsg(null);
    try {
      const res = await apiClient.updateLegalSettings(dirtySettings);
      const updated = res.data ?? settings;
      setSettings(updated);
      setOriginalSettings(updated);
      setSettingsMsg({ kind: 'ok', text: '저장되었습니다.' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '저장에 실패했습니다.';
      setSettingsMsg({ kind: 'err', text: detail });
    } finally {
      setSettingsSaving(false);
    }
  };

  const publishDoc = async () => {
    setPublishMsg(null);
    if (!publishVersion.trim() || !publishTitle.trim() || !publishContent.trim()) {
      setPublishMsg({ kind: 'err', text: '버전 / 제목 / 본문을 모두 입력하세요.' });
      return;
    }
    setPublishing(true);
    try {
      const res = await apiClient.publishConsentDocument({
        type: publishType,
        version: publishVersion.trim(),
        title: publishTitle.trim(),
        content: publishContent,
        is_mandatory: publishIsMandatory ?? undefined,
      });
      // 이력 갱신 (최신 row 가 active 가 되며 이전 active 는 effective_until 이 채워짐)
      const docsRes = await apiClient.getAllConsentDocuments();
      setDocs(docsRes.data ?? []);
      setPublishVersion('');
      setPublishTitle('');
      setPublishContent('');
      setPublishIsMandatory(null);
      setPublishMsg({ kind: 'ok', text: `${CONSENT_TYPE_LABELS[publishType]} ${res.data.version} 발행 완료.` });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || '발행에 실패했습니다.';
      setPublishMsg({ kind: 'err', text: detail });
    } finally {
      setPublishing(false);
    }
  };

  const docsByType = docs.reduce<Record<string, ConsentDocumentRow[]>>((acc, d) => {
    (acc[d.type] = acc[d.type] || []).push(d);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/dashboard" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-900">법령 설정</h1>
            <p className="text-xs text-gray-500">운영자 전용 — 회사 정보 + 약관 본문 발행</p>
          </div>
          <nav className="flex gap-3 text-xs">
            <Link to="/admin/users" className="text-gray-500 hover:text-gray-900">유저 관리</Link>
            <Link to="/admin/facilities" className="text-gray-500 hover:text-gray-900">시설 관리</Link>
            <Link to="/admin/guardians" className="text-gray-500 hover:text-gray-900">보호자 승인</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {loading && <p className="text-gray-400">불러오는 중...</p>}

        {!loading && (
          <>
            {/* === 1. 회사 정보 KV === */}
            <section className="bg-white rounded-lg shadow-soft p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">회사 정보</h2>
                <button
                  type="button"
                  disabled={settingsSaving || Object.keys(dirtySettings).length === 0}
                  onClick={saveSettings}
                  className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={14} />
                  {settingsSaving ? '저장 중...' : `저장 (${Object.keys(dirtySettings).length})`}
                </button>
              </div>

              {settingsMsg && (
                <p
                  className={`text-sm rounded p-2 mb-3 ${
                    settingsMsg.kind === 'ok'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {settingsMsg.text}
                </p>
              )}

              <div className="grid sm:grid-cols-2 gap-3">
                {Object.keys(SETTING_LABELS).map((key) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {SETTING_LABELS[key].label}
                      <span className="text-gray-400 ml-1">({key})</span>
                    </label>
                    <input
                      type="text"
                      value={settings[key] ?? ''}
                      onChange={(e) => handleSettingChange(key, e.target.value)}
                      placeholder={SETTING_LABELS[key].placeholder}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* === 2. 약관 본문 publish === */}
            <section className="bg-white rounded-lg shadow-soft p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-1">약관 본문 발행</h2>
              <p className="text-xs text-gray-500 mb-4">
                새 버전을 발행하면 동일 type 의 이전 활성 본문이 자동으로 만료됩니다.
                기존 가입자의 동의 기록 (user_consents) 은 그대로 보존되며, 신규 가입자는 새 버전에 동의하게 됩니다.
              </p>

              {publishMsg && (
                <p
                  className={`text-sm rounded p-2 mb-3 ${
                    publishMsg.kind === 'ok'
                      ? 'bg-green-50 border border-green-200 text-green-700'
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {publishMsg.text}
                </p>
              )}

              <div className="grid sm:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">유형</label>
                  <select
                    value={publishType}
                    onChange={(e) => setPublishType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CONSENT_TYPE_LABELS).map(([type, label]) => (
                      <option key={type} value={type}>
                        {label} ({type})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">새 버전</label>
                  <input
                    type="text"
                    value={publishVersion}
                    onChange={(e) => setPublishVersion(e.target.value)}
                    placeholder="v1.1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">필수 여부</label>
                  <select
                    value={publishIsMandatory === null ? 'inherit' : publishIsMandatory ? 'true' : 'false'}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPublishIsMandatory(v === 'inherit' ? null : v === 'true');
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="inherit">이전 버전 승계</option>
                    <option value="true">필수</option>
                    <option value="false">선택</option>
                  </select>
                </div>
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">제목</label>
                <input
                  type="text"
                  value={publishTitle}
                  onChange={(e) => setPublishTitle(e.target.value)}
                  placeholder="개인정보처리방침 v1.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-700 mb-1">본문 (markdown)</label>
                <textarea
                  value={publishContent}
                  onChange={(e) => setPublishContent(e.target.value)}
                  rows={18}
                  placeholder="# 개인정보처리방침&#10;&#10;## 1. 수집하는 개인정보 항목&#10;..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <button
                type="button"
                disabled={publishing}
                onClick={publishDoc}
                className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} />
                {publishing ? '발행 중...' : '새 버전 발행'}
              </button>
            </section>

            {/* === 3. 이력 === */}
            <section className="bg-white rounded-lg shadow-soft p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">발행 이력</h2>
              <div className="space-y-4">
                {Object.keys(CONSENT_TYPE_LABELS).map((type) => {
                  const rows = docsByType[type] ?? [];
                  return (
                    <div key={type}>
                      <h3 className="text-sm font-semibold text-gray-800 mb-1">
                        {CONSENT_TYPE_LABELS[type]} <span className="text-gray-400 text-xs">({type})</span>
                      </h3>
                      {rows.length === 0 && <p className="text-xs text-gray-400">발행된 버전이 없습니다.</p>}
                      <ul className="text-xs text-gray-700 space-y-0.5">
                        {rows.map((d) => {
                          const isActive = !d.effective_until;
                          return (
                            <li key={d.id} className="flex items-center gap-2">
                              <span className="font-mono text-gray-500">{d.version}</span>
                              <span>·</span>
                              <span>{d.title}</span>
                              <span>·</span>
                              <span className={isActive ? 'text-green-600 font-medium' : 'text-gray-400'}>
                                {isActive
                                  ? '활성'
                                  : `만료 (${new Date(d.effective_until!).toISOString().slice(0, 10)})`}
                              </span>
                              <span className="text-gray-400">
                                · 시행 {new Date(d.effective_from).toISOString().slice(0, 10)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
};

export default AdminLegalSettingsPage;
