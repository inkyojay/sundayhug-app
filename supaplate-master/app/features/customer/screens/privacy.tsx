/**
 * 개인정보 처리방침 페이지
 */
import type { Route } from "./+types/privacy";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "개인정보 처리방침 | 썬데이허그" },
    { name: "description", content: "주식회사 제이코프 개인정보 처리방침" },
  ];
}

export default function PrivacyPolicyScreen() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">개인정보 처리방침</h1>
        
        <div className="prose prose-sm dark:prose-invert max-w-none space-y-6">
          <p className="text-muted-foreground">
            주식회사 제이코프(이하 '회사')는 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 
            관련 법령에 의거한 개인정보 처리방침을 정하여 이용자 권익 보호에 최선을 다하고 있습니다.
          </p>
          <p className="text-muted-foreground text-sm">시행일: 2024년 1월 1일</p>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제1조 (개인정보의 수집 및 이용 목적)</h2>
            <p>회사는 다음의 목적을 위하여 개인정보를 처리합니다.</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>회원가입 및 관리:</strong> 회원제 서비스 이용에 따른 본인확인, 개인식별, 가입의사 확인, 연령확인</li>
              <li><strong>서비스 제공:</strong> 디지털 보증서 발급, AI 수면 환경 분석 서비스, A/S 접수 및 처리</li>
              <li><strong>고객 상담:</strong> 문의사항 처리, 분쟁 조정을 위한 기록 보존</li>
              <li><strong>마케팅 및 광고:</strong> 신규 서비스 안내, 이벤트 정보 제공 (동의 시)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제2조 (수집하는 개인정보 항목)</h2>
            <p>회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다.</p>
            
            <h3 className="text-lg font-medium mt-4 mb-2">1. 필수 수집 항목</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>이름, 휴대전화번호, 이메일 주소</li>
              <li>소셜 로그인 시: 소셜 계정 고유 식별자, 프로필 정보(닉네임, 프로필 이미지)</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-4 mb-2">2. 선택 수집 항목</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>아기 정보(이름, 생년월일, 성별) - 수면 환경 분석 서비스 이용 시</li>
              <li>배송지 주소 - A/S 신청 시</li>
            </ul>
            
            <h3 className="text-lg font-medium mt-4 mb-2">3. 자동 수집 항목</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>서비스 이용 기록, 접속 로그, 쿠키, IP 주소, 기기 정보</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제3조 (개인정보의 보유 및 이용 기간)</h2>
            <p>회사는 원칙적으로 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>회원 정보:</strong> 회원 탈퇴 시까지 (탈퇴 후 30일 이내 파기)</li>
              <li><strong>보증서 정보:</strong> 제품 보증 기간 종료 후 5년</li>
              <li><strong>A/S 기록:</strong> 서비스 완료 후 3년</li>
              <li><strong>수면 분석 기록:</strong> 회원 탈퇴 시까지</li>
            </ul>
            <p className="mt-4">다만, 관계 법령에 의해 보존할 필요가 있는 경우 아래와 같이 보존합니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
              <li>소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)</li>
              <li>웹사이트 방문 기록: 3개월 (통신비밀보호법)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제4조 (개인정보의 제3자 제공)</h2>
            <p>
              회사는 이용자의 개인정보를 원칙적으로 외부에 제공하지 않습니다. 
              다만, 아래의 경우에는 예외로 합니다:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>이용자가 사전에 동의한 경우</li>
              <li>법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제5조 (개인정보의 처리 위탁)</h2>
            <p>회사는 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다:</p>
            <div className="overflow-x-auto mt-4">
              <table className="min-w-full border border-border">
                <thead className="bg-muted">
                  <tr>
                    <th className="border border-border px-4 py-2 text-left">수탁업체</th>
                    <th className="border border-border px-4 py-2 text-left">위탁 업무 내용</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-border px-4 py-2">솔라피</td>
                    <td className="border border-border px-4 py-2">SMS/알림톡 발송</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">Supabase</td>
                    <td className="border border-border px-4 py-2">데이터 저장 및 인증</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-4 py-2">Vercel</td>
                    <td className="border border-border px-4 py-2">웹서비스 호스팅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제6조 (이용자의 권리와 행사 방법)</h2>
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>개인정보 열람 요구</li>
              <li>오류 등이 있을 경우 정정 요구</li>
              <li>삭제 요구</li>
              <li>처리 정지 요구</li>
            </ul>
            <p className="mt-4">
              권리 행사는 마이페이지 또는 개인정보관리책임자에게 서면, 전화, 이메일로 연락하시면 
              지체 없이 조치하겠습니다.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제7조 (개인정보의 파기)</h2>
            <p>
              회사는 개인정보 보유 기간의 경과, 처리 목적 달성 등 개인정보가 불필요하게 되었을 때에는 
              지체 없이 해당 개인정보를 파기합니다.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li><strong>전자적 파일:</strong> 기술적 방법을 사용하여 복구 불가능하도록 영구 삭제</li>
              <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제8조 (개인정보 보호책임자)</h2>
            <p>
              회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 
              이용자의 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
            </p>
            <div className="bg-muted p-4 rounded-lg mt-4">
              <p><strong>개인정보 보호책임자</strong></p>
              <ul className="mt-2 space-y-1">
                <li>성명: 강창건</li>
                <li>직위: 개인정보관리책임자</li>
                <li>연락처: contact@sundayhug.com</li>
                <li>전화: 070-7703-8005</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mt-8 mb-4">제9조 (개인정보 처리방침 변경)</h2>
            <p>
              이 개인정보 처리방침은 시행일로부터 적용되며, 법령 및 방침에 따른 변경 내용의 추가, 삭제 및 
              정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.
            </p>
          </section>

          <section className="border-t pt-8 mt-8">
            <h2 className="text-xl font-semibold mb-4">회사 정보</h2>
            <ul className="space-y-1 text-muted-foreground">
              <li><strong>상호:</strong> 주식회사 제이코프</li>
              <li><strong>대표자:</strong> 정인교</li>
              <li><strong>주소:</strong> 16897 경기도 용인시 기흥구 죽전로 6 한솔프라자 7층 706호</li>
              <li><strong>사업자등록번호:</strong> 702-86-02618</li>
              <li><strong>통신판매업신고:</strong> 제2023-용인기흥-0364호</li>
              <li><strong>전화:</strong> 070-7703-8005</li>
              <li><strong>이메일:</strong> contact@sundayhug.com</li>
            </ul>
          </section>

          <p className="text-sm text-muted-foreground mt-8">
            본 개인정보 처리방침은 2024년 1월 1일부터 시행됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}


