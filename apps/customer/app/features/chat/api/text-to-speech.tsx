/**
 * ElevenLabs Text-to-Speech API
 * AI 응답을 음성으로 변환
 */
import type { Route } from "./+types/text-to-speech";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

// 한국어 전문 여성 음성 (Voice Library)
// Hanna - Natural and Clear, 290만+ 사용, 자연스럽고 따뜻한 한국어 음성
const DEFAULT_VOICE_ID = "zgDzx5jLLCqEp6Fl7Kl7"; // Hanna (Korean)

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return data({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!ELEVENLABS_API_KEY) {
    console.error("ELEVENLABS_API_KEY가 설정되지 않았습니다.");
    return data({ error: "음성 서비스를 사용할 수 없습니다." }, { status: 500 });
  }

  const formData = await request.formData();
  const text = formData.get("text") as string;
  const voiceId = (formData.get("voiceId") as string) || DEFAULT_VOICE_ID;

  if (!text?.trim()) {
    return data({ error: "텍스트를 입력해주세요." }, { status: 400 });
  }

  // 텍스트 길이 제한 (비용 관리)
  if (text.length > 5000) {
    return data({ error: "텍스트가 너무 깁니다. (최대 5000자)" }, { status: 400 });
  }

  try {
    const response = await fetch(`${ELEVENLABS_API_URL}/text-to-speech/${voiceId}`, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2", // 한국어 포함 다국어 모델
        voice_settings: {
          stability: 0.7,        // 음성 안정성 높임 (더 일관된 톤)
          similarity_boost: 0.8, // 원본 음성 유사도 높임
          style: 0.2,            // 약간의 표현력 추가
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API 오류:", response.status, errorText);
      
      if (response.status === 401) {
        return data({ error: "API 키가 유효하지 않습니다." }, { status: 401 });
      }
      if (response.status === 429) {
        return data({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
      }
      
      return data({ error: "음성 생성에 실패했습니다." }, { status: 500 });
    }

    // 오디오 데이터를 Base64로 변환
    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString("base64");
    const audioUrl = `data:audio/mpeg;base64,${base64Audio}`;

    return data({ 
      success: true, 
      audioUrl,
      duration: Math.ceil(text.length / 15), // 대략적인 재생 시간 (초)
    });

  } catch (error) {
    console.error("TTS 오류:", error);
    return data({ error: "음성 변환 중 오류가 발생했습니다." }, { status: 500 });
  }
}

