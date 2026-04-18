import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, Phone, ArrowLeft } from 'lucide-react';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [role, setRole] = useState<'staff' | 'guardian'>('staff');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [facilityCode, setFacilityCode] = useState('');
  const [residentName, setResidentName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return '이름을 입력해주세요.';
    if (!email.trim()) return '이메일을 입력해주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
    if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다.';
    if (role === 'staff' && !facilityCode.trim()) return '시설 코드를 입력해주세요.';
    if (role === 'guardian' && !residentName.trim()) return '입소자 이름을 입력해주세요.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsLoading(true);

    try {
      // 백엔드 연결 전 데모 모드로 동작
      const mockUser = {
        id: `${role}-${Date.now()}`,
        email,
        name,
        role,
        facilityId: role === 'staff' ? 'fac-001' : undefined,
      };

      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('accessToken', 'demo-token-' + Date.now());
      setUser(mockUser);

      if (role === 'staff') {
        navigate('/dashboard');
      } else {
        navigate('/guardian');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '가입에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-3xl font-bold text-primary">SA</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">회원가입</h1>
          <p className="text-blue-100 text-sm">Senior Album에 가입하고 소중한 순간을 함께하세요</p>
        </div>

        {/* Register Card */}
        <div className="bg-white rounded-2xl shadow-lg p-7">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">역할 선택</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('staff')}
                  className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                    role === 'staff'
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  🏥 시설 직원
                </button>
                <button
                  type="button"
                  onClick={() => setRole('guardian')}
                  className={`p-3 rounded-lg border-2 transition font-medium text-sm ${
                    role === 'guardian'
                      ? 'border-primary bg-blue-50 text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-primary'
                  }`}
                >
                  👨‍👩‍👧 보호자
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">이름</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Conditional: Facility Code or Resident Name */}
            {role === 'staff' ? (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">시설 코드</label>
                <input
                  type="text"
                  value={facilityCode}
                  onChange={(e) => setFacilityCode(e.target.value)}
                  placeholder="시설에서 제공받은 코드를 입력하세요"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">시설 관리자에게 문의하여 코드를 받으세요</p>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">입소자 이름 (보호 대상)</label>
                <input
                  type="text"
                  value={residentName}
                  onChange={(e) => setResidentName(e.target.value)}
                  placeholder="어머님 또는 아버님 성함"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
                <p className="text-xs text-gray-400 mt-1">시설에 입소 중인 보호 대상자의 이름을 입력하세요</p>
              </div>
            )}

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isLoading ? '가입 처리 중...' : '가입하기'}
            </button>
          </form>

          {/* Back to Login */}
          <div className="mt-5 text-center">
            <Link
              to="/login"
              className="text-sm text-gray-500 hover:text-primary transition inline-flex items-center gap-1"
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

export default RegisterPage;
