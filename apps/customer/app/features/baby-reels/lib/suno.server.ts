/**
 * Suno AI API 클라이언트
 * 
 * 음악 생성 API 연동
 * 문서: https://docs.sunoapi.org/
 */

const SUNO_API_KEY = process.env.SUNO_API_KEY || "";
const SUNO_API_BASE = "https://api.sunoapi.org";
const SUNO_CALLBACK_URL = process.env.SUNO_CALLBACK_URL || "https://app.sundayhug.kr/api/baby-reels/suno-callback";

// 음악 스타일 프리셋 (다양화)
export const MUSIC_PRESETS = {
  lullaby: {
    tags: "soft lullaby, gentle piano, music box, calming, peaceful, 70 bpm, korean",
    title_suffix: "자장가",
  },
  upbeat: {
    tags: "cheerful, acoustic guitar, ukulele, happy, bright, 120 bpm, korean kids song",
    title_suffix: "즐거운 노래",
  },
  emotional: {
    tags: "emotional ballad, piano, strings, heartfelt, warm, 80 bpm, korean",
    title_suffix: "발라드",
  },
  hopeful: {
    tags: "hopeful pop, warm synths, inspiring, uplifting, 100 bpm, korean",
    title_suffix: "희망의 노래",
  },
  dreamy: {
    tags: "dreamy ambient, soft synths, nature sounds, ethereal, relaxing, 65 bpm, korean",
    title_suffix: "꿈의 노래",
  },
  acoustic: {
    tags: "warm acoustic, folk guitar, gentle vocals, cozy, intimate, 90 bpm, korean",
    title_suffix: "어쿠스틱",
  },
};

export interface SunoGenerateRequest {
  prompt: string;
  lyrics: string;
  style: keyof typeof MUSIC_PRESETS;
  title?: string;
}

export interface SunoGenerateResponse {
  success: boolean;
  trackId?: string;
  audioUrl?: string;
  status?: string;
  error?: string;
}

/**
 * Suno API로 음악 생성 요청
 * 문서: https://docs.sunoapi.org/api-reference/music-generation/generate-suno-ai-music
 */
export async function generateMusic(request: SunoGenerateRequest): Promise<SunoGenerateResponse> {
  if (!SUNO_API_KEY) {
    console.error("SUNO_API_KEY가 설정되지 않았습니다.");
    return { success: false, error: "API 키가 설정되지 않았습니다." };
  }

  const preset = MUSIC_PRESETS[request.style] || MUSIC_PRESETS.lullaby;
  
  try {
    // Suno API 공식 문서 기준: https://docs.sunoapi.org/
    // POST /api/v1/generate
    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
      body: JSON.stringify({
        customMode: true, // 가사 직접 입력 모드
        instrumental: false, // 보컬 포함
        model: "V4_5", // V4, V4_5, V4_5PLUS, V4_5ALL 중 선택
        prompt: request.lyrics, // 가사
        style: preset.tags, // 스타일 태그
        title: request.title || `우리 아기 ${preset.title_suffix}`,
        callBackUrl: SUNO_CALLBACK_URL, // 콜백 URL (필수)
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Suno API 오류:", response.status, errorText);
      
      // 503 서비스 점검
      if (response.status === 503) {
        return { success: false, error: "음악 생성 서비스가 점검 중입니다. 잠시 후 다시 시도해주세요." };
      }
      
      // 403/401 에러는 API 키 문제
      if (response.status === 401 || response.status === 403) {
        return { success: false, error: "음악 생성 서비스에 연결할 수 없습니다." };
      }

      // 429 Rate Limit
      if (response.status === 429) {
        return { success: false, error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." };
      }
      
      return { success: false, error: "음악 생성 서비스가 일시적으로 이용 불가합니다." };
    }

    const result = await response.json();
    
    // 응답 형식: { code: 200, msg: "success", data: { taskId: "xxx" } }
    if (result.code === 200 && result.data?.taskId) {
      return {
        success: true,
        trackId: result.data.taskId,
        status: "generating",
      };
    }
    
    // 에러 응답 처리
    if (result.code !== 200) {
      return { success: false, error: result.msg || "음악 생성 요청에 실패했습니다." };
    }

    return { success: true, ...result };
    
  } catch (error) {
    console.error("Suno API 호출 오류:", error);
    return { success: false, error: "음악 생성 요청에 실패했습니다." };
  }
}

/**
 * 음악 생성 상태 확인
 * 문서: https://docs.sunoapi.org/api-reference/music-generation/get-music-generation-detail
 * GET /api/v1/generate/record-info?taskId=xxx
 */
export async function checkMusicStatus(taskId: string): Promise<SunoGenerateResponse> {
  if (!SUNO_API_KEY) {
    return { success: false, error: "API 키가 설정되지 않았습니다." };
  }

  try {
    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate/record-info?taskId=${taskId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: `상태 확인 실패: ${response.status}` };
    }

    const result = await response.json();
    
    // 응답 형식: { code: 200, msg: "success", data: { response: { sunoData: [...] }, status: "..." } }
    if (result.code === 200 && result.data?.response?.sunoData) {
      const sunoData = result.data.response.sunoData;
      const status = result.data.status; // PENDING, TEXT_SUCCESS, SUCCESS, COMPLETED
      
      // sunoData 배열에서 오디오 URL 찾기 (audioUrl 또는 streamAudioUrl)
      const trackWithAudio = sunoData.find((track: any) => 
        track.audioUrl || track.audio_url || track.streamAudioUrl
      );
      
      if (trackWithAudio) {
        const audioUrl = trackWithAudio.audioUrl || trackWithAudio.audio_url || trackWithAudio.streamAudioUrl;
        const isCompleted = status === "SUCCESS" || status === "COMPLETED" || (audioUrl && audioUrl.length > 0);
        
        return {
          success: true,
          audioUrl: audioUrl,
          status: isCompleted ? "completed" : "generating",
        };
      }
      
      // 아직 생성 중
      return {
        success: true,
        trackId: taskId,
        status: "generating",
      };
    }
    
    // 에러 응답 처리
    if (result.code !== 200) {
      return { success: false, error: result.msg || "상태 확인에 실패했습니다." };
    }
    
    return {
      success: true,
      trackId: taskId,
      status: "generating",
    };
    
  } catch (error) {
    console.error("상태 확인 오류:", error);
    return { success: false, error: "상태 확인에 실패했습니다." };
  }
}

/**
 * 크레딧 잔액 확인
 * 문서: https://docs.sunoapi.org/api-reference/credits/get-remaining-credits
 * GET /api/v1/generate/remaining-credits
 */
export async function getRemainingCredits(): Promise<{ success: boolean; credits?: number; error?: string }> {
  if (!SUNO_API_KEY) {
    return { success: false, error: "API 키가 설정되지 않았습니다." };
  }

  try {
    const response = await fetch(`${SUNO_API_BASE}/api/v1/generate/remaining-credits`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${SUNO_API_KEY}`,
      },
    });

    if (!response.ok) {
      return { success: false, error: "크레딧 확인 실패" };
    }

    const result = await response.json();
    
    if (result.code === 200) {
      return { success: true, credits: result.data?.credits || result.data?.remainingCredits };
    }
    
    return { success: true, credits: result.credits || result.data?.credits };
    
  } catch (error) {
    console.error("크레딧 확인 오류:", error);
    return { success: false, error: "크레딧 확인에 실패했습니다." };
  }
}

