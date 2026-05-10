import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, MessageSquare, ArrowLeft } from 'lucide-react';
import { apiClient } from '../utils/api';

/**
 * T-306: 비밀번호 재설정 요청 페이지.
 * 채널 (이메일 | 문자메시지) 선택 → identifier 입력 → 요청.
 * 응답은 사용자 존재 여부와 무관하게 항상 generic 200 (enumeration 방지) 라
 * UI 도 항상 동일 "확인되었습니다" 메시지를 보여준다.
 */
const ForgotPasswordPage: React.FC = () => {
  const [channel, setChannel] = useState<'email' | 'sms'>('email');
  const [identifier, setIdentifier] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      await apiClient.passwordResetRequest({ identifier: identifier.trim(), channel });
      setSubmitted(true);
    } catch (err: any) {
      // 4xx (잘못된 channel / 빈 identifier) 만 여기 도달. 매칭 실패는 200.
      setError(err.response?.data?.detail || '요청 처리 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChannelChange = (next: 'email' | 'sms') => {
    setChannel(next);
    setIdentifier('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl font-bold text-primary">SA</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">비밀번호 찾기</h1>
          <p className="text-blue-100 text-sm">
            가입 시 사용한 이메일 또는 전화번호로 재설정 링크를 받으세요
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-soft-lg p-8">
          {submitted ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                <p className="font-semibold mb-1">요청이 접수되었습니다.</p>
                <p>
                  가입된 계정이면 {channel === 'email' ? '이메일' : '문자메시지'}로
                  재설정 링크를 받게 됩니다. 30분 이내에 확인해주세요.
                </p>
              </div>
              <Link
                to="/login"
                className="block w-full text-center bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                로그인 화면으로
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* 채널 선택 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  받을 채널
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleChannelChange('email')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium border transition ${
                      channel === 'email'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                    }`}
                  >
                    <Mail size={18} />
                    이메일
                  </button>
                  <button
                    type="button"
                    onClick={() => handleChannelChange('sms')}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg font-medium border transition ${
                      channel === 'sms'
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-primary'
                    }`}
                  >
                    <MessageSquare size={18} />
                    문자메시지
                  </button>
                </div>
              </div>

              {/* identifier 입력 */}
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  {channel === 'email' ? '이메일' : '전화번호'}
                </label>
                <input
                  type={channel === 'email' ? 'email' : 'tel'}
                  inputMode={channel === 'email' ? 'email' : 'tel'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={channel === 'email' ? 'example@example.com' : '01012345678'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  required
                />
                {channel === 'sms' && (
                  <p className="text-xs text-gray-500 mt-1">
                    하이픈 없이 숫자만 입력 (가입 시 인증한 번호)
                  </p>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !identifier.trim()}
                className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '요청 중...' : '재설정 링크 받기'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            <Link
              to="/login"
              className="inline-flex items-center gap-1 text-primary font-medium hover:underline"
            >
              <ArrowLeft size={14} />
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
