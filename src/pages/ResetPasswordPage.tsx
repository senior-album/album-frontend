import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Lock, CheckCircle2 } from 'lucide-react';
import { apiClient } from '../utils/api';

/**
 * T-306: 비밀번호 재설정 토큰 확정 페이지.
 * URL = /reset-password/:token. 토큰 유효성은 confirm 호출 시점에서만 검증
 * (생성 시점에 noop GET 같은 거 별도 안 함 — 30분 TTL 토큰 한 번만 쓰면 됨).
 */
const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!token) {
      setError('잘못된 링크입니다.');
      return;
    }
    if (newPassword.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }
    setIsLoading(true);
    try {
      await apiClient.passwordResetConfirm({ token, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err: any) {
      setError(
        err.response?.data?.detail ||
          '토큰이 유효하지 않거나 만료되었습니다. 다시 요청해주세요.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl font-bold text-primary">SA</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">새 비밀번호 설정</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-soft-lg p-8">
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold mb-1">비밀번호가 변경되었습니다.</p>
                  <p>잠시 후 로그인 화면으로 이동합니다.</p>
                </div>
              </div>
              <Link
                to="/login"
                className="block w-full text-center bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition"
              >
                지금 로그인하기
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  새 비밀번호
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">최소 8자 이상</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  비밀번호 확인
                </label>
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    minLength={8}
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading || !newPassword || !confirmPassword}
                className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-gray-500">
            <Link to="/forgot-password" className="text-primary font-medium hover:underline">
              링크를 다시 받기
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
