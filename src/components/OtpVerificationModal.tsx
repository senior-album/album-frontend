import React, { useEffect, useRef, useState } from 'react';
import { X, Phone, Loader2, Check } from 'lucide-react';
import { apiClient } from '../utils/api';

interface OtpVerificationModalProps {
  isOpen: boolean;
  defaultPhone?: string;
  purpose?: string;
  onVerified: (phone: string) => void;
  onClose: () => void;
}

const RESEND_COOLDOWN_SECONDS = 60;

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  defaultPhone = '',
  purpose = '시설 연결 요청을 위해 휴대폰 인증이 필요합니다.',
  onVerified,
  onClose,
}) => {
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone);
      setCode('');
      setStep('phone');
      setError('');
      setCooldown(0);
    }
  }, [isOpen, defaultPhone]);

  useEffect(() => {
    if (cooldown <= 0) {
      if (timerRef.current) window.clearInterval(timerRef.current);
      return;
    }
    timerRef.current = window.setInterval(() => {
      setCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, [cooldown]);

  if (!isOpen) return null;

  const handleSend = async () => {
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10 || !digits.startsWith('01')) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setIsSending(true);
    try {
      await apiClient.sendPhoneOtp(digits);
      setStep('code');
      setCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err: any) {
      setError(err.response?.data?.detail || '인증번호 발송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    setError('');
    if (code.trim().length !== 6) {
      setError('6자리 인증번호를 입력해주세요.');
      return;
    }
    const digits = phone.replace(/\D/g, '');
    setIsVerifying(true);
    try {
      await apiClient.verifyPhoneOtp(digits, code.trim());
      onVerified(digits);
    } catch (err: any) {
      setError(err.response?.data?.detail || '인증에 실패했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">휴대폰 인증</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
            aria-label="닫기"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">{purpose}</p>

          {step === 'phone' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">휴대폰 번호</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                  <input
                    type="tel"
                    inputMode="numeric"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="01012345678"
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    autoFocus
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleSend}
                disabled={isSending || !phone.trim()}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
              >
                {isSending ? <Loader2 size={16} className="animate-spin" /> : null}
                인증번호 발송
              </button>
            </>
          )}

          {step === 'code' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-700">인증번호 6자리</label>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={cooldown > 0 || isSending}
                    className="text-xs text-primary disabled:text-gray-400"
                  >
                    {cooldown > 0 ? `재전송 (${cooldown}s)` : '재전송'}
                  </button>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-lg text-center tracking-widest font-mono"
                  autoFocus
                />
                <p className="text-xs text-gray-400 mt-1">{phone} 로 발송된 6자리 코드를 입력하세요</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('phone')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  번호 변경
                </button>
                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying || code.length !== 6}
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-1"
                >
                  {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  확인
                </button>
              </div>
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{error}</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OtpVerificationModal;
