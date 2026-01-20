/**
 * 네이버 톡톡 채팅 관리 페이지
 *
 * 채팅 목록 조회 및 메시지 발송
 */

import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { useState, useEffect, useCallback } from "react";
import { data, useLoaderData, useSearchParams, useRevalidator } from "react-router";
import { MessageCircle, RefreshCw, Settings } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  TalkTalkStatsCards,
  TalkTalkFilters,
  TalkTalkChatList,
  TalkTalkChatSheet,
  type TalkTalkFilterValues,
} from "../components/talktalk";
import type { TalkTalkChat, ChatStats } from "../lib/talktalk/talktalk-types.server";

export const meta: MetaFunction = () => {
  return [{ title: "톡톡 채팅 관리 | 대시보드" }];
};

export async function loader({ request }: LoaderFunctionArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "all";
  const search = url.searchParams.get("search") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  const pageSize = 50;

  // 채팅 목록 조회
  let query = adminClient
    .from("talktalk_chats")
    .select("*", { count: "exact" })
    .order("last_message_at", { ascending: false, nullsFirst: false });

  if (status && status !== "all" && status !== "unread") {
    query = query.eq("status", status);
  }

  if (status === "unread") {
    query = query.gt("unread_count", 0);
  }

  if (search) {
    query = query.or(`user_id.ilike.%${search}%,last_message_preview.ilike.%${search}%`);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data: chats, error: chatsError, count } = await query;

  // 통계 조회
  const { data: statsData } = await adminClient.from("talktalk_chats").select("status, unread_count");

  const stats: ChatStats = {
    total: statsData?.length || 0,
    active: statsData?.filter((c) => c.status === "active").length || 0,
    handover: statsData?.filter((c) => c.status === "handover").length || 0,
    completed: statsData?.filter((c) => c.status === "completed").length || 0,
    unread: statsData?.reduce((sum, c) => sum + (c.unread_count || 0), 0) || 0,
  };

  // 설정 확인 (연동 상태)
  const { data: settings } = await adminClient
    .from("talktalk_settings")
    .select("authorization_key")
    .eq("account_id", "default")
    .single();

  return data({
    chats: (chats || []) as TalkTalkChat[],
    stats,
    pagination: {
      page,
      pageSize,
      total: count || 0,
      totalPages: Math.ceil((count || 0) / pageSize),
    },
    filters: { status, search },
    connected: !!settings?.authorization_key,
    error: chatsError?.message,
  });
}

export default function TalkTalkChatsPage() {
  const { chats, stats, pagination, filters, connected, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const revalidator = useRevalidator();

  const [selectedChat, setSelectedChat] = useState<TalkTalkChat | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // 에러 표시
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // 필터 변경 핸들러
  const handleFiltersChange = useCallback(
    (newFilters: TalkTalkFilterValues) => {
      const params = new URLSearchParams(searchParams);
      params.set("status", newFilters.status);
      if (newFilters.search) {
        params.set("search", newFilters.search);
      } else {
        params.delete("search");
      }
      params.delete("page");
      setSearchParams(params);
    },
    [searchParams, setSearchParams]
  );

  // 통계 카드 클릭 시 필터 변경
  const handleStatsFilterChange = useCallback(
    (status: string) => {
      handleFiltersChange({ status, search: filters.search });
    },
    [handleFiltersChange, filters.search]
  );

  // 채팅 선택
  const handleSelectChat = (chat: TalkTalkChat) => {
    setSelectedChat(chat);
    setIsSheetOpen(true);
  };

  // 새로고침
  const handleRefresh = () => {
    revalidator.revalidate();
    toast.success("새로고침 완료");
  };

  // Sheet 닫힐 때 목록 새로고침
  const handleSheetOpenChange = (open: boolean) => {
    setIsSheetOpen(open);
    if (!open) {
      revalidator.revalidate();
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      {/* 연동 상태 확인 */}
      {!connected && (
        <div className="p-4 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            <span>네이버 톡톡이 연동되지 않았습니다. 설정에서 인증키를 등록해주세요.</span>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/talktalk/settings">설정으로 이동</Link>
          </Button>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageCircle className="h-6 w-6" />
            톡톡 채팅 관리
          </h1>
          <p className="text-muted-foreground mt-1">
            네이버 톡톡으로 받은 고객 메시지를 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={revalidator.state === "loading"}
          >
            <RefreshCw
              className={`h-4 w-4 mr-1 ${revalidator.state === "loading" ? "animate-spin" : ""}`}
            />
            새로고침
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/dashboard/talktalk/settings">
              <Settings className="h-4 w-4 mr-1" />
              설정
            </Link>
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <TalkTalkStatsCards
        stats={stats}
        onFilterChange={handleStatsFilterChange}
        activeFilter={filters.status}
      />

      {/* 필터 */}
      <TalkTalkFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
      />

      {/* 채팅 목록 */}
      <TalkTalkChatList
        chats={chats}
        onSelectChat={handleSelectChat}
        selectedChatId={selectedChat?.id}
        isLoading={revalidator.state === "loading"}
      />

      {/* 페이지네이션 */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("page", String(pagination.page - 1));
              setSearchParams(params);
            }}
          >
            이전
          </Button>
          <span className="text-sm text-muted-foreground">
            {pagination.page} / {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => {
              const params = new URLSearchParams(searchParams);
              params.set("page", String(pagination.page + 1));
              setSearchParams(params);
            }}
          >
            다음
          </Button>
        </div>
      )}

      {/* 채팅 상세 시트 */}
      <TalkTalkChatSheet
        chat={selectedChat}
        open={isSheetOpen}
        onOpenChange={handleSheetOpenChange}
      />
    </div>
  );
}
