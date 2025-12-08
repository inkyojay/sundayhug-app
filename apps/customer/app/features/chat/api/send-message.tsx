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

// 시스템 프롬프트 - 간결하고 핵심적인 답변
const SYSTEM_PROMPT = `당신은 썬데이허그 AI 육아 상담사입니다. 선배 엄마처럼 따뜻하지만 간결하게 답변해주세요.

[핵심 원칙]
1. 짧고 명확하게: 3~4문장으로 핵심만 전달
2. 대화체 사용: "~해요", "~예요" 형태로 친근하게
3. 실용적 조언: 바로 실천할 수 있는 구체적 팁 제공
4. 공감 표현: 부모의 어려움에 먼저 공감

[형식 규칙]
- 마크다운 금지 (###, **, - 등 사용하지 마세요)
- 번호 목록 금지 (1. 2. 3. 대신 자연스러운 문장으로)
- 이모지는 마지막에 1개만

[이미지 분석 시]
- 사진 속 상황을 먼저 간단히 설명
- 육아와 관련된 조언을 자연스럽게 연결
- 아기의 표정, 환경, 상황 등을 관찰하여 답변

[금지사항]
- 의료적 진단 금지 (증상 심하면 병원 권유)
- 불확실한 정보 금지
- 장황한 설명 금지

예시: "밤에 자주 깨서 힘드시죠? 이 시기 아기들은 원래 그래요. 낮잠을 오후 4시 전에 끝내고, 저녁 루틴을 만들어보세요. 목욕 후 수유하고 재우면 도움이 돼요 😊"
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
      console.log(`✅ 벡터 검색 성공: ${vectorMatches.length}개 결과 (유사도: ${vectorMatches[0]?.similarity?.toFixed(3)})`);
      
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
  console.log("⚠️ 폴백: 키워드 기반 검색");
  
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
  const imageFile = formData.get("image") as File | null;

  // 이미지가 있으면 메시지 없어도 OK
  if (!message?.trim() && !imageFile) {
    return data({ error: "메시지를 입력해주세요." }, { status: 400 });
  }

  // 이미지를 Base64로 변환
  let imageBase64: string | null = null;
  let imageMimeType: string | null = null;
  if (imageFile && imageFile.size > 0) {
    const arrayBuffer = await imageFile.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString('base64');
    imageMimeType = imageFile.type || 'image/jpeg';
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

    // 이전 대화 내용 조회 (최근 10개 메시지 - 대화 맥락 유지용)
    const { data: previousMessages } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", currentSessionId)
      .order("created_at", { ascending: true })
      .limit(10);

    // 이미지 업로드 (있는 경우)
    let imageUrl: string | null = null;
    if (imageBase64 && imageMimeType) {
      const fileName = `chat/${user.id}/${Date.now()}.${imageMimeType.split('/')[1] || 'jpg'}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, Buffer.from(imageBase64, 'base64'), {
          contentType: imageMimeType,
          upsert: false,
        });
      
      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage.from('chat-images').getPublicUrl(fileName);
        imageUrl = urlData?.publicUrl || null;
      }
    }

    // 사용자 메시지 저장
    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: currentSessionId,
        role: "user",
        content: message || "[이미지]",
        image_url: imageUrl,
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

    // 이전 대화 히스토리 구성 (대화 맥락 유지)
    let conversationHistory = "";
    if (previousMessages && previousMessages.length > 0) {
      conversationHistory = "\n\n[이전 대화 내용]\n";
      previousMessages.forEach((msg: { role: string; content: string }) => {
        const roleName = msg.role === "user" ? "부모님" : "상담사";
        conversationHistory += `${roleName}: ${msg.content}\n\n`;
      });
      conversationHistory += "---\n위 대화 맥락을 참고해서 자연스럽게 이어서 답변해주세요.\n";
    }

    // Gemini API 호출 (이미지 지원)
    const textPrompt = `${SYSTEM_PROMPT}${babyContext}${conversationHistory}${contextText}

[현재 질문]
${message || "이 사진에 대해 육아 관점에서 조언해주세요."}

[답변]`;

    let aiResponse = "";
    
    if (imageBase64 && imageMimeType) {
      // 이미지가 있는 경우 Vision 모델 사용
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
      // 텍스트만 있는 경우
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

