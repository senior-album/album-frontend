import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { Building2, MapPin, Loader2, ArrowLeft } from 'lucide-react';

type Role = 'admin' | 'staff' | 'guardian';

const SelectRolePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, setUser } = useAuth();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>('guardian');

  // 시설 관리자
  const [facilityName, setFacilityName] = useState('');
  const [facilityAddress, setFacilityAddress] = useState('');
  const [facilityPhone, setFacilityPhone] = useState('');

  // 시설 직원
  const [facilityCode, setFacilityCode] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const roles: { id: Role; icon: string; label: string; desc: string }[] = [
    { id: 'admin', icon: '🏢', label: '시설 등록', desc: '새 시설을 등록하고 관리합니다' },
    { id: 'staff', icon: '🏥', label: '시설 직원', desc: '기존 시설에 직원으로 합류합니다' },
    { id: 'guardian', icon: '👨‍👩‍👧', label: '보호자', desc: '입소 중인 가족의 사진을 봅니다' },
  ];

  const handleSelectRole = (r: Role) => {
    setRole(r);
    if (r === 'guardian') {
      // 보호자는 추가 정보 없이 바로 설정
      submitRole(r);
    } else {
      setStep(2);
    }
  };

  const submitRole = async (selectedRole?: Role) => {
    const r = selectedRole || role;
    setIsLoading(true);
    setError('');

    try {
      const data: any = { role: r === 'admin' ? 'admin' : r };

      if (r === 'admin') {
        if (!facilityName.trim() || !facilityAddress.trim()) {
          setError('시설 이름과 주소를 입력해주세요.');
          setIsLoading(false);
          return;
        }
        data.facility_name = facilityName;
        data.facility_address = facilityAddress;
        data.facility_phone = facilityPhone || undefined;
      } else if (r === 'staff') {
        if (!facilityCode.trim()) {
          setError('시설 코드를 입력해주세요.');
          setIsLoading(false);
          return;
        }
        data.facility_code = facilityCode;
      }

      const response = await apiClient.setRoleAfterKakao(data);
      const { accessToken, user: userData, facility } = response.data;

      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('user', JSON.stringify(userData));
      if (facility) {
        localStorage.setItem('facility', JSON.stringify(facility));
      }

      setUser(userData);

      if (userData.role === 'staff') {
        navigate('/dashboard');
      } else {
        navigate('/guardian');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || '설정에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 1: 역할 선택
  if (step === 1) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            {user?.profile_image ? (
              <img src={user.profile_image} alt="" className="w-16 h-16 rounded-full mx-auto mb-3 border-2 border-white shadow-lg" />
            ) : (
              <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg">
                <span className="text-2xl">🎉</span>
              </div>
            )}
            <h1 className="text-2xl font-bold text-white mb-1">
              환영합니다, {user?.name || '사용자'}님!
            </h1>
            <p className="text-blue-100 text-sm">어떤 용도로 사용하시나요?</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-7 space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="animate-spin text-primary" size={32} />
                <span className="ml-3 text-gray-500">설정 중...</span>
              </div>
            ) : (
              <>
                {roles.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => handleSelectRole(r.id)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-gray-100 hover:border-primary hover:bg-blue-50 transition text-left group"
                  >
                    <span className="text-3xl">{r.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800 group-hover:text-primary transition">{r.label}</div>
                      <div className="text-xs text-gray-400">{r.desc}</div>
                    </div>
                    <svg className="w-5 h-5 text-gray-300 group-hover:text-primary transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Step 2: 추가 정보 입력
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl">{roles.find(r => r.id === role)?.icon}</span>
          <h1 className="text-2xl font-bold text-white mt-2 mb-1">{roles.find(r => r.id === role)?.label}</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-7">
          <form
            onSubmit={(e) => { e.preventDefault(); submitRole(); }}
            className="space-y-4"
          >
            {role === 'admin' && (
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-primary flex items-center gap-2">
                  <Building2 size={16} /> 시설 정보
                </h3>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 이름 *</label>
                  <input
                    type="text" value={facilityName} onChange={(e) => setFacilityName(e.target.value)}
                    placeholder="예: 행복요양원"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 주소 *</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text" value={facilityAddress} onChange={(e) => setFacilityAddress(e.target.value)}
                      placeholder="서울시 강남구 테헤란로 123"
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">시설 전화번호</label>
                  <input
                    type="tel" value={facilityPhone} onChange={(e) => setFacilityPhone(e.target.value)}
                    placeholder="02-1234-5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
            )}

            {role === 'staff' && (
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-1">시설 코드</label>
                <input
                  type="text" value={facilityCode} onChange={(e) => setFacilityCode(e.target.value)}
                  placeholder="시설 관리자에게 받은 코드 (예: FAC-A1B2C3)"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition flex items-center justify-center gap-1"
              >
                <ArrowLeft size={16} /> 뒤로
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {isLoading ? '처리 중...' : '완료'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SelectRolePage;
