import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/login" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">개인정보처리방침</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-soft p-6 sm:p-10 space-y-6 text-sm leading-relaxed text-gray-800">
          <p className="text-xs text-gray-500">
            시행일: 2026-__-__ · 최종 수정일: 2026-04-22 (초안)
          </p>
          <p className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-900">
            본 방침은 초안 상태이며, 정식 시행 전에 변경될 수 있습니다. 변경 시 시행 7일 전(중대 변경은 30일 전) 공지합니다.
          </p>

          <p>
            Senior Album("회사")은 이용자의 개인정보를 중요하게 생각하며, 개인정보보호법 및 관련 법령을 준수합니다. 본 개인정보처리방침은 회사가 어떤 개인정보를, 어떤 방식으로 수집·이용·보관·파기하는지를 알려드립니다.
          </p>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">1. 수집하는 개인정보 항목</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>시설 직원: 이메일, 비밀번호(해시), 성명, 전화번호, 시설 정보</li>
              <li>보호자: 이메일 또는 카카오 OAuth 식별자, 성명, 전화번호</li>
              <li>입소자(시설 직원이 등록): 성명, 생년월일, 성별, 방번호</li>
              <li>민감정보(별도 동의 후): 건강 메모, 기준 얼굴 사진 및 얼굴 특징 벡터</li>
              <li>자동 수집: IP, User-Agent, 쿠키, 접속·이용 로그</li>
            </ul>
            <p className="mt-2">
              본 서비스는 만 14세 이상을 대상으로 하며, 만 14세 미만의 개인정보는 수집하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">2. 수집·이용 목적</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>회원 관리 (가입 확인, 본인 식별, 부정 이용 방지)</li>
              <li>서비스 제공 (사진 업로드·분류·공유, 보호자-입소자 연결)</li>
              <li>알림 발송 (카카오 알림톡, 이메일)</li>
              <li>서비스 개선 (익명화된 통계 분석)</li>
              <li>법적 의무 이행 (전자상거래법, 부가가치세법 등)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">3. 보유 및 이용 기간</h2>
            <p>
              수집·이용 목적 달성 후 지체없이 파기합니다. 다만 전자상거래법 등 관련 법령에 따라 보관 의무가 있는 경우 해당 기간(최대 5년) 동안 분리 보관합니다.
              회원 탈퇴 시 법령 보관 대상을 제외한 모든 개인정보는 30일 이내 복구 불가능하게 파기합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">4. 제3자 제공</h2>
            <p>
              회사는 이용자의 사전 동의 또는 법령상 요구가 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">5. 처리 위탁 및 국외 이전</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>자체 운영 인프라 (국내)</li>
              <li>Cloudflare Inc. — 네트워크 보안 및 백업 스토리지 (미국, 암호화 상태 저장)</li>
              <li>Kakao — 알림톡 발송 (국내)</li>
            </ul>
            <p className="mt-2">
              국외 이전을 원치 않는 이용자는 고객센터로 문의해주시기 바랍니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">6. 이용자의 권리</h2>
            <p>
              이용자는 언제든 개인정보의 열람·정정·삭제·처리정지를 요구할 수 있으며, 동의를 철회할 수 있습니다.
              요청은 서비스 내 "개인정보 설정" 메뉴 또는 kimyounghwan06271990@gmail.com으로 가능하며, 회사는 10일 이내에 응답합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">7. 안전성 확보 조치</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>비밀번호 bcrypt 해시 저장</li>
              <li>민감정보(얼굴 벡터·건강 메모·전화번호) AES-256 암호화</li>
              <li>TLS 1.2 이상 전송 암호화</li>
              <li>접근 권한 관리, 접속 기록 보관(최소 1년, 민감정보 2년)</li>
              <li>정기 취약점 점검</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">8. 쿠키</h2>
            <p>
              로그인 세션 유지를 위해 httpOnly 쿠키를 사용합니다. 브라우저 설정에서 쿠키를 차단할 수 있으나, 이 경우 로그인 등 서비스 이용이 제한될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">9. 개인정보 보호 책임자</h2>
            <p>
              책임자: 김영환<br />
              이메일: kimyounghwan06271990@gmail.com
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">10. 권익침해 구제방법</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>개인정보분쟁조정위원회 — 1833-6972 · www.kopico.go.kr</li>
              <li>개인정보침해신고센터 — 118 · privacy.kisa.or.kr</li>
              <li>대검찰청 사이버수사과 — 1301 · spo.go.kr</li>
              <li>경찰청 사이버수사국 — 182 · ecrm.cyber.go.kr</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-2">11. 방침 변경</h2>
            <p>
              본 방침이 변경되는 경우 시행 7일 전(중대 변경은 30일 전) 서비스 내 공지사항으로 안내합니다.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default PrivacyPage;
