/**
 * 블로그 슬러그 생성 API
 * 
 * 한글 제목을 영어 슬러그로 변환
 * - Gemini API가 있으면 AI 번역
 * - 없으면 규칙 기반 변환
 */
import type { Route } from "./+types/generate-slug";

import { data } from "react-router";
import { GoogleGenAI } from "@google/genai";
import adminClient from "~/core/lib/supa-admin-client.server";

// Gemini 초기화 (AI 번역용)
const genAI = process.env.GEMINI_API_KEY
  ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
  : null;

// 한글 → 영어 슬러그 변환 (규칙 기반 fallback)
function koreanToEnglishSlug(text: string): string {
  // 일반적인 한글 단어 → 영어 매핑
  const mappings: Record<string, string> = {
    "아기": "baby",
    "육아": "parenting",
    "수면": "sleep",
    "백색소음": "white-noise",
    "속싸개": "swaddle",
    "슬리핑백": "sleeping-bag",
    "보증서": "warranty",
    "가이드": "guide",
    "팁": "tips",
    "방법": "how-to",
    "추천": "recommend",
    "리뷰": "review",
    "활용": "usage",
    "제품": "product",
    "신생아": "newborn",
    "모로반사": "moro-reflex",
    "수면교육": "sleep-training",
    "밤잠": "night-sleep",
    "낮잠": "nap",
    "환경": "environment",
    "꿀팁": "tips",
    "필수": "essential",
    "아이템": "items",
    "준비": "preparation",
  };

  let slug = text.toLowerCase();
  
  // 매핑된 단어 치환
  for (const [korean, english] of Object.entries(mappings)) {
    slug = slug.replace(new RegExp(korean, "g"), english);
  }
  
  // 한글이 남아있으면 제거하고 영어/숫자만 유지
  slug = slug
    .replace(/[가-힣]+/g, "") // 남은 한글 제거
    .replace(/[^a-z0-9\s-]/g, "") // 영어, 숫자, 공백, 하이픈만 유지
    .replace(/\s+/g, "-") // 공백 → 하이픈
    .replace(/-+/g, "-") // 연속 하이픈 정리
    .replace(/^-|-$/g, "") // 앞뒤 하이픈 제거
    .slice(0, 50);

  // 슬러그가 비어있으면 기본값
  return slug || `post-${Date.now()}`;
}

// AI를 사용한 영어 슬러그 생성
async function generateEnglishSlugWithAI(title: string, content?: string): Promise<string> {
  if (!genAI) {
    return koreanToEnglishSlug(title);
  }

  try {
    const prompt = `다음 한국어 블로그 제목을 SEO에 최적화된 영어 URL 슬러그로 변환해주세요.

규칙:
- 소문자 영어만 사용
- 단어 사이는 하이픈(-)으로 연결
- 최대 50자
- 의미를 잘 전달하면서 간결하게
- 불용어(a, the, is, are 등)는 제외
- 숫자는 유지 가능

제목: "${title}"
${content ? `본문 일부: "${content.slice(0, 200)}..."` : ""}

슬러그만 출력하세요 (다른 설명 없이):`;

    const response = await genAI.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    let slug = (response.text ?? "").trim().toLowerCase();
    
    // 정리
    slug = slug
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 50);

    return slug || koreanToEnglishSlug(title);
  } catch (error) {
    console.error("AI 슬러그 생성 오류:", error);
    return koreanToEnglishSlug(title);
  }
}

export async function action({ request }: Route.ActionArgs) {
  // 대시보드 내부 API이므로 별도 인증 불필요 (페이지 레벨에서 이미 인증됨)

  const formData = await request.formData();
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;
  const postId = formData.get("postId") as string;

  if (!title) {
    return data({ success: false, error: "제목은 필수입니다." }, { status: 400 });
  }

  try {
    // AI 또는 규칙 기반으로 영어 슬러그 생성
    let baseSlug = await generateEnglishSlugWithAI(title, content);

    // 기존 슬러그 목록 조회 (중복 체크)
    const { data: existingSlugs } = await adminClient
      .from("blog_posts")
      .select("slug")
      .neq("id", postId || "");

    const slugList = existingSlugs?.map((s: { slug: string }) => s.slug) || [];

    // 고유 슬러그 생성
    let slug = baseSlug;
    let counter = 1;
    while (slugList.includes(slug)) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return data({ success: true, slug });
  } catch (error) {
    console.error("슬러그 생성 오류:", error);
    return data({ 
      success: false, 
      error: `슬러그 생성 실패: ${error instanceof Error ? error.message : "알 수 없는 오류"}` 
    }, { status: 500 });
  }
}

