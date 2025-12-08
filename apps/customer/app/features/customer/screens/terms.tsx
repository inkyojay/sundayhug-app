/**
 * 이용약관 페이지
 */
import type { Route } from "./+types/terms";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "이용약관 | 썬데이허그" },
    { name: "description", content: "썬데이허그 서비스 이용약관" },
  ];
}

export default function TermsOfServiceScreen() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">서비스 이용약관</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground text-sm">시행일: 2024년 1월 1일</p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제1조 (목적)</h2>
            <p>
              이 약관은 주식회사 제이코프(이하 "회사")가 운영하는 썬데이허그 서비스(이하 "서비스")의 
              이용 조건 및 절차, 회사와 이용자의 권리, 의무 및 책임사항 등을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제2조 (정의)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li><strong>"서비스"</strong>란 회사가 제공하는 디지털 보증서, AI 수면 환경 분석, A/S 신청 등의 온라인 서비스를 말합니다.</li>
              <li><strong>"이용자"</strong>란 이 약관에 따라 회사와 이용계약을 체결하고 서비스를 이용하는 고객을 말합니다.</li>
              <li><strong>"회원"</strong>이란 회사에 개인정보를 제공하여 회원등록을 한 자로서, 서비스를 지속적으로 이용할 수 있는 자를 말합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제3조 (약관의 효력 및 변경)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>이 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 이 약관을 변경할 수 있습니다.</li>
              <li>약관이 변경되는 경우 회사는 변경 내용을 시행일 7일 전부터 서비스 내 공지사항을 통해 공지합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제4조 (회원가입)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.</li>
              <li>회사는 제1항과 같이 회원가입을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>가입신청자가 이 약관에 의하여 이전에 회원자격을 상실한 적이 있는 경우</li>
                  <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                  <li>기타 회원으로 등록하는 것이 서비스 운영에 현저히 지장이 있다고 판단되는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제5조 (서비스의 제공)</h2>
            <p>회사는 다음과 같은 서비스를 제공합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>디지털 보증서 발급 및 관리 서비스</li>
              <li>AI 기반 아기 수면 환경 분석 서비스</li>
              <li>A/S 신청 및 처리 서비스</li>
              <li>기타 회사가 추가 개발하거나 제휴 등을 통해 제공하는 서비스</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제6조 (서비스의 변경 및 중단)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>회사는 운영상, 기술상의 필요에 따라 서비스를 변경할 수 있습니다.</li>
              <li>회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>컴퓨터 등 정보통신설비의 보수점검, 교체 및 고장, 통신의 두절 등의 사유가 발생한 경우</li>
                  <li>천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제7조 (회원의 의무)</h2>
            <p>회원은 다음 행위를 하여서는 안 됩니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>신청 또는 변경 시 허위 내용의 등록</li>
              <li>타인의 정보 도용</li>
              <li>회사가 게시한 정보의 변경</li>
              <li>회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등) 등의 송신 또는 게시</li>
              <li>회사와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
              <li>회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
              <li>기타 불법적이거나 부당한 행위</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제8조 (회원 탈퇴 및 자격 상실)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>회원은 언제든지 서비스 내 마이페이지 또는 고객센터를 통해 탈퇴를 요청할 수 있으며, 회사는 즉시 회원 탈퇴를 처리합니다.</li>
              <li>회원이 다음 각 호의 사유에 해당하는 경우, 회사는 회원자격을 제한 및 정지시킬 수 있습니다:
                <ul className="list-disc pl-6 mt-2 space-y-1">
                  <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                  <li>서비스를 이용하여 법령 또는 이 약관이 금지하는 행위를 하는 경우</li>
                </ul>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제9조 (면책조항)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>회사는 천재지변, 불가항력 또는 이에 준하는 사유로 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</li>
              <li>회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</li>
              <li>AI 수면 환경 분석 서비스는 참고용 정보를 제공하는 것으로, 의료적 진단이나 처방을 대체하지 않습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제10조 (분쟁해결)</h2>
            <ul className="list-decimal pl-6 space-y-2">
              <li>회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 고객센터를 운영합니다.</li>
              <li>회사와 이용자 간에 발생한 분쟁에 관한 소송은 대한민국 법을 준거법으로 하며, 민사소송법상의 관할법원에 제기합니다.</li>
            </ul>
          </section>

          <section className="border-t pt-8 mt-8">
            <h2 className="text-xl font-semibold mb-4">회사 정보</h2>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>상호:</strong> 주식회사 제이코프</li>
              <li><strong>대표자:</strong> 정인교</li>
              <li><strong>주소:</strong> 16897 경기도 용인시 기흥구 죽전로 6 한솔프라자 7층 706호</li>
              <li><strong>사업자등록번호:</strong> 702-86-02618</li>
              <li><strong>통신판매업신고:</strong> 제2023-용인기흥-0364호</li>
              <li><strong>고객센터:</strong> 1533-9093 (평일 10:00~18:00)</li>
              <li><strong>이메일:</strong> contact@sundayhug.com</li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            본 이용약관은 2024년 1월 1일부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}

