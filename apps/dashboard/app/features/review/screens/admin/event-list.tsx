/**
 * 관리자용 후기 이벤트 관리 페이지
 */
import type { Route } from "./+types/event-list";

import { useState } from "react";
import { Link, useLoaderData, useFetcher, data } from "react-router";
import { 
  Plus,
  Calendar,
  Gift,
  Package,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  ChevronRight,
  Users,
  Clock
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "후기 이벤트 관리 | 관리자" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  // 이벤트 목록 조회
  const { data: events, error } = await adminClient
    .from("review_events")
    .select(`
      *,
      review_event_products (count),
      review_event_gifts (count),
      review_submissions (count)
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("이벤트 목록 조회 오류:", error);
  }

  // 통계
  const now = new Date().toISOString().split('T')[0];
  const stats = {
    total: events?.length || 0,
    active: events?.filter(e => e.is_active && (!e.end_date || e.end_date >= now)).length || 0,
    ended: events?.filter(e => e.end_date && e.end_date < now).length || 0,
  };

  return data({ 
    events: events || [],
    stats,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;
  const eventId = formData.get("eventId") as string;

  if (actionType === "toggle") {
    const { data: event } = await adminClient
      .from("review_events")
      .select("is_active")
      .eq("id", eventId)
      .single();

    await adminClient
      .from("review_events")
      .update({ is_active: !event?.is_active })
      .eq("id", eventId);

    return { success: true };
  }

  if (actionType === "delete") {
    await adminClient
      .from("review_events")
      .delete()
      .eq("id", eventId);

    return { success: true };
  }

  return { success: false };
}

function getEventStatus(event: any) {
  const now = new Date().toISOString().split('T')[0];
  
  if (!event.is_active) {
    return { label: "비활성", color: "bg-gray-100 text-gray-600" };
  }
  
  if (event.start_date > now) {
    return { label: "예정", color: "bg-blue-100 text-blue-700" };
  }
  
  if (event.end_date && event.end_date < now) {
    return { label: "종료", color: "bg-red-100 text-red-700" };
  }
  
  return { label: "진행중", color: "bg-green-100 text-green-700" };
}

export default function AdminEventListScreen() {
  const { events, stats } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const handleToggle = (eventId: string) => {
    fetcher.submit(
      { action: "toggle", eventId },
      { method: "POST" }
    );
  };

  const handleDelete = (eventId: string) => {
    if (!confirm("이벤트를 삭제하시겠습니까? 연결된 제품/사은품 정보도 함께 삭제됩니다.")) return;
    
    fetcher.submit(
      { action: "delete", eventId },
      { method: "POST" }
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">후기 이벤트 관리</h1>
          <p className="text-gray-500 mt-1">맘카페 후기 이벤트를 생성하고 관리합니다.</p>
        </div>
        <Link to="/dashboard/events/new">
          <Button className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
            <Plus className="w-4 h-4 mr-2" />
            새 이벤트 만들기
          </Button>
        </Link>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">전체 이벤트</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-700">진행중</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-600">종료됨</p>
          <p className="text-2xl font-bold text-gray-600">{stats.ended}</p>
        </div>
      </div>

      {/* 이벤트 목록 */}
      {events.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
          <Gift className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">아직 등록된 이벤트가 없습니다.</p>
          <Link to="/dashboard/events/new">
            <Button>첫 이벤트 만들기</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event: any) => {
            const status = getEventStatus(event);
            const productCount = event.review_event_products?.[0]?.count || 0;
            const giftCount = event.review_event_gifts?.[0]?.count || 0;
            const submissionCount = event.review_submissions?.[0]?.count || 0;
            
            return (
              <div 
                key={event.id} 
                className="bg-white rounded-xl border border-gray-200 hover:border-gray-300 transition-colors overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    {/* 왼쪽: 이벤트 정보 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={status.color}>{status.label}</Badge>
                        <span className="text-xs text-gray-400">
                          {event.event_type === 'abc_bed' ? 'ABC침대' : '일반제품'}
                        </span>
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {event.name}
                      </h3>
                      {event.description && (
                        <p className="text-sm text-gray-500 line-clamp-1">
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* 오른쪽: 액션 버튼 */}
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggle(event.id)}
                        className="text-gray-600"
                      >
                        {event.is_active ? (
                          <><EyeOff className="w-4 h-4 mr-1" /> 숨기기</>
                        ) : (
                          <><Eye className="w-4 h-4 mr-1" /> 활성화</>
                        )}
                      </Button>
                      <Link to={`/dashboard/events/${event.id}`}>
                        <Button size="sm" variant="outline">
                          <Edit className="w-4 h-4 mr-1" /> 수정
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(event.id)}
                        className="text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 하단 정보 */}
                  <div className="flex items-center gap-6 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      <span>
                        {event.start_date}
                        {event.end_date && ` ~ ${event.end_date}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-4 h-4" />
                      <span>제품 {productCount}개</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gift className="w-4 h-4" />
                      <span>사은품 {giftCount}개</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>참여 {submissionCount}건</span>
                    </div>
                    {event.reward_points > 0 && (
                      <div className="flex items-center gap-1 text-orange-600">
                        <span>+{event.reward_points}P</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 참여자 관리 링크 - 항상 표시 */}
                <Link 
                  to={`/dashboard/events/${event.id}/submissions`}
                  className="block px-5 py-3 bg-gray-50 border-t border-gray-100 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">참여자 관리</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


