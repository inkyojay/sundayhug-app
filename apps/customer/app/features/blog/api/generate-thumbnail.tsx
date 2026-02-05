/**
 * 블로그 썸네일 AI 생성 API
 * Google Vertex AI Imagen 3.0 연동
 */
import type { Route } from "./+types/generate-thumbnail";

import { data } from "react-router";
import adminClient from "~/core/lib/supa-admin-client.server";

// Vertex AI 설정
const PROJECT_ID = "app-sundayhug";
const LOCATION = "us-central1";
const MODEL_ID = "imagen-3.0-generate-001";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const postId = formData.get("postId") as string;
  const title = formData.get("title") as string;
  const content = formData.get("content") as string;

  if (!title) {
    return data({ success: false, error: "제목이 필요합니다." }, { status: 400 });
  }

  // Google Cloud API 키 확인
  const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
  if (!apiKey) {
    return data({ 
      success: false, 
      error: "GOOGLE_CLOUD_API_KEY 환경변수가 설정되지 않았습니다." 
    }, { status: 500 });
  }

  try {
    // 본문 요약 (최대 200자)
    const contentSummary = content 
      ? content.replace(/[#*`\-\[\]]/g, "").slice(0, 200) 
      : "";

    // Imagen 3.0용 프롬프트
    const imagePrompt = `A professional photograph for a Korean parenting blog.

Article title: ${title}
${contentSummary ? `Topic: ${contentSummary}` : ""}

Style requirements:
- Photorealistic, high-quality photograph
- Soft natural lighting with warm golden tones
- Peaceful sleeping newborn baby or cozy nursery scene
- Pastel color palette: soft pink, cream, light blue, warm beige
- NO text, NO words, NO letters, NO watermarks
- Magazine-quality family photography
- Korean modern home interior style
- Safe, warm, comforting atmosphere`;

    // Vertex AI REST API 호출 (API Key 방식)
    const endpoint = `https://${LOCATION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${LOCATION}/publishers/google/models/${MODEL_ID}:predict?key=${apiKey}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instances: [
          {
            prompt: imagePrompt,
          }
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "16:9",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Thumbnail] Vertex AI 오류:", errorText);
      
      // API 키 인증 실패시 안내
      if (response.status === 401 || response.status === 403) {
        return data({ 
          success: false, 
          error: "API 키 인증 실패. 서비스 계정 키가 필요할 수 있습니다. Google Cloud Console에서 서비스 계정을 생성하고 JSON 키를 발급받으세요." 
        }, { status: 500 });
      }
      
      return data({ 
        success: false, 
        error: `Vertex AI 오류 (${response.status}): ${errorText}` 
      }, { status: 500 });
    }

    const result = await response.json();

    // 이미지 데이터 추출
    let imageBase64: string | null = null;

    if (result.predictions && result.predictions[0]) {
      const prediction = result.predictions[0];
      if (prediction.bytesBase64Encoded) {
        imageBase64 = prediction.bytesBase64Encoded;
      }
    }

    if (!imageBase64) {
      console.error("[Thumbnail] 이미지 데이터 없음:", JSON.stringify(result, null, 2));
      return data({ 
        success: false, 
        error: "이미지 생성 실패: 응답에 이미지 데이터가 없습니다." 
      }, { status: 500 });
    }

    // Supabase Storage에 업로드
    const fileName = `${postId || Date.now()}-${Date.now()}.png`;
    const imageBuffer = Buffer.from(imageBase64, "base64");

    const { data: uploadData, error: uploadError } = await adminClient.storage
      .from("blog-thumbnails")
      .upload(fileName, imageBuffer, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("[Thumbnail] Storage 업로드 오류:", uploadError);
      return data({ 
        success: false, 
        error: `이미지 업로드 실패: ${uploadError.message}` 
      }, { status: 500 });
    }

    // 공개 URL 생성
    const { data: urlData } = adminClient.storage
      .from("blog-thumbnails")
      .getPublicUrl(fileName);

    const thumbnailUrl = urlData.publicUrl;

    // 포스트에 썸네일 URL 저장
    if (postId && postId !== "new") {
      await adminClient
        .from("blog_posts")
        .update({ thumbnail_url: thumbnailUrl })
        .eq("id", postId);
    }

    return data({
      success: true, 
      thumbnailUrl,
      message: "썸네일이 생성되었습니다!" 
    });

  } catch (error) {
    console.error("[Thumbnail] 오류:", error);
    return data({ 
      success: false, 
      error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다." 
    }, { status: 500 });
  }
}
