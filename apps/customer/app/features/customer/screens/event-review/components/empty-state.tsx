/**
 * Event Review Empty State
 */
import { Link } from "react-router";
import { ArrowLeft, Gift } from "lucide-react";
import { Button } from "~/core/components/ui/button";

export function EmptyState() {
  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-2xl px-4 md:px-6 py-8 md:py-10">
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/customer"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors shadow-sm"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">후기 이벤트</h1>
        </div>

        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100">
          <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-2">현재 진행 중인 이벤트가 없습니다.</p>
          <p className="text-sm text-gray-400">새로운 이벤트가 시작되면 알려드릴게요!</p>

          <Link to="/customer/mypage/review-submit">
            <Button className="mt-6" variant="outline">
              일반 후기 인증하러 가기
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
