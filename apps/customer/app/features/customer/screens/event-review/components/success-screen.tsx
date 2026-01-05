/**
 * Event Review Success Screen
 */
import { Link } from "react-router";
import { CheckCircle, Gift } from "lucide-react";
import { Button } from "~/core/components/ui/button";

export function SuccessScreen() {
  return (
    <div className="fixed inset-0 z-50 bg-[#F5F5F0] flex items-center justify-center">
      <div className="max-w-md w-full mx-4 text-center">
        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 animate-bounce">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          후기 이벤트 참여 완료! 🎉
        </h2>
        <p className="text-gray-600 mb-6">
          성공적으로 제출되었습니다.<br />
          검토 후 <strong>1~2 영업일 내</strong> 결과를 알려드립니다.
        </p>

        <div className="bg-white rounded-2xl p-5 mb-6 border border-gray-100 text-left">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 font-bold text-sm">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">관리자 검토</p>
                <p className="text-sm text-gray-500">제출하신 후기를 확인합니다</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-amber-600 font-bold text-sm">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">승인 알림</p>
                <p className="text-sm text-gray-500">카카오톡으로 결과를 안내드립니다</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">사은품 발송</p>
                <p className="text-sm text-gray-500">승인 후 차주 금요일에 일괄 발송</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <Link to="/customer/mypage">
            <Button className="w-full h-14 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-medium">
              마이페이지에서 확인하기
            </Button>
          </Link>
          <Link to="/customer" className="block mt-2">
            <Button variant="outline" className="w-full h-12 rounded-xl border-gray-300">
              홈으로 돌아가기
            </Button>
          </Link>
        </div>

        <p className="mt-8 text-sm text-gray-400">
          문의사항은 카카오톡 채널로 연락주세요
        </p>
      </div>
    </div>
  );
}
