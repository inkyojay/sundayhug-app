/**
 * 블로그 글 TTS 오디오 생성 API
 * Google Cloud Text-to-Speech 사용
 */
import type { Route } from "./+types/generate-audio";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import adminClient from "~/core/lib/supa-admin-client.server";

// Markdown을 Plain Text로 변환
function stripMarkdown(markdown: string): string {
  return markdown
    // 헤더 제거
    .replace(/^#{1,6}\s+/gm, "")
    // Bold/Italic 제거
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    // 링크 텍스트만 남기기
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // 이미지 제거
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
    // 코드 블록 제거
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`([^`]+)`/g, "$1")
    // 리스트 마커 제거
    .replace(/^[\s]*[-*+]\s+/gm, "")
    .replace(/^[\s]*\d+\.\s+/gm, "")
    // 인용 제거
    .replace(/^>\s+/gm, "")
    // 수평선 제거
    .replace(/^[-*_]{3,}$/gm, "")
    // 빈 줄 정리
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// 사용할 목소리 옵션들
const VOICE_OPTIONS = [
  { name: "ko-KR-Neural2-A", label: "여성 (Neural2)" },  // 가장 자연스러운 여성
  { name: "ko-KR-Wavenet-B", label: "남성 (Wavenet)" },  // 차분한 남성
];

// 랜덤 목소리 선택
function getRandomVoice() {
  const randomIndex = Math.floor(Math.random() * VOICE_OPTIONS.length);
  return VOICE_OPTIONS[randomIndex];
}

// Google Cloud TTS API 호출
async function synthesizeSpeech(text: string, apiKey: string): Promise<{ audio: ArrayBuffer; voice: string }> {
  const selectedVoice = getRandomVoice();
  
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "ko-KR",
          name: selectedVoice.name,
        },
        audioConfig: {
          audioEncoding: "MP3",
          speakingRate: 0.95, // 약간 천천히 (0.25~4.0)
          pitch: 0, // 기본 피치 (-20~20)
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Google TTS API 오류: ${JSON.stringify(error)}`);
  }

  const result = await response.json();
  
  // Base64 → ArrayBuffer
  const binaryString = atob(result.audioContent);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  return { audio: bytes.buffer, voice: selectedVoice.label };
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  
  const formData = await request.formData();
  const postId = formData.get("postId") as string;

  if (!postId) {
    return data({ success: false, error: "postId가 필요합니다." }, { status: 400 });
  }

  // Google TTS API 키 확인
  const googleTtsApiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!googleTtsApiKey) {
    return data({ 
      success: false, 
      error: "GOOGLE_TTS_API_KEY 환경변수가 설정되지 않았습니다." 
    }, { status: 500 });
  }

  try {
    // 1. 블로그 글 조회
    const { data: post, error: postError } = await supabase
      .from("blog_posts")
      .select("id, title, content")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      return data({ success: false, error: "글을 찾을 수 없습니다." }, { status: 404 });
    }

    if (!post.content) {
      return data({ success: false, error: "본문이 없습니다." }, { status: 400 });
    }

    // 2. Markdown → Plain Text
    const plainText = stripMarkdown(post.content);
    
    // 3. 텍스트 길이 확인 (Google TTS는 최대 5000바이트)
    const textBytes = new TextEncoder().encode(plainText).length;
    if (textBytes > 5000) {
      // 긴 텍스트는 청크로 나눠서 처리해야 함 (추후 구현)
      return data({ 
        success: false, 
        error: `텍스트가 너무 깁니다 (${textBytes}바이트). 5000바이트 이하로 줄여주세요.` 
      }, { status: 400 });
    }

    // 4. Google TTS API 호출
    const { audio: audioBuffer, voice: selectedVoice } = await synthesizeSpeech(plainText, googleTtsApiKey);

    // 5. Supabase Storage에 업로드
    const fileName = `${postId}.mp3`;
    const { error: uploadError } = await adminClient.storage
      .from("blog-audio")
      .upload(fileName, audioBuffer, {
        contentType: "audio/mpeg",
        upsert: true, // 기존 파일 덮어쓰기
      });

    if (uploadError) {
      console.error("[TTS] Storage 업로드 오류:", uploadError);
      return data({ 
        success: false, 
        error: `파일 업로드 실패: ${uploadError.message}` 
      }, { status: 500 });
    }

    // 6. Public URL 가져오기
    const { data: urlData } = adminClient.storage
      .from("blog-audio")
      .getPublicUrl(fileName);

    // 7. DB 업데이트
    const { error: updateError } = await adminClient
      .from("blog_posts")
      .update({
        audio_url: urlData.publicUrl,
        audio_generated_at: new Date().toISOString(),
      })
      .eq("id", postId);

    if (updateError) {
      console.error("[TTS] DB 업데이트 오류:", updateError);
      return data({ 
        success: false, 
        error: `DB 업데이트 실패: ${updateError.message}` 
      }, { status: 500 });
    }

    return data({
      success: true, 
      audioUrl: urlData.publicUrl 
    });

  } catch (error) {
    console.error("[TTS] 오류:", error);
    return data({ 
      success: false, 
      error: error instanceof Error ? error.message : "알 수 없는 오류" 
    }, { status: 500 });
  }
}

