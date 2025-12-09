/**
 * 베이비릴스 - 음악 생성 API
 * 
 * Suno AI로 가사 기반 음악 생성
 */
import type { Route } from "./+types/generate-music";

import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import { generateMusic, checkMusicStatus, MUSIC_PRESETS } from "../lib/suno.server";

// 폴링 헬퍼 함수
async function waitForMusic(taskId: string, maxAttempts = 12, delayMs = 5000): Promise<{ audioUrl?: string; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    
    const status = await checkMusicStatus(taskId);
    console.log(`폴링 ${i + 1}/${maxAttempts}:`, status);
    
    if (status.audioUrl) {
      return { audioUrl: status.audioUrl };
    }
    
    if (!status.success) {
      return { error: status.error };
    }
  }
  
  return { error: "음악 생성 시간이 초과되었습니다. 잠시 후 다시 시도해주세요." };
}

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
    const { projectId, title, lyrics, style } = body;

    if (!lyrics || !style) {
      return data({ success: false, error: "가사와 음악 스타일이 필요합니다." }, { status: 400 });
    }

    // 유효한 스타일인지 확인
    if (!MUSIC_PRESETS[style as keyof typeof MUSIC_PRESETS]) {
      return data({ success: false, error: "유효하지 않은 음악 스타일입니다." }, { status: 400 });
    }

    // 프로젝트 상태 업데이트
    if (projectId) {
      await supabase
        .from("baby_reels_projects")
        .update({ 
          status: "generating_music",
          music_style: style,
          updated_at: new Date().toISOString(),
        })
        .eq("id", projectId)
        .eq("user_id", user.id);
    }

    // Suno API로 음악 생성 요청
    console.log("🎵 음악 생성 요청:", { title, style });
    const result = await generateMusic({
      prompt: title || "우리 아기를 위한 노래",
      lyrics,
      style: style as keyof typeof MUSIC_PRESETS,
      title,
    });

    console.log("🎵 음악 생성 결과:", result);

    if (!result.success) {
      // 프로젝트 상태 실패로 업데이트
      if (projectId) {
        await supabase
          .from("baby_reels_projects")
          .update({ 
            status: "music_failed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
      }

      return data({ 
        success: false, 
        error: result.error || "음악 생성에 실패했습니다.",
      });
    }

    // 바로 audioUrl이 있으면 반환
    if (result.audioUrl) {
      if (projectId) {
        await supabase
          .from("baby_reels_projects")
          .update({ 
            status: "music_ready",
            music_url: result.audioUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", projectId);
      }

      return data({
        success: true,
        audioUrl: result.audioUrl,
        status: "completed",
      });
    }

    // taskId가 있으면 폴링으로 결과 대기 (최대 60초)
    if (result.trackId) {
      console.log("🎵 폴링 시작:", result.trackId);
      const pollResult = await waitForMusic(result.trackId, 12, 5000);
      
      if (pollResult.audioUrl) {
        if (projectId) {
          await supabase
            .from("baby_reels_projects")
            .update({ 
              status: "music_ready",
              music_url: pollResult.audioUrl,
              updated_at: new Date().toISOString(),
            })
            .eq("id", projectId);
        }

        return data({
          success: true,
          audioUrl: pollResult.audioUrl,
          status: "completed",
        });
      }

      // 폴링 실패 시
      return data({
        success: false,
        error: pollResult.error || "음악 생성에 실패했습니다.",
        trackId: result.trackId, // 클라이언트에서 다시 시도할 수 있도록
      });
    }

    return data({
      success: false,
      error: "예상치 못한 오류가 발생했습니다.",
    });

  } catch (error) {
    console.error("음악 생성 오류:", error);
    return data({ 
      success: false, 
      error: "서버 오류가 발생했습니다.",
    }, { status: 500 });
  }
}

export async function loader() {
  return data({ message: "POST /api/baby-reels/generate-music" });
}

