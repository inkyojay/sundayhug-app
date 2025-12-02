/**
 * AI 육아 상담 - 메시지 전송 API
 * Gemini API + RAG 연동
 */
import type { Route } from "./+types/send-message";

import { data } from "react-router";
import { GoogleGenerativeAI } from "@google/generative-ai";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

// Gemini 초기화
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

// 시스템 프롬프트
const SYSTEM_PROMPT = `당신은 "썬데이허그 AI 육아 상담사"입니다. 0~24개월 영아를 키우는 부모님을 돕습니다.

## 역할
- 수면, 수유, 발달, 건강, 정서 관련 상담
- 과학적 근거 기반의 정확한 정보 제공
- 부모님의 불안을 덜어주는 따뜻한 대화

## 규칙 (반드시 지키세요)
1. **사실만 말하세요**: 추측하거나 지어내지 마세요
2. **출처를 명시하세요**: "대한소아과학회에 따르면...", "WHO 권장사항은..." 등
3. **확실하지 않으면**: "정확한 정보를 위해 소아과 상담을 권장드려요"라고 하세요
4. **의료적 증상은 진단하지 마세요**: 열, 구토, 발진 등은 병원 방문을 권유하세요
5. **긍정적이고 공감하세요**: 부모님을 죄책감 들게 하지 마세요

## 답변 형식
- 친근하고 따뜻한 말투 사용 (반말 X, 존댓말 O)
- 핵심 내용은 **굵게** 표시
- 긴 내용은 ## 제목으로 구분
- 목록은 - 또는 1. 2. 3. 사용
- 마지막에 격려의 말 한마디

## 제공된 컨텍스트
아래 [참고 자료]가 있다면 이를 기반으로 답변하세요. 없다면 일반적인 지식으로 답변하되, 확실하지 않은 내용은 피하세요.
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

// RAG 검색 (텍스트 유사도 기반)
async function searchKnowledge(topic: string, ageRange: string, query: string) {
  // 1차: 주제 + 월령 기반 검색
  const { data: topicMatches } = await adminClient
    .from("chat_knowledge")
    .select("id, question, answer, source_name, source_url, tags")
    .or(`age_range.eq.${ageRange},age_range.eq.all`)
    .eq("topic", topic)
    .limit(10);

  if (!topicMatches || topicMatches.length === 0) {
    // 2차: 전체에서 검색
    const { data: allMatches } = await adminClient
      .from("chat_knowledge")
      .select("id, question, answer, source_name, source_url, tags")
      .or(`age_range.eq.${ageRange},age_range.eq.all`)
      .limit(10);
    
    return rankByRelevance(allMatches || [], query);
  }

  return rankByRelevance(topicMatches, query);
}

// 관련도 점수 계산 및 정렬
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

  if (!message?.trim()) {
    return data({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  try {
    let currentSessionId = sessionId;

    // 아기 프로필 가져오기
    const { data: babyProfile } = await supabase
      .from("baby_profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

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

    // Gemini API 호출
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `${SYSTEM_PROMPT}${babyContext}${contextText}

[사용자 질문]
${message}

[답변]`;

    const result = await model.generateContent(prompt);
    const aiResponse = result.response.text();

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

