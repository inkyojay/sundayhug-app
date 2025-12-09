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
    return data({ session: null, messages: [], babyProfile: null, babyProfiles: [], isNew: false });
  }

  const sessionId = params.sessionId;
  const url = new URL(request.url);
  const selectedBabyId = url.searchParams.get("babyId");

  // 모든 아기 프로필 가져오기 (여러 아이 지원)
  const { data: babyProfiles } = await supabase
    .from("baby_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // 새 채팅인 경우
  if (sessionId === "new") {
    // 선택된 아기 또는 첫 번째 아기
    let babyProfile = null;
    if (selectedBabyId && babyProfiles) {
      babyProfile = babyProfiles.find(b => b.id === selectedBabyId) || null;
    } else if (babyProfiles && babyProfiles.length > 0) {
      babyProfile = babyProfiles[0];
    }

    return data({ 
      session: null, 
      messages: [], 
      babyProfile,
      babyProfiles: babyProfiles || [],
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
    return data({ session: null, messages: [], babyProfile: null, babyProfiles: babyProfiles || [], isNew: false });
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
    babyProfiles: babyProfiles || [],
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

  // 아기 프로필 등록
  if (actionType === "saveBabyProfile") {
    const babyName = formData.get("babyName") as string;
    const birthDate = formData.get("birthDate") as string;
    const feedingType = formData.get("feedingType") as string;

    if (!birthDate) {
      return data({ error: "생년월일은 필수입니다." }, { status: 400 });
    }

    const { data: newProfile, error } = await supabase
      .from("baby_profiles")
      .insert({
        user_id: user.id,
        name: babyName || null,
        birth_date: birthDate,
        feeding_type: feedingType || null,
      })
      .select()
      .single();

    if (error) {
      console.error("아기 프로필 저장 오류:", error);
      return data({ error: "프로필 저장에 실패했습니다." }, { status: 500 });
    }

    return data({ success: true, babyProfileSaved: true, babyProfile: newProfile });
  }

  return data({ error: "잘못된 요청" }, { status: 400 });
}

export default function ChatRoomScreen() {
  const { session, messages: initialMessages, babyProfile: initialBabyProfile, babyProfiles, isNew } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const chatFetcher = useFetcher();
  const profileFetcher = useFetcher();
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const [localBabyProfile, setLocalBabyProfile] = useState(initialBabyProfile);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(session?.id || null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 아기 정보 입력 폼
  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [feedingType, setFeedingType] = useState("");
  
  // 아이 선택 (여러 아이 지원)
  const [showBabySelector, setShowBabySelector] = useState(false);

  const isLoading = chatFetcher.state !== "idle";
  const babyProfile = localBabyProfile;
  const isNewSession = !currentSessionId;

  // 아기 프로필 저장 후 업데이트
  useEffect(() => {
    if (profileFetcher.data?.babyProfileSaved && profileFetcher.data?.babyProfile) {
      setLocalBabyProfile(profileFetcher.data.babyProfile);
    }
  }, [profileFetcher.data]);

  // 초기 메시지 동기화
  useEffect(() => {
    setLocalMessages(initialMessages);
  }, [initialMessages]);

  // 세션 ID 동기화 (페이지 로드 시)
  useEffect(() => {
    if (session?.id) {
      setCurrentSessionId(session.id);
    }
  }, [session?.id]);

  // 새 메시지 시 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  // AI 응답 처리
  useEffect(() => {
    if (chatFetcher.data?.success && chatFetcher.data?.message) {
      setLocalMessages(prev => [...prev, chatFetcher.data.message]);
      
      // 새 세션이면 세션 ID 저장 및 URL 변경 (페이지 리로드 없이)
      if (chatFetcher.data?.sessionId && !currentSessionId) {
        setCurrentSessionId(chatFetcher.data.sessionId);
        window.history.replaceState(null, "", `/customer/chat/${chatFetcher.data.sessionId}`);
      }
    }
  }, [chatFetcher.data, currentSessionId]);

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

    // API 호출 (currentSessionId 사용으로 일관성 유지)
    chatFetcher.submit(
      { 
        message: inputValue,
        sessionId: currentSessionId || "new",
        babyProfileId: localBabyProfile?.id || ""
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

  // 아기 정보 저장 핸들러
  const handleSaveBabyProfile = () => {
    if (!birthDate) {
      alert("생년월일을 입력해주세요.");
      return;
    }
    profileFetcher.submit(
      { actionType: "saveBabyProfile", babyName, birthDate, feedingType },
      { method: "post" }
    );
  };

  // 아기 정보가 없으면 입력 화면 표시
  if (!babyProfile && isNewSession) {
    return (
      <div className="flex flex-col h-screen bg-[#F5F5F0]">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link 
            to="/customer/chat"
            className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-bold text-gray-900">AI 육아 상담</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">아기 정보 등록</h2>
              <p className="text-gray-500 text-sm">
                맞춤형 상담을 위해 아기 정보를 알려주세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  아기 이름 (선택)
                </label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="예: 콩이"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  생년월일 *
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  수유 방식 (선택)
                </label>
                <select
                  value={feedingType}
                  onChange={(e) => setFeedingType(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none bg-white"
                >
                  <option value="">선택해주세요</option>
                  <option value="breast">모유</option>
                  <option value="formula">분유</option>
                  <option value="mixed">혼합</option>
                </select>
              </div>

              <Button
                onClick={handleSaveBabyProfile}
                disabled={profileFetcher.state !== "idle"}
                className="w-full h-12 bg-[#FF6B35] hover:bg-[#FF6B35]/90 text-white rounded-xl font-medium"
              >
                {profileFetcher.state !== "idle" ? "저장 중..." : "상담 시작하기"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      {/* 데스크탑: 중앙 정렬 컨테이너 */}
      <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto bg-white md:my-4 md:rounded-2xl md:shadow-lg md:border md:border-gray-200 overflow-hidden">
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
              <button 
                onClick={() => babyProfiles.length > 1 && isNewSession && setShowBabySelector(true)}
                className={`text-xs text-gray-500 flex items-center gap-1 ${babyProfiles.length > 1 && isNewSession ? 'hover:text-[#FF6B35] cursor-pointer' : ''}`}
              >
                {babyProfile.name || "아기"} • {babyMonths}개월
                {babyProfiles.length > 1 && isNewSession && (
                  <span className="text-[#FF6B35]">▼</span>
                )}
              </button>
            )}
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#F5F5F0]">
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
              {/* AI 상담사 라벨 */}
              {msg.role === "assistant" && (
                <p className="text-xs text-gray-500 mb-1 font-medium">AI 육아 상담사</p>
              )}
              <div className={`rounded-2xl p-4 ${
                msg.role === "user"
                  ? "bg-[#FF6B35] text-white rounded-tr-md"
                  : "bg-white shadow-sm rounded-tl-md text-gray-800"
              }`}>
                <p className="whitespace-pre-wrap text-inherit">{msg.content}</p>
                
                {/* 출처 표시 */}
                {msg.role === "assistant" && msg.sources && (() => {
                  try {
                    const sources = typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources;
                    if (!Array.isArray(sources) || sources.length === 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-400 mb-1">📚 참고 자료</p>
                        <div className="flex flex-wrap gap-1">
                          {sources.map((source: { name: string; url?: string }, i: number) => (
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
                    );
                  } catch {
                    return null;
                  }
                })()}
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

      {/* Baby Selector Modal */}
      {showBabySelector && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-in slide-in-from-bottom duration-300">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">아이 변경</h3>
              <p className="text-gray-500 text-sm mt-1">상담할 아이를 선택해주세요</p>
            </div>
            
            <div className="space-y-3 mb-6">
              {babyProfiles.map((baby) => {
                const months = Math.floor((Date.now() - new Date(baby.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30));
                const isSelected = baby.id === localBabyProfile?.id;
                return (
                  <button
                    key={baby.id}
                    onClick={() => {
                      setLocalBabyProfile(baby);
                      setShowBabySelector(false);
                    }}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                      isSelected 
                        ? 'border-[#FF6B35] bg-orange-50' 
                        : 'border-gray-200 hover:border-[#FF6B35] hover:bg-orange-50'
                    }`}
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900">
                        {baby.name || "우리 아기"}
                      </p>
                      <p className="text-sm text-gray-500">
                        {months < 12 ? `${months}개월` : `${Math.floor(months/12)}살 ${months % 12}개월`}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center">
                        <span className="text-white text-sm">✓</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowBabySelector(false)}
              className="w-full py-3 text-gray-500 hover:text-gray-700 transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

