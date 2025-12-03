/**
 * Share Card API Route
 * 
 * GET /api/sleep/:id/share-card - 공유 카드 이미지 반환
 */
import type { Route } from "./+types/share-card.route";
import { data } from "react-router";
import makeServerClient from "~/core/lib/supa-client.server";
import { generateShareCardSVG, createShareCardData } from "./share-card.server";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { id } = params;
  
  if (!id) {
    return new Response("Analysis ID is required", { status: 400 });
  }

  const [supabase] = makeServerClient(request);
  
  // 분석 데이터 조회
  const { data: analysis, error } = await supabase
    .from("sleep_analyses")
    .select("id, summary, created_at")
    .eq("id", id)
    .single();

  if (error || !analysis) {
    return new Response("Analysis not found", { status: 404 });
  }

  // 피드백 항목 조회
  const { data: feedbackItems } = await supabase
    .from("sleep_analysis_feedback_items")
    .select("risk_level")
    .eq("analysis_id", id);

  // summary에서 점수 정보 추출 시도 (JSON 파싱)
  let safetyScore = 70;
  let scoreComment = "수면 환경을 분석했어요";
  
  try {
    const parsed = JSON.parse(analysis.summary);
    safetyScore = parsed.safetyScore || 70;
    scoreComment = parsed.scoreComment || scoreComment;
  } catch {
    // JSON이 아니면 기본값 사용
  }

  // 공유 카드 데이터 생성
  const cardData = createShareCardData({
    id: analysis.id,
    safetyScore,
    scoreComment,
    feedbackItems: feedbackItems?.map(item => ({ riskLevel: item.risk_level })) || [],
    created_at: analysis.created_at,
  });

  // SVG 생성
  const svg = generateShareCardSVG(cardData);

  // format 파라미터 확인
  const url = new URL(request.url);
  const format = url.searchParams.get("format");

  if (format === "png") {
    // PNG 변환 (sharp 사용)
    try {
      const sharp = (await import("sharp")).default;
      const pngBuffer = await sharp(Buffer.from(svg))
        .png()
        .toBuffer();

      return new Response(pngBuffer, {
        headers: {
          "Content-Type": "image/png",
          "Cache-Control": "public, max-age=3600",
        },
      });
    } catch (e) {
      console.error("PNG conversion failed:", e);
      // PNG 변환 실패시 SVG 반환
    }
  }

  // SVG 반환
  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=3600",
    },
  });
}


