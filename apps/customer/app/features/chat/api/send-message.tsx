/**
 * AI 육아 상담 - 메시지 전송 API
 * Gemini API + 벡터 RAG 연동 (OpenAI Embeddings)
 */
import type { Route } from "./+types/send-message";

import { data } from "react-router";
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

// OpenAI 초기화 (벡터 임베딩용) - lazy initialization
let openai: OpenAI | null = null;
function getOpenAI() {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

// Gemini 초기화
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// 시스템 프롬프트 - 자연스러운 대화체
const SYSTEM_PROMPT = `당신은 썬데이허그 AI 육아 상담사예요. 경험 많은 선배 엄마처럼 따뜻하게 대화해주세요.

[대화 스타일 - 반드시 지켜주세요]
- 친한 언니나 선배 엄마가 카톡으로 조언해주는 느낌으로 말해주세요
- 마크다운 문법 절대 사용 금지! (###, **, -, 1. 2. 3. 등 사용하지 마세요)
- 글머리 기호나 번호 없이 자연스러운 문장으로 이어가세요
- 한 문단에 2~3문장씩 짧게 끊어서 읽기 편하게 답변해주세요
- 이모지는 답변 끝에 하나만 자연스럽게 넣어주세요

[좋은 예시]
"아, 밤에 자주 깨서 힘드시죠? 저도 그 시기가 제일 힘들었어요.

이 월령 아기들은 수면 패턴이 아직 완전히 자리 잡지 않아서 그래요. 보통 4~6개월 사이에 점점 나아지거든요.

낮잠 시간을 좀 조절해보시면 어떨까요? 오후 4시 이후에는 재우지 않는 게 좋아요. 그리고 저녁에 목욕 후 수유하고 재우는 루틴을 만들어보세요.

힘내세요! 지금 정말 잘하고 계신 거예요 😊"

[나쁜 예시 - 이렇게 하지 마세요]
"### 1. 수면 환경 점검
- 온도: 20~22도 유지
- 습도: 50~60%

### 2. 수면 루틴 형성
**규칙적인 취침 시간**이 중요합니다."

[규칙]
- 추측하지 말고 확실한 정보만 알려주세요
- 출처는 자연스럽게 녹여서 (예: "소아과학회에서도 권장하는 방법인데요")
- 의료 증상은 진단하지 말고 병원 방문 권유하세요
- 부모님을 안심시키고 응원해주세요

[참고 자료가 있다면]
딱딱하게 인용하지 말고 자연스러운 대화로 풀어서 설명해주세요.
`;

// 월령 계산
function calculateMonths(birthDate: string): number {
  const birth = new Date(birthDate);
  const now = new Date();
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + 
                 (now.getMonth() - birth.getMonth());
  return Math.max(0, months);
}

// 주제 분류
function classifyTopic(message: string): string {
  const keywords = {
    sleep: ["잠", "수면", "낮잠", "밤잠", "통잠", "깨", "재우", "잠투정", "퇴행"],
    feeding: ["수유", "분유", "모유", "이유식", "먹", "젖", "젖병", "밥", "식사"],
    development: ["발달", "뒤집", "기어", "걷", "말", "옹알이", "대근육", "소근육"],
    health: ["열", "아파", "아픈", "병원", "감기", "콧물", "기침", "약", "예방접종", "주사"],
    emotion: ["울", "보채", "불안", "분리", "떼", "짜증", "낯가림"],
  };

  for (const [topic, words] of Object.entries(keywords)) {
    if (words.some(word => message.includes(word))) {
      return topic;
    }
  }
  return "general";
}

// 월령 범위 결정
function getAgeRange(months: number): string {
  if (months <= 3) return "0-3m";
  if (months <= 6) return "4-6m";
  if (months <= 12) return "7-12m";
  return "13-24m";
}

// 후속 질문 감지 (이전 대화 참조가 필요한 질문인지)
function isFollowUpQuestion(message: string): boolean {
  const followUpPatterns = [
    "그거", "그건", "그게", "거기", "이거", "이건", "저거", "저건",
    "그러면", "그럼", "근데", "그래서", "그리고",
    "아까", "방금", "위에", "앞서",
    "더 자세히", "더 알려", "예를 들어", "예시",
    "왜요", "왜죠", "어떻게요", "뭐죠",
    "다른", "또", "추가로", "그 외에",
    "맞아요", "아니요", "네", "응",
  ];
  
  const lowerMessage = message.toLowerCase();
  return followUpPatterns.some(pattern => lowerMessage.includes(pattern));
}

// 대화 히스토리를 더 구조화된 형태로 정리
function formatConversationHistory(
  messages: Array<{ role: string; content: string }>,
  isFollowUp: boolean
): string {
  if (!messages || messages.length === 0) return "";
  
  // 최근 대화 (최대 6개 메시지 = 3턴)
  const recentMessages = messages.slice(-6);
  
  let history = "\n\n[이전 대화 내용]\n";
  
  recentMessages.forEach((msg, idx) => {
    const roleName = msg.role === "user" ? "👤 부모님" : "🤖 상담사";
    // 메시지가 너무 길면 요약
    const content = msg.content.length > 300 
      ? msg.content.slice(0, 300) + "..." 
      : msg.content;
    history += `${roleName}: ${content}\n\n`;
  });
  
  if (isFollowUp) {
    history += "---\n⚠️ 위 대화의 맥락을 잘 파악해서, 이전에 논의한 내용을 바탕으로 답변해주세요.\n";
    history += "사용자가 '그거', '그건' 등으로 이전 내용을 참조하고 있으니, 무엇을 가리키는지 파악하세요.\n";
  } else {
    history += "---\n위 대화 흐름을 참고해서 자연스럽게 이어서 답변해주세요.\n";
  }
  
  return history;
}

// 벡터 임베딩 생성
async function getEmbedding(text: string): Promise<number[]> {
  const client = getOpenAI();
  if (!client) {
    throw new Error("OPENAI_API_KEY가 설정되지 않았습니다.");
  }
  try {
    const response = await client.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error("임베딩 생성 오류:", error);
    throw error;
  }
}

// RAG 검색 (벡터 유사도 기반) - OpenAI Embeddings 사용
async function searchKnowledge(topic: string, ageRange: string, query: string) {
  try {
    // 1. 쿼리 벡터 생성
    const queryEmbedding = await getEmbedding(query);
    
    // 2. 벡터 유사도 검색 (Supabase RPC 함수 호출)
    const { data: vectorMatches, error } = await adminClient.rpc('search_knowledge', {
      query_embedding: queryEmbedding,
      match_count: 5,
      filter_topic: topic !== 'general' ? topic : null,
      filter_age_range: ageRange !== 'all' ? ageRange : null,
    });

    if (error) {
      console.error("벡터 검색 오류:", error);
      // 폴백: 키워드 기반 검색
      return fallbackKeywordSearch(topic, ageRange, query);
    }

    if (vectorMatches && vectorMatches.length > 0) {
      // 사용량 카운트 업데이트
      for (const match of vectorMatches.slice(0, 3)) {
        await adminClient.rpc('increment_knowledge_usage', { knowledge_id: match.id });
      }
      
      return vectorMatches.slice(0, 3).map((k: any) => ({
        question: k.question,
        answer: k.answer,
        source_name: k.source_name,
        source_url: k.source_url,
        similarity: k.similarity,
      }));
    }

    // 벡터 검색 결과 없으면 폴백
    return fallbackKeywordSearch(topic, ageRange, query);
    
  } catch (error) {
    console.error("RAG 검색 오류:", error);
    return fallbackKeywordSearch(topic, ageRange, query);
  }
}

// 폴백: 키워드 기반 검색 (벡터 검색 실패 시)
async function fallbackKeywordSearch(topic: string, ageRange: string, query: string) {
  const { data: matches } = await adminClient
    .from("chat_knowledge")
    .select("id, question, answer, source_name, source_url, tags")
    .or(`age_range.eq.${ageRange},age_range.eq.all`)
    .limit(10);

  if (!matches || matches.length === 0) {
    return [];
  }

  return rankByRelevance(matches, query);
}

// 관련도 점수 계산 및 정렬 (폴백용)
function rankByRelevance(
  knowledge: Array<{
    id: string;
    question: string;
    answer: string;
    source_name: string;
    source_url: string | null;
    tags: string[] | null;
  }>,
  query: string
): Array<{ question: string; answer: string; source_name: string; source_url: string | null }> {
  const queryWords = query.toLowerCase().split(/\s+/);
  
  const scored = knowledge.map(k => {
    let score = 0;
    const questionLower = k.question.toLowerCase();
    const answerLower = k.answer.toLowerCase();
    const tags = k.tags || [];
    
    // 질문 일치 점수 (높음)
    queryWords.forEach(word => {
      if (questionLower.includes(word)) score += 3;
    });
    
    // 태그 일치 점수 (중간)
    queryWords.forEach(word => {
      if (tags.some(tag => tag.toLowerCase().includes(word))) score += 2;
    });
    
    // 답변 일치 점수 (낮음)
    queryWords.forEach(word => {
      if (answerLower.includes(word)) score += 1;
    });
    
    return { ...k, score };
  });

  // 점수 높은 순 정렬, 상위 3개 반환
  return scored
    .sort((a, b) => b.score - a.score)
    .filter(k => k.score > 0)
    .slice(0, 3)
    .map(({ question, answer, source_name, source_url }) => ({
      question,
      answer,
      source_name,
      source_url,
    }));
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const formData = await request.formData();
  const message = formData.get("message") as string;
  const sessionId = formData.get("sessionId") as string;
  const babyProfileId = formData.get("babyProfileId") as string;
  const imageFile = formData.get("image") as File | null;

  if (!message?.trim() && !imageFile) {
    return data({ error: "메시지를 입력해주세요." }, { status: 400 });
  }
  
  // 이미지가 있으면 base64로 변환
  let imageBase64: string | null = null;
  let imageMimeType: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString("base64");
    imageMimeType = imageFile.type || "image/jpeg";
  }

  try {
    let currentSessionId = sessionId;

    // 아기 프로필 가져오기 (선택된 아이 또는 첫 번째 아이)
    let babyProfile = null;
    
    if (babyProfileId) {
      const { data: selectedProfile } = await supabase
        .from("baby_profiles")
        .select("*")
        .eq("id", babyProfileId)
        .eq("user_id", user.id)
        .single();
      
      if (selectedProfile) {
        babyProfile = selectedProfile;
      }
    }
    
    // 선택된 아이가 없으면 첫 번째 아이 사용
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

    const babyMonths = babyProfile?.birth_date 
      ? calculateMonths(babyProfile.birth_date) 
      : null;
    const ageRange = babyMonths ? getAgeRange(babyMonths) : "all";

    // 새 세션 생성
    if (!currentSessionId || currentSessionId === "new") {
      const topic = classifyTopic(message);
      
      const { data: newSession, error: sessionError } = await supabase
        .from("chat_sessions")
        .insert({
          user_id: user.id,
          baby_id: babyProfile?.id || null,
          title: message.slice(0, 50) + (message.length > 50 ? "..." : ""),
          topic,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        console.error("세션 생성 오류:", sessionError);
        return data({ error: "세션 생성에 실패했습니다." }, { status: 500 });
      }
      currentSessionId = newSession.id;
    }

    // 이전 대화 내용 조회 (최근 10개 메시지 - 대화 맥락 유지용)
    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", currentSessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    // 사용자 메시지 저장
    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: currentSessionId,
        role: "user",
        content: message,
      });

    if (userMsgError) {
      console.error("사용자 메시지 저장 오류:", userMsgError);
      return data({ error: "메시지 저장에 실패했습니다." }, { status: 500 });
    }

    // RAG 검색
    const topic = classifyTopic(message);
    const relevantKnowledge = await searchKnowledge(topic, ageRange, message);

    // 컨텍스트 구성
    let contextText = "";
    const sources: { name: string; url?: string }[] = [];

    if (relevantKnowledge.length > 0) {
      contextText = "\n\n[참고 자료]\n";
      relevantKnowledge.forEach((k, i) => {
        contextText += `\n### 참고 ${i + 1}: ${k.question}\n${k.answer}\n`;
        if (k.source_name) {
          sources.push({ name: k.source_name, url: k.source_url });
        }
      });
    }

    // 아기 정보 컨텍스트
    let babyContext = "";
    if (babyProfile) {
      babyContext = `\n\n[아기 정보]
- 이름: ${babyProfile.name || "아기"}
- 월령: ${babyMonths}개월
- 수유 방식: ${babyProfile.feeding_type === "breast" ? "모유" : babyProfile.feeding_type === "formula" ? "분유" : babyProfile.feeding_type === "mixed" ? "혼합" : "미설정"}
`;
    }

    // 후속 질문 여부 감지
    const isFollowUp = isFollowUpQuestion(message);
    
    // 이전 대화 히스토리 구성 (개선된 버전)
    const conversationHistory = formatConversationHistory(
      previousMessages || [],
      isFollowUp
    );

    // Gemini API 호출 (새로운 @google/genai 패키지)
    const textPrompt = `${SYSTEM_PROMPT}${babyContext}${conversationHistory}${contextText}

[현재 질문]
${message || "(이미지 분석 요청)"}
${isFollowUp ? "\n(참고: 이 질문은 이전 대화 내용을 참조하는 후속 질문입니다. 맥락을 잘 파악해주세요.)" : ""}
${imageBase64 ? "\n(참고: 사용자가 이미지를 첨부했습니다. 이미지 내용을 분석해서 답변해주세요.)" : ""}

[답변]`;

    let aiResponse: string;
    
    if (imageBase64 && imageMimeType) {
      // 이미지가 있으면 Vision 모델 사용
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: [
          {
            role: "user",
            parts: [
              { text: textPrompt },
              {
                inlineData: {
                  mimeType: imageMimeType,
                  data: imageBase64,
                },
              },
            ],
          },
        ],
      });
      aiResponse = response.text ?? "";
    } else {
      // 텍스트만 있으면 일반 호출
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: textPrompt,
      });
      aiResponse = response.text ?? "";
    }

    // AI 응답 저장
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: currentSessionId,
        role: "assistant",
        content: aiResponse,
        sources: sources.length > 0 ? JSON.stringify(sources) : null,
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error("AI 메시지 저장 오류:", aiMsgError);
    }

    // 세션 업데이트
    await supabase
      .from("chat_sessions")
      .update({ 
        updated_at: new Date().toISOString(),
        topic,
      })
      .eq("id", currentSessionId);

    return data({ 
      success: true, 
      sessionId: currentSessionId,
      message: {
        id: aiMessage?.id,
        role: "assistant",
        content: aiResponse,
        sources,
      }
    });

  } catch (error) {
    console.error("AI 응답 생성 오류:", error);
    
    // 에러 시 기본 응답
    const fallbackResponse = `죄송합니다, 일시적인 오류가 발생했어요. 😢

잠시 후 다시 시도해주시거나, 다른 방식으로 질문해주시면 도움드릴게요.

긴급한 건강 문제라면 가까운 소아과나 응급실을 방문해주세요.`;

    return data({ 
      success: false, 
      error: "AI 응답 생성에 실패했습니다.",
      fallbackMessage: fallbackResponse
    }, { status: 500 });
  }
}

