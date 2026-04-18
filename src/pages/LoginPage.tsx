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
  const [role, setRole] = useState<'staff' | 'guardian'>('staff');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await apiClient.login(email, password);
      const { accessToken, user } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(user));

      setUser(user);

      if (user.role === 'staff') {
        navigate('/dashboard');
      } else {
        navigate('/guardian');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인 실패. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (demoRole: 'staff' | 'guardian') => {
    // Demo login with mock data
    const mockUser = {
      id: demoRole === 'staff' ? 'staff-001' : 'gua-001',
      email: demoRole === 'staff' ? 'staff@example.com' : 'guardian@example.com',
      name: demoRole === 'staff' ? '이순신 직원' : '김지은',
      role: demoRole,
      facilityId: demoRole === 'staff' ? 'fac-001' : undefined,
    };

    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('accessToken', 'demo-token-' + Date.now());

    setUser(mockUser);

    if (demoRole === 'staff') {
      navigate('/dashboard');
    } else {
      navigate('/guardian');
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
            {/* Role Selection */}
            <div className="space-y-3 mb-6">
              <label className="block text-sm font-semibold text-gray-900">역할 선택</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`p-3 rounded-lg border-2 transition font-medium ${
                    role === 'staff'
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  시설 직원
                </button>
                <button
                  type="button"
                  onClick={() => setRole('guardian')}
                  className={`p-3 rounded-lg border-2 transition font-medium ${
                    role === 'guardian'
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  보호자
                </button>
              </div>
            </div>

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

          {/* Demo Login */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-center text-sm text-gray-600 mb-3">
              데모로 둘러보기
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDemoLogin('staff')}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                직원 데모
              </button>
              <button
                type="button"
                onClick={() => handleDemoLogin('guardian')}
                className="py-2 px-4 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                보호자 데모
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-gray-500">
            <p>아직 계정이 없으신가요? <Link to="/register" className="text-primary font-medium hover:underline">가입하기</Link></p>
          </div>
        </div>

        {/* Info Footer */}
        <div className="mt-8 text-center text-blue-100 text-sm">
          <p>© 2024 Senior Album. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
