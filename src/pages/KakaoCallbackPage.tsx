import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../utils/api';
import { Loader2 } from 'lucide-react';

const KakaoCallbackPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setUser } = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setError('인증 코드가 없습니다.');
      return;
    }

    const handleCallback = async () => {
      try {
        const response = await apiClient.kakaoCallback(code);
        const { accessToken, isNewUser, user, facility } = response.data;

        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('user', JSON.stringify(user));
        if (facility) {
          localStorage.setItem('facility', JSON.stringify(facility));
        }

        setUser(user);

        if (isNewUser || user.role === 'pending') {
          // 신규 사용자 → 역할 선택
          navigate('/select-role');
        } else if (user.role === 'staff') {
          navigate('/dashboard');
        } else {
          navigate('/guardian');
        }
      } catch (err: any) {
        console.error('Kakao callback error:', err);
        setError(err.response?.data?.detail || '카카오 로그인에 실패했습니다.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setUser]);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-red-500 text-5xl mb-4">!</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">로그인 실패</h2>
          <p className="text-gray-500 mb-4">{error}</p>
          <p className="text-sm text-gray-400">잠시 후 로그인 페이지로 이동합니다...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-secondary flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
        <Loader2 className="animate-spin text-yellow-500 mx-auto mb-4" size={48} />
        <h2 className="text-xl font-bold text-gray-900 mb-2">카카오 로그인 중...</h2>
        <p className="text-gray-500">잠시만 기다려주세요.</p>
      </div>
    </div>
  );
};

export default KakaoCallbackPage;
