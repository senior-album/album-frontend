import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

type TermsKind = 'guardian' | 'facility';

const TermsPage: React.FC = () => {
  const [kind, setKind] = useState<TermsKind>('guardian');

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-soft">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <Link to="/login" className="p-2 hover:bg-gray-100 rounded-lg transition" aria-label="뒤로">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-xl font-bold text-gray-900">이용약관</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-2 mb-4">
          <button
            type="button"
            onClick={() => setKind('guardian')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              kind === 'guardian' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            보호자용 (무료)
          </button>
          <button
            type="button"
            onClick={() => setKind('facility')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              kind === 'facility' ? 'bg-primary text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            시설 사업자용 (유료)
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-soft p-6 sm:p-10 text-sm leading-relaxed text-gray-800">
          <p className="bg-amber-50 border border-amber-200 rounded p-3 text-amber-900 mb-6">
            본 약관은 초안이며 법무 검토 후 확정됩니다.
          </p>
          {kind === 'guardian' ? <GuardianTerms /> : <FacilityTerms />}
        </div>
      </main>
    </div>
  );
};

const GuardianTerms: React.FC = () => (
  <div className="space-y-4">
    <Article title="제1조 (목적)">
      본 약관은 Senior Album("회사")이 제공하는 요양시설 사진 공유 서비스의 이용과 관련하여 회사와 보호자 간의 권리·의무 및 책임사항을 규정합니다.
    </Article>
    <Article title="제4조 (서비스 제공 범위)">
      회사는 초대 수락, 입소자 사진 조회·다운로드, 공유 링크 생성 기능을 무료로 제공합니다. 서비스는 시설 사업자가 공개한 사진에 한해 제공됩니다.
    </Article>
    <Article title="제6조 (이용자의 의무)">
      이용자는 본인이 아닌 자의 정보로 가입하거나, 초대받지 않은 입소자의 정보에 접근할 수 없습니다. 공유받은 사진은 개인적·비상업적 용도로만 이용하며, SNS 등 공개 공간에 게시하지 않습니다.
    </Article>
    <Article title="제7조 (사진 이용 제한)">
      사진에는 입소자 본인 및 다른 입소자의 얼굴이 포함될 수 있습니다. 다른 입소자의 얼굴이 식별 가능한 상태로 SNS에 게시, 명예훼손 목적의 편집·합성, 딥페이크·AI 학습 데이터 이용은 금지됩니다. 위반 시 이용자가 민·형사상 책임을 직접 부담합니다.
    </Article>
    <Article title="제11조 (이용계약 해지)">
      이용자는 언제든 계정 삭제 기능으로 해지할 수 있으며, 해지 시 회사는 30일 이내 개인정보를 파기합니다. 이용자가 중대한 약관 위반을 한 경우 회사는 사전 통지 후 계정을 제한·해지할 수 있습니다.
    </Article>
    <p className="text-xs text-gray-500 mt-4">전체 본문은 회사 고객센터 또는 서비스 내 "법적 고지" 페이지에서 확인하실 수 있습니다.</p>
  </div>
);

const FacilityTerms: React.FC = () => (
  <div className="space-y-4">
    <Article title="제1조 (목적)">
      본 약관은 Senior Album이 제공하는 요양시설 사진 AI 분류·공유 SaaS 서비스의 이용과 관련하여 회사와 시설 사업자 간의 권리·의무 및 책임사항을 규정합니다.
    </Article>
    <Article title="제6조 (요금 및 결제)">
      서비스 요금은 별도 가격표(Starter/Standard/Pro/Enterprise)에 따릅니다. 월 정기결제가 기본이며 세금계산서는 결제 후 영업일 3일 이내 발행됩니다.
    </Article>
    <Article title="제7조 (이용자의 의무)">
      이용자는 입소자·보호자의 개인정보 보호 책임을 부담하며, 보호자 초대 시 입소자 본인 또는 법정대리인의 동의를 확인해야 합니다. 시설 코드·계정을 제3자와 공유할 수 없으며, 서비스를 통해 수집된 데이터를 본래 목적 외로 이용할 수 없습니다.
    </Article>
    <Article title="제8조 (개인정보 처리 위탁)">
      이용자는 서비스 이용 과정에서 수집·생성되는 입소자·보호자 개인정보를 회사에 처리 위탁합니다. 세부사항은 별도 개인정보 처리 위탁 계약서에 따릅니다.
    </Article>
    <Article title="제11조 (SLA)">
      회사는 월 가동률 99.0% 이상을 목표로 하며, 복구 목표시간(RTO) 4시간, 복구 목표시점(RPO) 24시간을 기준으로 백업을 운영합니다.
    </Article>
    <Article title="제12조 (계약 해지 및 데이터 파기)">
      이용자는 30일 전 서면 통지로 해지할 수 있으며, 해지 후 30일 이내 모든 데이터가 복구 불가능하게 파기됩니다.
    </Article>
    <p className="text-xs text-gray-500 mt-4">전체 본문은 회사 고객센터 또는 서비스 내 "법적 고지" 페이지에서 확인하실 수 있습니다.</p>
  </div>
);

const Article: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section>
    <h2 className="font-semibold text-gray-900 mt-4 mb-1">{title}</h2>
    <p>{children}</p>
  </section>
);

export default TermsPage;
