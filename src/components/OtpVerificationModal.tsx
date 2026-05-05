import React, { useEffect, useRef, useState } from 'react';
import { X, Phone, Loader2, Check, AlertTriangle } from 'lucide-react';
import { apiClient } from '../utils/api';

interface OtpVerificationModalProps {
  isOpen: boolean;
  defaultPhone?: string;
  purpose?: string;
  onVerified: (phone: string) => void;
  onClose: () => void;
}

type Step = 'phone' | 'confirm' | 'code' | 'duplicate' | 'report' | 'reported';

const RESEND_COOLDOWN_SECONDS = 60;

const formatPhone = (digits: string) => {
  if (digits.length === 11) return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return digits;
};

const OtpVerificationModal: React.FC<OtpVerificationModalProps> = ({
  isOpen,
  defaultPhone = '',
  purpose = '시설 연결 요청을 위해 휴대폰 인증이 필요합니다.',
  onVerified,
  onClose,
}) => {
  const [phone, setPhone] = useState(defaultPhone);
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>('phone');
  const [cooldown, setCooldown] = useState(0);
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [error, setError] = useState('');
  const [reportNote, setReportNote] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone(defaultPhone);
      setCode('');
      setStep('phone');
      setError('');
      setCooldown(0);
      setReportNote('');
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

  const digits = phone.replace(/\D/g, '');

  const handleProceedToConfirm = () => {
    setError('');
    if (digits.length < 10 || !digits.startsWith('01')) {
      setError('올바른 휴대폰 번호를 입력해주세요.');
      return;
    }
    setStep('confirm');
  };

  const handleSend = async () => {
    setError('');
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
    setIsVerifying(true);
    try {
      await apiClient.verifyPhoneOtp(digits, code.trim());
      onVerified(digits);
    } catch (err: any) {
      const status = err.response?.status;
      if (status === 409) {
        setStep('duplicate');
        return;
      }
      setError(err.response?.data?.detail || '인증에 실패했습니다.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReport = async () => {
    setError('');
    setIsReporting(true);
    try {
      await apiClient.reportPhoneClaim(digits, reportNote.trim());
      setStep('reported');
    } catch (err: any) {
      setError(err.response?.data?.detail || '신고 접수에 실패했습니다.');
    } finally {
      setIsReporting(false);
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
          {step !== 'duplicate' && step !== 'report' && step !== 'reported' && (
            <p className="text-xs text-gray-500">{purpose}</p>
          )}

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
                onClick={handleProceedToConfirm}
                disabled={!phone.trim()}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                다음
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 space-y-1">
                <p className="text-sm text-amber-900 font-medium">아래 번호로 등록됩니다</p>
                <p className="text-lg font-semibold text-gray-900">{formatPhone(digits)}</p>
                <p className="text-xs text-amber-800">
                  본인 휴대폰이 맞는지 확인해주세요. 인증 후 이 번호가 계정에 등록되며,
                  이미 다른 계정에 등록된 번호라면 인증할 수 없습니다.
                </p>
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
                  onClick={handleSend}
                  disabled={isSending}
                  className="flex-1 bg-primary text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                >
                  {isSending ? <Loader2 size={16} className="animate-spin" /> : null}
                  인증번호 발송
                </button>
              </div>
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
                <p className="text-xs text-gray-400 mt-1">{formatPhone(digits)} 로 발송된 6자리 코드를 입력하세요</p>
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

          {step === 'duplicate' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-medium text-sm">
                  <AlertTriangle size={16} />
                  이미 다른 계정에 등록된 번호입니다
                </div>
                <p className="text-xs text-red-700">
                  {formatPhone(digits)} 는 이미 등록되어 있어 이 계정에 인증할 수 없습니다.
                  본인 번호인데 등록한 적이 없다면 고객센터로 문의해주세요.
                </p>
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
                  onClick={() => setStep('report')}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition text-sm"
                >
                  내 번호 아닌가요?
                </button>
              </div>
            </>
          )}

          {step === 'report' && (
            <>
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">{formatPhone(digits)}</span> 등록을 신고합니다.
                </p>
                <p className="text-xs text-gray-500">
                  본인이 등록한 적 없는 번호임을 알려주세요. 운영자가 확인 후 조치합니다.
                </p>
                <textarea
                  value={reportNote}
                  onChange={(e) => setReportNote(e.target.value)}
                  placeholder="추가 설명 (선택)"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep('duplicate')}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  뒤로
                </button>
                <button
                  type="button"
                  onClick={handleReport}
                  disabled={isReporting}
                  className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 text-sm flex items-center justify-center gap-1"
                >
                  {isReporting ? <Loader2 size={16} className="animate-spin" /> : null}
                  신고 접수
                </button>
              </div>
            </>
          )}

          {step === 'reported' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 space-y-1">
                <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
                  <Check size={16} />
                  신고가 접수되었습니다
                </div>
                <p className="text-xs text-green-700">
                  운영자가 검토 후 조치합니다. 추가 문의가 필요하면 고객센터로 연락 주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:opacity-90 transition text-sm"
              >
                닫기
              </button>
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
