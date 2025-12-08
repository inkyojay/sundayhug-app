/**
 * ElevenLabs Speech-to-Text API
 * 사용자 음성을 텍스트로 변환
 */
import type { Route } from "./+types/speech-to-text";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVENLABS_API_URL = "https://api.elevenlabs.io/v1";

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

  try {
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;

    if (!audioFile) {
      return data({ error: "오디오 파일이 필요합니다." }, { status: 400 });
    }

    // 파일 크기 제한 (25MB)
    if (audioFile.size > 25 * 1024 * 1024) {
      return data({ error: "파일이 너무 큽니다. (최대 25MB)" }, { status: 400 });
    }

    // ElevenLabs STT API 호출
    const elevenlabsFormData = new FormData();
    elevenlabsFormData.append("audio", audioFile);
    elevenlabsFormData.append("model_id", "scribe_v1"); // ElevenLabs STT 모델

    const response = await fetch(`${ELEVENLABS_API_URL}/speech-to-text`, {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: elevenlabsFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs STT 오류:", response.status, errorText);
      
      if (response.status === 401) {
        return data({ error: "API 키가 유효하지 않습니다." }, { status: 401 });
      }
      if (response.status === 429) {
        return data({ error: "요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요." }, { status: 429 });
      }
      
      return data({ error: "음성 인식에 실패했습니다." }, { status: 500 });
    }

    const result = await response.json();
    
    return data({ 
      success: true, 
      text: result.text || "",
      language_code: result.language_code || "ko",
    });

  } catch (error) {
    console.error("STT 오류:", error);
    return data({ error: "음성 인식 중 오류가 발생했습니다." }, { status: 500 });
  }
}

