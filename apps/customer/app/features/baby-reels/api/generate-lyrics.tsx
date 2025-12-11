/**
 * 베이비릴스 - AI 가사 생성 API
 * 
 * 수면 분석 결과를 바탕으로 감성적인 가사 생성
 */
import type { Route } from "./+types/generate-lyrics";

import { data } from "react-router";
import { GoogleGenAI } from "@google/genai";
import makeServerClient from "~/core/lib/supa-client.server";

// Gemini 초기화
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

// 가사 생성 프롬프트
const LYRICS_PROMPT = `당신은 감성적인 육아 노래 가사 작사가입니다.

아래 수면 분석 결과를 바탕으로, 부모의 사랑과 아이에 대한 마음을 담은 노래 가사를 작성해주세요.

[수면 분석 결과]
{feedback}

[아이 이름]
{babyName}

[요구사항]
1. 총 길이: 약 1분 30초 분량 (4개 절)
2. 구성:
   - Verse 1 (20초): 아이에 대한 사랑, 보호 본능
   - Chorus (25초): 핵심 메시지, 후렴구
   - Verse 2 (20초): 수면 분석 내용을 자연스럽게 녹여낸 내용
   - Chorus (25초): 후렴구 반복

3. 스타일:
   - 따뜻하고 포근한 느낌
   - 부모가 아이에게 부르는 노래 형식
   - 간결하고 기억에 남는 가사
   - 각 줄은 짧게 (한 줄에 10자 이내 권장)

4. 주의사항:
   - 너무 교훈적이거나 딱딱하지 않게
   - 아이 이름을 자연스럽게 포함
   - 수면 환경 개선 내용은 은유적으로 표현

[출력 형식]
JSON 형식으로 응답해주세요:
{
  "title": "노래 제목",
  "lyrics": "전체 가사 (줄바꿈 포함)"
}`;

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ success: false, error: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { analysisId, babyName, feedback } = body;

    if (!analysisId) {
      return data({ success: false, error: "분석 ID가 필요합니다." }, { status: 400 });
    }

    // feedback이 없으면 기본 텍스트 사용
    const feedbackContent = feedback || "아기의 안전하고 편안한 수면 환경을 위한 노래";

    // 피드백 내용 정리
    let feedbackText = "";
    if (Array.isArray(feedbackContent)) {
      feedbackText = feedbackContent.map((item: any) => {
        if (typeof item === "string") return item;
        return `${item.title || item.category}: ${item.description || item.message}`;
      }).join("\n");
    } else if (typeof feedbackContent === "object") {
      feedbackText = JSON.stringify(feedbackContent, null, 2);
    } else {
      feedbackText = String(feedbackContent);
    }

    // 프롬프트 생성
    const prompt = LYRICS_PROMPT
      .replace("{feedback}", feedbackText)
      .replace("{babyName}", babyName || "우리 아기");

    // Gemini API 호출
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: prompt,
    });

    const responseText = response.text ?? "";
    
    // JSON 파싱 시도
    let title = "우리 아기를 위한 노래";
    let lyrics = "";

    try {
      // JSON 블록 추출
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        title = parsed.title || title;
        lyrics = parsed.lyrics || responseText;
      } else {
        lyrics = responseText;
      }
    } catch {
      // JSON 파싱 실패 시 전체 텍스트 사용
      lyrics = responseText;
    }

    // 프로젝트 생성/업데이트
    const { data: project, error: projectError } = await supabase
      .from("baby_reels_projects")
      .upsert({
        user_id: user.id,
        sleep_analysis_id: analysisId,
        title: title,
        status: "lyrics_ready",
        lyrics_data: { title, lyrics },
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "sleep_analysis_id",
      })
      .select()
      .single();

    return data({
      success: true,
      title,
      lyrics,
      projectId: project?.id,
    });

  } catch (error) {
    console.error("가사 생성 오류:", error);
    
    // 폴백 가사
    const fallbackTitle = "오늘 밤도 안전하게";
    const fallbackLyrics = `[Verse 1]
우리 아기 잠든 밤
별빛이 비추는 곳에
엄마 아빠 사랑 담아
너를 지켜줄 거야

[Chorus]
너의 꿈을 지켜줄게
오늘 밤도 안전하게
작은 숨소리 들으며
함께 꿈나라로 가요

[Verse 2]
포근한 이 공간에서
달콤한 꿈을 꾸렴
세상 모든 걱정 말고
편히 쉬어도 돼

[Chorus]
너의 꿈을 지켜줄게
오늘 밤도 안전하게
사랑해 우리 아가
좋은 꿈 꿔 잘 자`;

    return data({
      success: true,
      title: fallbackTitle,
      lyrics: fallbackLyrics,
      fallback: true,
    });
  }
}

export async function loader() {
  return data({ message: "POST /api/baby-reels/generate-lyrics" });
}

