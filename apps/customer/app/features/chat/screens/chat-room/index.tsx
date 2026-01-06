/**
 * AI 육아 상담 - 채팅방 (음성 상담 + 이미지 분석)
 * 썬데이허그 브랜드 스타일 UI
 */
import type { Route } from "./+types/chat-room";
import { useLoaderData, useFetcher, data } from "react-router";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";

import makeServerClient from "~/core/lib/supa-client.server";

import type { Message, SelectedImage } from "./types";
import { useVoiceRecorder, useAudioPlayer } from "./hooks";
import { ChatHeader, MessageList, MessageInput, BabyProfileForm } from "./components";

export function meta(): Route.MetaDescriptors {
  return [{ title: "AI 상담 | 썬데이허그" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return data({ session: null, messages: [], babyProfile: null, isNew: false });
  }

  const sessionId = params.sessionId;
  const url = new URL(request.url);
  const selectedBabyId = url.searchParams.get("babyId");

  if (sessionId === "new") {
    let babyProfile = null;

    if (selectedBabyId) {
      const { data: selectedProfile } = await supabase
        .from("baby_profiles")
        .select("*")
        .eq("user_id", user.id)
        .eq("id", selectedBabyId)
        .single();
      babyProfile = selectedProfile;
    }

    if (!babyProfile) {
      const { data: firstProfile } = await supabase
        .from("baby_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .single();
      babyProfile = firstProfile;
    }

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

  return data({
    session,
    messages: messages || [],
    babyProfile: session.baby_profiles,
    isNew: false,
  });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return data({ error: "로그인이 필요합니다." }, { status: 401 });

  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "feedback") {
    const messageId = formData.get("messageId") as string;
    const helpful = formData.get("helpful") === "true";
    await supabase.from("chat_feedback").insert({
      message_id: messageId,
      user_id: user.id,
      helpful,
      rating: helpful ? 5 : 1,
    });
    return data({ success: true });
  }

  if (actionType === "saveBabyProfile") {
    const babyName = formData.get("babyName") as string;
    const birthDate = formData.get("birthDate") as string;
    const feedingType = formData.get("feedingType") as string;

    if (!birthDate) return data({ error: "생년월일은 필수입니다." }, { status: 400 });

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

    if (error) return data({ error: "프로필 저장에 실패했습니다." }, { status: 500 });
    return data({ success: true, babyProfileSaved: true, babyProfile: newProfile });
  }

  return data({ error: "잘못된 요청" }, { status: 400 });
}

export default function ChatRoomScreen() {
  const { t } = useTranslation(["chat", "common"]);
  const {
    session,
    messages: initialMessages,
    babyProfile: initialBabyProfile,
  } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const chatFetcher = useFetcher();
  const profileFetcher = useFetcher();
  const ttsFetcher = useFetcher();
  const sttFetcher = useFetcher();

  const [inputValue, setInputValue] = useState("");
  const [localMessages, setLocalMessages] = useState<Message[]>(initialMessages as Message[]);
  const [localBabyProfile, setLocalBabyProfile] = useState(initialBabyProfile);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(session?.id || null);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (initialMessages.length > 0 && localMessages.length === 0) {
      setLocalMessages(initialMessages as Message[]);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (session?.id && !currentSessionId) setCurrentSessionId(session.id);
  }, [session?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  useEffect(() => {
    if (chatFetcher.data?.success && chatFetcher.data?.message) {
      const newMessage = chatFetcher.data.message;
      setLocalMessages((prev) => {
        const alreadyExists = prev.some((msg) => msg.id === newMessage.id);
        if (alreadyExists) return prev;
        return [...prev, newMessage];
      });
      if (chatFetcher.data?.sessionId && !currentSessionId) {
        setCurrentSessionId(chatFetcher.data.sessionId);
      }
    }
  }, [chatFetcher.data, currentSessionId]);

  useEffect(() => {
    if (sttFetcher.data?.success && sttFetcher.data?.text) {
      setInputValue((prev) => prev + (prev ? " " : "") + sttFetcher.data.text);
      voiceRecorder.setIsProcessing(false);
    } else if (sttFetcher.data?.error) {
      voiceRecorder.setIsProcessing(false);
    }
  }, [sttFetcher.data]);

  useEffect(() => {
    if (ttsFetcher.data?.success && ttsFetcher.data?.audioUrl && loadingTtsId) {
      setAudioCache((prev) => ({ ...prev, [loadingTtsId]: ttsFetcher.data.audioUrl }));
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
        sttFetcher.submit(formData, {
          method: "post",
          action: "/api/chat/stt",
          encType: "multipart/form-data",
        });
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

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      role: "user",
      content: inputValue || "[이미지]",
      image_url: selectedImage?.preview,
      created_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, userMessage]);

    const formData = new FormData();
    formData.append("message", inputValue);
    formData.append("sessionId", currentSessionId || "new");
    if (localBabyProfile?.id) {
      formData.append("babyProfileId", localBabyProfile.id);
    }
    if (selectedImage?.file) {
      formData.append("image", selectedImage.file);
    }

    chatFetcher.submit(formData, {
      method: "post",
      action: "/api/chat/send",
      encType: "multipart/form-data",
    });
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
    fetcher.submit(
      { actionType: "feedback", messageId, helpful: String(helpful) },
      { method: "post" }
    );
  };

  const babyMonths = babyProfile?.birth_date
    ? Math.floor(
        (Date.now() - new Date(babyProfile.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30)
      )
    : null;

  const handleSaveBabyProfile = () => {
    if (!birthDate) {
      alert(t("chat:babyProfile.validation.birthDateRequired"));
      return;
    }
    profileFetcher.submit(
      { actionType: "saveBabyProfile", babyName, birthDate, feedingType },
      { method: "post" }
    );
  };

  // Baby profile registration screen
  if (!babyProfile && isNewSession) {
    return (
      <BabyProfileForm
        babyName={babyName}
        birthDate={birthDate}
        feedingType={feedingType}
        onBabyNameChange={setBabyName}
        onBirthDateChange={setBirthDate}
        onFeedingTypeChange={setFeedingType}
        onSubmit={handleSaveBabyProfile}
        isSubmitting={profileFetcher.state !== "idle"}
      />
    );
  }

  // Main chat screen
  return (
    <div className="flex flex-col h-screen bg-[#F5F5F0]">
      <div className="flex-1 flex flex-col w-full max-w-2xl mx-auto bg-white md:my-4 md:rounded-2xl md:shadow-lg md:border md:border-gray-200 overflow-hidden">
        <ChatHeader session={session} babyProfile={babyProfile} babyMonths={babyMonths} />

        <MessageList
          ref={messagesEndRef}
          messages={localMessages}
          babyProfile={babyProfile}
          babyMonths={babyMonths}
          isLoading={isLoading}
          isPlaying={audioPlayer.isPlaying}
          currentPlayingId={audioPlayer.currentPlayingId}
          loadingTtsId={loadingTtsId}
          copiedId={copiedId}
          onSuggestionClick={setInputValue}
          onPlayTTS={handlePlayTTS}
          onCopy={handleCopy}
          onFeedback={handleFeedback}
        />

        <MessageInput
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSubmit={handleSubmit}
          onKeyDown={handleKeyDown}
          selectedImage={selectedImage}
          onImageSelect={handleImageSelect}
          onImageClear={() => setSelectedImage(null)}
          isRecording={voiceRecorder.isRecording}
          isProcessing={voiceRecorder.isProcessing}
          onVoiceRecord={handleVoiceRecord}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
