/**
 * AI 육아 상담 - 채팅방
 */
import type { Route } from "./+types/chat-room";

import { Link, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  Send,
  ImagePlus,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  Bot,
  User,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  ExternalLink
} from "lucide-react";
import React, { useState, useRef, useEffect } from "react";

import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "AI 상담 | 썬데이허그" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ session: null, messages: [], babyProfile: null });
  }

  const sessionId = params.sessionId;

  // 새 채팅인 경우
  if (sessionId === "new") {
    // 아기 프로필 가져오기
    const { data: babyProfile } = await supabase
      .from("baby_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    return data({ 
      session: null, 
      messages: [], 
      babyProfile,
      isNew: true 
    });
  }

  // 기존 세션
  const { data: session } = await supabase
    .from("chat_sessions")
    .select(`
      *,
      baby_profiles (*)
    `)
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return data({ session: null, messages: [], babyProfile: null });
  }

  // 메시지 목록
  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return data({ 
    session, 
    messages: messages || [],
    babyProfile: session.baby_profiles,
    isNew: false
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "feedback") {
    const messageId = formData.get("messageId") as string;
    const helpful = formData.get("helpful") === "true";

    await supabase
      .from("chat_feedback")
      .insert({
        message_id: messageId,
        user_id: user.id,
        helpful,
        rating: helpful ? 5 : 1,
      });

    return data({ success: true });
  }

  return data({ error: "잘못된 요청" }, { status: 400 });
}

export default function ChatRoomScreen() {
  const { session, messages: initialMessages, babyProfile, isNew } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const chatFetcher = useFetcher();
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoading = chatFetcher.state !== "idle";

  // 초기 메시지 동기화
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  // 새 메시지 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // AI 응답 처리
  useEffect(() => {
    if (chatFetcher.data?.success && chatFetcher.data?.message) {
      setLocalMessages(prev => [...prev, chatFetcher.data.message]);
      
      // 새 세션이면 리다이렉트
      if (isNew && chatFetcher.data?.sessionId) {
        window.location.href = `/customer/chat/${chatFetcher.data.sessionId}`;
      }
    }
  }, [chatFetcher.data, isNew]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    // 사용자 메시지 로컬에 추가 (즉시 표시)
    const userMessage = {
      id: `temp-${Date.now()}`,
      role: "user" as const,
      content: inputValue,
      created_at: new Date().toISOString(),
    };
    setLocalMessages(prev => [...prev, userMessage]);

    // API 호출
    chatFetcher.submit(
      { 
        message: inputValue,
        sessionId: session?.id || "new"
      },
      { method: "post", action: "/api/chat/send" }
    );
    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    fetcher.submit(
      { actionType: "feedback", messageId, helpful: String(helpful) },
      { method: "post" }
    );
  };

  // 월령 계산
  const babyMonths = babyProfile?.birth_date 
    ? Math.floor((Date.now() - new Date(babyProfile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      {/* Header */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <Link 
          to="/customer/chat"
          className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="font-bold text-gray-900 truncate">
            {session?.title || "새 상담"}
          </h1>
          {babyProfile && (
            <p className="text-xs text-gray-500">
              {babyProfile.name || "아기"} • {babyMonths}개월
            </p>
          )}
        </div>
        <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Welcome Message */}
        {localMessages.length === 0 && (
          <div className="mb-6">
            <div className="flex gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm">
                  <p className="text-gray-800">
                    안녕하세요! 👋 AI 육아 상담사예요.
                    {babyProfile && (
                      <>
                        <br /><br />
                        <strong>{babyProfile.name || "아기"}</strong>({babyMonths}개월)에 대해 
                        궁금한 점이 있으시면 편하게 물어봐 주세요!
                      </>
                    )}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {["수면 패턴이 궁금해요", "이유식 시작 시기", "밤잠이 불안해요"].map((suggestion) => (
                      <button
                        key={suggestion}
                        onClick={() => setInputValue(suggestion)}
                        className="text-sm px-3 py-1.5 bg-orange-50 text-[#FF6B35] rounded-full hover:bg-orange-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Message List */}
        {localMessages.map((msg) => (
          <div key={msg.id} className={`mb-4 flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
              msg.role === "user" 
                ? "bg-gray-200" 
                : "bg-gradient-to-br from-[#FF6B35] to-orange-400"
            }`}>
              {msg.role === "user" ? (
                <User className="w-5 h-5 text-gray-600" />
              ) : (
                <Bot className="w-5 h-5 text-white" />
              )}
            </div>
            <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>
              <div className={`rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-[#FF6B35] text-white rounded-tr-md"
                  : "bg-white shadow-sm rounded-tl-md"
              }`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {/* 출처 표시 */}
                {msg.role === "assistant" && msg.sources && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-400 mb-1">📚 참고 자료</p>
                    <div className="flex flex-wrap gap-1">
                      {JSON.parse(msg.sources).map((source: { name: string; url?: string }, i: number) => (
                        <a
                          key={i}
                          href={source.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                        >
                          {source.name}
                          {source.url && <ExternalLink className="w-3 h-3" />}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              {/* 피드백 버튼 */}
              {msg.role === "assistant" && (
                <div className="flex gap-1 mt-1">
                  <button
                    onClick={() => handleFeedback(msg.id, true)}
                    className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-colors"
                    title="도움이 됐어요"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleFeedback(msg.id, false)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                    title="도움이 안 됐어요"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {/* Loading */}
        {isLoading && (
          <div className="mb-4 flex gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-white rounded-2xl rounded-tl-md p-4 shadow-sm">
              <div className="flex items-center gap-2 text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>답변 작성 중...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          {/* 이미지 첨부 */}
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
          >
            <ImagePlus className="w-5 h-5 text-gray-500" />
          </button>

          {/* 음성 입력 */}
          <button
            type="button"
            onClick={() => setIsRecording(!isRecording)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              isRecording ? "bg-red-500 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* 텍스트 입력 */}
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요..."
              className="resize-none pr-12 min-h-[44px] max-h-[120px]"
              rows={1}
            />
          </div>

          {/* 전송 */}
          <Button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="w-10 h-10 rounded-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 p-0 flex-shrink-0"
          >
            <Send className="w-5 h-5" />
          </Button>
        </form>
      </div>
    </div>
  );
}

