import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { Mail, Lock, User, Phone, ArrowLeft, Building2, MapPin } from 'lucide-react';

type Role = 'admin' | 'staff' | 'guardian';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>('admin');

  // 공통
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 시설 관리자 전용
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityPhone, setFacilityPhone] = useState('');

  // 시설 직원 전용
  const [facilityCode, setFacilityCode] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validate = (): string | null => {
    if (!name.trim()) return '이름을 입력해주세요.';
    if (!email.trim()) return '이메일을 입력해주세요.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return '올바른 이메일 형식이 아닙니다.';
    if (!password) return '비밀번호를 입력해주세요.';
    if (password.length < 6) return '비밀번호는 6자 이상이어야 합니다.';
    if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다.';

    if (role === 'admin') {
      if (!facilityName.trim()) return '시설 이름을 입력해주세요.';
      if (!facilityAddress.trim()) return '시설 주소를 입력해주세요.';
    }
    if (role === 'staff' && !facilityCode.trim()) return '시설 코드를 입력해주세요.';
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
      let response;

      if (role === 'admin') {
        response = await apiClient.registerAdmin({
          email,
          password,
          name,
          phone: phone || undefined,
          facilityName,
          facilityAddress,
          facilityPhone: facilityPhone || undefined,
        });
      } else if (role === 'staff') {
        response = await apiClient.registerStaff({
          email,
          password,
          name,
          phone: phone || undefined,
          facilityCode,
        });
      } else {
        response = await apiClient.registerGuardian({
          email,
          password,
          name,
          phone: phone || undefined,
        });
      }

      const { user: userData, facility } = response.data;

      // 사용자/시설 정보 캐시 (JWT는 httpOnly 쿠키로 관리)
      localStorage.setItem('user', JSON.stringify(userData));
      if (facility) {
        localStorage.setItem('facility', JSON.stringify(facility));
      }

      setUser(userData);

      if (userData.role === 'guardian') {
        navigate('/guardian');
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail || '가입에 실패했습니다. 다시 시도해주세요.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const roles: { id: Role; icon: string; label: string; desc: string }[] = [
    { id: 'admin', icon: '🏢', label: '시설 등록', desc: '새 시설을 등록하고 관리합니다' },
    { id: 'staff', icon: '🏥', label: '시설 직원', desc: '기존 시설에 직원으로 합류합니다' },
    { id: 'guardian', icon: '👨‍👩‍👧', label: '보호자', desc: '입소 중인 가족의 사진을 봅니다' },
  ];

  // ===== STEP 1: 역할 선택 =====
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
              <span className="text-3xl font-bold text-primary">SA</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">회원가입</h1>
            <p className="text-blue-100 text-sm">어떤 용도로 사용하시나요?</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-7 space-y-3">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => { setRole(r.id); setStep(2); }}
                className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-blue-50 transition text-left group"
              >
                <span className="text-3xl">{r.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 group-hover:text-primary transition">{r.label}</div>
                  <div className="text-xs text-gray-400">{r.desc}</div>
                </div>
                <svg className="w-5 h-5 text-gray-300 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            ))}

            <div className="pt-3 text-center">
              <Link to="/login" className="text-sm text-gray-500 hover:text-primary transition inline-flex items-center gap-1">
                <ArrowLeft size={14} /> 로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== STEP 2: 정보 입력 =====
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg">
            <span className="text-3xl">{roles.find(r => r.id === role)?.icon}</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">{roles.find(r => r.id === role)?.label}</h1>
          <p className="text-blue-100 text-sm">{roles.find(r => r.id === role)?.desc}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-7">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* === 시설 관리자: 시설 정보 먼저 === */}
            {role === 'admin' && (
              <div className="bg-blue-50 rounded-xl p-4 space-y-3 mb-2">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Building2 size={16} /> 시설 정보
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 이름 *</label>
                  <input
                    type="text"
                    value={facilityName}
                    onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="예: 행복요양원"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 주소 *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      value={facilityAddress}
                      onChange={(e) => setFacilityAddress(e.target.value)}
                      placeholder="서울시 강남구 테헤란로 123"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 전화번호</label>
                  <input
                    type="tel"
                    value={facilityPhone}
                    onChange={(e) => setFacilityPhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  />
                </div>
              </div>
            )}

            {role === 'admin' && (
              <h3 className="text-sm font-bold text-gray-700 flex items-center gap-2 pt-1">
                <User size={16} /> 관리자 계정 정보
              </h3>
            )}

            {/* 이름 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">이름</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
              </div>
            </div>

            {/* 이메일 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">이메일</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
              </div>
            </div>

            {/* 전화번호 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">전화번호</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
              </div>
            </div>

            {/* 시설 직원: 시설 코드 */}
            {role === 'staff' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">시설 코드</label>
                <input type="text" value={facilityCode} onChange={(e) => setFacilityCode(e.target.value)}
                  placeholder="시설 관리자에게 받은 코드 (예: FAC-A1B2C3)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
                <p className="text-xs text-gray-400 mt-1">시설 관리자가 가입 시 발급받은 코드입니다</p>
              </div>
            )}

            {/* 보호자: 가입 후 별도로 열람 요청 안내 */}
            {role === 'guardian' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  가입 시 <strong>전화번호</strong>를 꼭 입력해주세요.
                  시설에서 해당 번호로 초대를 보내면 로그인 후 수락하여 사진을 열람할 수 있습니다.
                </p>
              </div>
            )}

            {/* 비밀번호 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">비밀번호</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="6자 이상"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
              </div>
            </div>

            {/* 비밀번호 확인 */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-1">비밀번호 확인</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="비밀번호를 다시 입력하세요"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm" />
              </div>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* 시설 관리자 안내 */}
            {role === 'admin' && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-xs text-amber-700">
                  💡 가입 완료 후 <strong>시설 코드</strong>가 발급됩니다. 이 코드를 직원과 보호자에게 공유하면 같은 시설에 연결됩니다.
                </p>
              </div>
            )}

            {/* 제출 */}
            <button type="submit" disabled={isLoading}
              className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm">
              {isLoading ? '처리 중...' : role === 'admin' ? '시설 등록 및 가입하기' : '가입하기'}
            </button>
          </form>

          {/* 뒤로 */}
          <div className="mt-5 text-center">
            <button onClick={() => { setStep(1); setError(''); }}
              className="text-sm text-gray-500 hover:text-primary transition inline-flex items-center gap-1">
              <ArrowLeft size={14} /> 역할 다시 선택하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
