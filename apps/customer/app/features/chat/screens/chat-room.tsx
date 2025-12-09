/**
 * AI 육아 상담 - 채팅방 (음성 상담 + 이미지 분석)
 * 썬데이허그 브랜드 스타일 UI
 */
import type { Route } from "./+types/chat-room";

import { Link, useLoaderData, useFetcher, data } from "react-router";
import { 
  ArrowLeft, 
  Send,
  ImagePlus,
  Mic,
  Volume2,
  VolumeX,
  Loader2,
  Bot,
  User,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  Square,
  X,
  Copy,
  Check,
  ExternalLink
} from "lucide-react";
import React, { useState, useRef, useEffect, useCallback } from "react";

import { Button } from "~/core/components/ui/button";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

// 음성 녹음 훅
function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } 
      });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4'
      });
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (err) {
      console.error("마이크 접근 오류:", err);
    }
  }, []);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === "inactive") {
        resolve(null);
        return;
      }
      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mediaRecorderRef.current?.mimeType || 'audio/webm' });
        mediaRecorderRef.current?.stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setIsRecording(false);
        resolve(blob);
      };
      mediaRecorderRef.current.stop();
    });
  }, []);

  return { isRecording, isProcessing, setIsProcessing, startRecording, stopRecording };
}

// 오디오 플레이어 훅
function useAudioPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayingId, setCurrentPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback((audioUrl: string, messageId: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    const audio = new Audio(audioUrl);
    audioRef.current = audio;
    setCurrentPlayingId(messageId);
    setIsPlaying(true);
    audio.onended = () => { setIsPlaying(false); setCurrentPlayingId(null); };
    audio.onerror = () => { setIsPlaying(false); setCurrentPlayingId(null); };
    audio.play().catch(() => { setIsPlaying(false); setCurrentPlayingId(null); });
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setIsPlaying(false);
    setCurrentPlayingId(null);
  }, []);

  return { isPlaying, currentPlayingId, play, stop };
}

