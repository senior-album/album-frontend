import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { Mail, Lock, LogIn } from 'lucide-react';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [kakaoLoading, setKakaoLoading] = useState(false);

  const handleKakaoLogin = async () => {
    setKakaoLoading(true);
    try {
      const response = await apiClient.getKakaoLoginUrl();
      window.location.href = response.data.login_url;
    } catch (err: any) {
      setError(err.response?.data?.detail || '카카오 로그인을 시작할 수 없습니다.');
      setKakaoLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(email, password);
      const { user, facility } = response.data;

      localStorage.setItem('user', JSON.stringify(user));
      if (facility) {
        localStorage.setItem('facility', JSON.stringify(facility));
      }

      setUser(user);

      if (user.role === 'staff') {
        navigate('/dashboard');
      } else {
        navigate('/guardian');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '로그인 실패. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-4xl font-bold text-primary">SA</span>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Senior Album</h1>
          <p className="text-blue-100">어르신의 소중한 순간을 함께 합니다</p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-2xl shadow-soft-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <LogIn size={20} />
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-white text-gray-400">또는</span>
            </div>
          </div>

          {/* Kakao Login */}
          <button
            onClick={handleKakaoLogin}
            disabled={kakaoLoading}
            className="w-full flex items-center justify-center gap-3 py-2.5 rounded-lg font-semibold transition disabled:opacity-50"
            style={{ backgroundColor: '#FEE500', color: '#191919' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 3C6.48 3 2 6.48 2 10.5c0 2.55 1.68 4.8 4.22 6.13-.18.65-.67 2.35-.77 2.72-.12.46.17.45.36.33.15-.1 2.37-1.6 3.35-2.25.6.09 1.22.13 1.84.13 5.52 0 10-3.48 10-7.77S17.52 3 12 3z"
                fill="#191919"
              />
            </svg>
            {kakaoLoading ? '연결 중...' : '카카오로 시작하기'}
          </button>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>아직 계정이 없으신가요? <Link to="/register" className="text-primary font-medium hover:underline">이메일로 가입하기</Link></p>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center text-blue-100 text-sm space-y-2">
          <div className="flex justify-center gap-4">
            <Link to="/terms" className="hover:underline">이용약관</Link>
            <span aria-hidden="true">·</span>
            <Link to="/privacy" className="hover:underline font-semibold">개인정보처리방침</Link>
          </div>
          <p>© 2024 Senior Album. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