export function meta(): Route.MetaDescriptors {
  return [{ title: "AI 상담 | 썬데이허그" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ session: null, messages: [], babyProfile: null, isNew: false });
  }

  const sessionId = params.sessionId;

  if (sessionId === "new") {
    const { data: babyProfile } = await supabase
      .from("baby_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();
    return data({ session: null, messages: [], babyProfile, isNew: true });
  }

  const { data: session } = await supabase
    .from("chat_sessions")
    .select(`*, baby_profiles (*)`)
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return data({ session: null, messages: [], babyProfile: null, isNew: false });
  }

  const { data: messages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return data({ session, messages: messages || [], babyProfile: session.baby_profiles, isNew: false });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return data({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "feedback") {
    const messageId = formData.get("messageId") as string;
    const helpful = formData.get("helpful") === "true";
    await supabase.from("chat_feedback").insert({ message_id: messageId, user_id: user.id, helpful, rating: helpful ? 5 : 1 });
    return data({ success: true });
  }

  if (actionType === "saveBabyProfile") {
    const babyName = formData.get("babyName") as string;
    const birthDate = formData.get("birthDate") as string;
    const feedingType = formData.get("feedingType") as string;

    if (!birthDate) return data({ error: "생년월일은 필수입니다." }, { status: 400 });

    const { data: newProfile, error } = await supabase
      .from("baby_profiles")
      .insert({ user_id: user.id, name: babyName || null, birth_date: birthDate, feeding_type: feedingType || null })
      .select()
      .single();

    if (error) return data({ error: "프로필 저장에 실패했습니다." }, { status: 500 });
    return data({ success: true, babyProfileSaved: true, babyProfile: newProfile });
  }

  return data({ error: "잘못된 요청" }, { status: 400 });
}

export default function ChatRoomScreen() {
  const { session, messages: initialMessages, babyProfile: initialBabyProfile } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const chatFetcher = useFetcher();
  const profileFetcher = useFetcher();
  const ttsFetcher = useFetcher();
  const sttFetcher = useFetcher();
  
  const [inputValue, setInputValue] = useState("");
  const [localMessages, setLocalMessages] = useState(initialMessages);
  const [localBabyProfile, setLocalBabyProfile] = useState(initialBabyProfile);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(session?.id || null);
  const [selectedImage, setSelectedImage] = useState<{ file: File; preview: string } | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const voiceRecorder = useVoiceRecorder();
  const audioPlayer = useAudioPlayer();
  const [loadingTtsId, setLoadingTtsId] = useState<string | null>(null);
  const [audioCache, setAudioCache] = useState<Record<string, string>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [babyName, setBabyName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [feedingType, setFeedingType] = useState("");

  const isLoading = chatFetcher.state !== "idle";
  const babyProfile = localBabyProfile;
  const isNewSession = !currentSessionId;

  // Effects
  useEffect(() => {
    if (profileFetcher.data?.babyProfileSaved && profileFetcher.data?.babyProfile) {
      setLocalBabyProfile(profileFetcher.data.babyProfile);
    }
  }, [profileFetcher.data]);

  useEffect(() => { setLocalMessages(initialMessages); }, [initialMessages]);
  useEffect(() => { if (session?.id) setCurrentSessionId(session.id); }, [session?.id]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [localMessages]);

  useEffect(() => {
    if (chatFetcher.data?.success && chatFetcher.data?.message) {
      setLocalMessages((prev: typeof initialMessages) => [...prev, chatFetcher.data.message]);
      // 새 세션이 생성되면 sessionId만 저장 (URL 변경 없이 - React Router 충돌 방지)
      if (chatFetcher.data?.sessionId && !currentSessionId) {
        setCurrentSessionId(chatFetcher.data.sessionId);
        // URL 변경은 하지 않음 - 페이지 튕김 방지
      }
    }
  }, [chatFetcher.data, currentSessionId]);

  useEffect(() => {
    if (sttFetcher.data?.success && sttFetcher.data?.text) {
      setInputValue((prev: string) => prev + (prev ? " " : "") + sttFetcher.data.text);
      voiceRecorder.setIsProcessing(false);
    } else if (sttFetcher.data?.error) {
      voiceRecorder.setIsProcessing(false);
    }
  }, [sttFetcher.data]);

  useEffect(() => {
    if (ttsFetcher.data?.success && ttsFetcher.data?.audioUrl && loadingTtsId) {
      setAudioCache((prev: Record<string, string>) => ({ ...prev, [loadingTtsId]: ttsFetcher.data.audioUrl }));
      audioPlayer.play(ttsFetcher.data.audioUrl, loadingTtsId);
      setLoadingTtsId(null);
    } else if (ttsFetcher.data?.error) {
      setLoadingTtsId(null);
    }
  }, [ttsFetcher.data, loadingTtsId]);

  // Handlers
  const handleVoiceRecord = async () => {
    if (voiceRecorder.isRecording) {
      voiceRecorder.setIsProcessing(true);
      const audioBlob = await voiceRecorder.stopRecording();
      if (audioBlob && audioBlob.size > 0) {
        const formData = new FormData();
        formData.append("audio", audioBlob, "recording.webm");
        sttFetcher.submit(formData, { method: "post", action: "/api/chat/stt", encType: "multipart/form-data" });
      } else {
        voiceRecorder.setIsProcessing(false);
      }
    } else {
      await voiceRecorder.startRecording();
    }
  };

  const handlePlayTTS = (messageId: string, text: string) => {
    if (audioPlayer.currentPlayingId === messageId && audioPlayer.isPlaying) {
      audioPlayer.stop();
      return;
    }
    if (audioCache[messageId]) {
      audioPlayer.play(audioCache[messageId], messageId);
      return;
    }
    setLoadingTtsId(messageId);
    const formData = new FormData();
    formData.append("text", text);
    ttsFetcher.submit(formData, { method: "post", action: "/api/chat/tts" });
  };

  const handleCopy = (messageId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(messageId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const preview = URL.createObjectURL(file);
      setSelectedImage({ file, preview });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputValue.trim() && !selectedImage) || isLoading) return;

    const userMessage = {
      id: `temp-${Date.now()}`,
      role: "user" as const,
      content: inputValue || "[이미지]",
      image_url: selectedImage?.preview,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev: typeof initialMessages) => [...prev, userMessage]);

    const formData = new FormData();
    formData.append("message", inputValue);
    formData.append("sessionId", currentSessionId || "new");
    if (selectedImage?.file) {
      formData.append("image", selectedImage.file);
    }

    chatFetcher.submit(formData, { method: "post", action: "/api/chat/send", encType: "multipart/form-data" });
    setInputValue("");
    setSelectedImage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleFeedback = (messageId: string, helpful: boolean) => {
    fetcher.submit({ actionType: "feedback", messageId, helpful: String(helpful) }, { method: "post" });
  };

  const babyMonths = babyProfile?.birth_date 
    ? Math.floor((Date.now() - new Date(babyProfile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30))
    : null;

  const handleSaveBabyProfile = () => {
    if (!birthDate) { alert("생년월일을 입력해주세요."); return; }
    profileFetcher.submit({ actionType: "saveBabyProfile", babyName, birthDate, feedingType }, { method: "post" });
  };

  // 아기 정보 등록 화면
  if (!babyProfile && isNewSession) {
    return (
      <div className="flex flex-col h-screen bg-[#F5F5F0]">
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3">
          <Link to="/customer/chat" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200">
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
              <p className="text-gray-500 text-sm">맞춤형 상담을 위해 아기 정보를 알려주세요</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">아기 이름 (선택)</label>
                <input
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="예: 콩이"
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">생년월일 *</label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full h-12 px-4 rounded-xl border border-gray-200 focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">수유 방식 (선택)</label>
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

  // 메인 채팅 화면
  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto bg-white md:my-4 md:rounded-2xl md:shadow-lg md:border md:border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <Link to="/customer/chat" className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-gray-900 truncate">{session?.title || "새 상담"}</h1>
            {babyProfile && (
              <p className="text-xs text-gray-500">{babyProfile.name || "아기"} • {babyMonths}개월</p>
            )}
          </div>
          <div className="w-9 h-9 bg-gradient-to-br from-[#FF6B35] to-orange-400 rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 bg-[#F5F5F0]">
          {/* Welcome */}
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
                          <strong>{babyProfile.name || "아기"}</strong>({babyMonths}개월)에 대해 궁금한 점이 있으시면 편하게 물어봐 주세요!
                        </>
                      )}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["밤에 자주 깨요", "이유식 시작 시기", "수면 교육 방법"].map((suggestion) => (
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
          {localMessages.map((msg: typeof initialMessages[number]) => (
            <div key={msg.id} className={`mb-4 flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user" ? "bg-gray-200" : "bg-gradient-to-br from-[#FF6B35] to-orange-400"
              }`}>
                {msg.role === "user" ? <User className="w-5 h-5 text-gray-600" /> : <Bot className="w-5 h-5 text-white" />}
              </div>
              <div className={`flex-1 max-w-[80%] ${msg.role === "user" ? "flex flex-col items-end" : ""}`}>
                {msg.role === "assistant" && (
                  <p className="text-xs text-gray-500 mb-1 font-medium">AI 육아 상담사</p>
                )}
                <div className={`rounded-2xl p-4 ${
                  msg.role === "user"
                    ? "bg-[#FF6B35] text-white rounded-tr-md"
                    : "bg-white shadow-sm rounded-tl-md text-gray-800"
                }`}>
                  {/* 이미지 표시 */}
                  {msg.image_url && (
                    <img src={msg.image_url} alt="첨부 이미지" className="max-w-full rounded-xl mb-2" />
                  )}
                  <p className="whitespace-pre-wrap text-inherit">{msg.content}</p>
                  
                  {/* 출처 */}
                  {msg.role === "assistant" && msg.sources && (() => {
                    try {
                      const sources = typeof msg.sources === 'string' ? JSON.parse(msg.sources) : msg.sources;
                      if (!Array.isArray(sources) || sources.length === 0) return null;
                      return (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <p className="text-xs text-gray-400 mb-1">📚 참고 자료</p>
                          <div className="flex flex-wrap gap-1">
                            {sources.map((source: { name: string; url?: string }, i: number) => (
                              <a key={i} href={source.url || "#"} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                                {source.name}
                                {source.url && <ExternalLink className="w-3 h-3" />}
                              </a>
                            ))}
                          </div>
                        </div>
                      );
                    } catch { return null; }
                  })()}
                </div>
                
                {/* AI 메시지 액션 버튼 */}
                {msg.role === "assistant" && (
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => handlePlayTTS(msg.id, msg.content)}
                      disabled={loadingTtsId === msg.id}
                      className={`p-1.5 rounded-full transition-colors ${
                        audioPlayer.currentPlayingId === msg.id && audioPlayer.isPlaying
                          ? "text-[#FF6B35] bg-orange-50"
                          : "text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50"
                      }`}
                      title="음성으로 듣기"
                    >
                      {loadingTtsId === msg.id ? <Loader2 className="w-4 h-4 animate-spin" /> 
                        : audioPlayer.currentPlayingId === msg.id && audioPlayer.isPlaying 
                          ? <VolumeX className="w-4 h-4" /> 
                          : <Volume2 className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="p-1.5 text-gray-400 hover:text-[#FF6B35] hover:bg-orange-50 rounded-full transition-colors"
                      title="복사"
                    >
                      {copiedId === msg.id ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
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
          {/* 선택된 이미지 미리보기 */}
          {selectedImage && (
            <div className="mb-3 relative inline-block">
              <img src={selectedImage.preview} alt="미리보기" className="h-20 rounded-lg border" />
              <button
                onClick={() => setSelectedImage(null)}
                className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-gray-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 녹음 중 표시 */}
          {voiceRecorder.isRecording && (
            <div className="mb-2 flex items-center gap-2 text-red-500 text-sm animate-pulse">
              <span className="w-2 h-2 bg-red-500 rounded-full" />
              🎙️ 녹음 중... 다시 클릭하면 종료됩니다
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            {/* 이미지 첨부 */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageSelect} className="hidden" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
            >
              <ImagePlus className="w-5 h-5 text-gray-500" />
            </button>

            {/* 음성 입력 */}
            <button
              type="button"
              onClick={handleVoiceRecord}
              disabled={voiceRecorder.isProcessing || isLoading}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                voiceRecorder.isRecording 
                  ? "bg-red-500 text-white animate-pulse" 
                  : voiceRecorder.isProcessing
                    ? "bg-orange-400 text-white"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
              title={voiceRecorder.isRecording ? "녹음 중지" : voiceRecorder.isProcessing ? "변환 중..." : "음성으로 입력"}
            >
              {voiceRecorder.isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> 
                : voiceRecorder.isRecording ? <Square className="w-4 h-4" /> 
                : <Mic className="w-5 h-5" />}
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
              disabled={(!inputValue.trim() && !selectedImage) || isLoading}
              className="w-10 h-10 rounded-full bg-[#FF6B35] hover:bg-[#FF6B35]/90 p-0 flex-shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </form>

          <p className="text-xs text-gray-400 text-center mt-2">
            AI가 생성한 답변은 참고용이며, 전문의 상담을 대체하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  );
}
