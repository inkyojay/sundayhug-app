/**
 * Sleep Analysis API - Placid Card News Endpoint
 *
 * POST /api/sleep/:id/cardnews
 * Generates Instagram card news (6 slides) using Placid API
 */
import type { Route } from "./+types/cardnews";

import { data } from "react-router";

import type { AnalysisReport, CardNewsText } from "../schema";

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const { id } = params;

  if (!id) {
    return data({ success: false, error: "Analysis ID is required" }, { status: 400 });
  }

  // Dynamic imports for server-only modules
  const { default: adminClient } = await import("~/core/lib/supa-admin-client.server");
  const { getSleepAnalysis } = await import("../lib/sleep-analysis.server");
  const { uploadImageToStorage } = await import("../lib/storage.server");
  const { generateAllCardNewsSlides, formatDateForCardNews } = await import("../lib/placid.server");
  const { generateBadCardImages, generateGoodCardImages, generatePinOverlayImage } = await import("../lib/card-image.server");

  type CardNewsData = Awaited<ReturnType<typeof import("../lib/placid.server")>>["CardNewsData"];
  type BadCardData = Awaited<ReturnType<typeof import("../lib/card-image.server")>>["BadCardData"];
  type GoodCardData = Awaited<ReturnType<typeof import("../lib/card-image.server")>>["GoodCardData"];

  try {
    console.log(`[CardNews] Starting generation for analysis ${id}...`);
    
    // 1. 분석 결과 가져오기
    const result = await getSleepAnalysis(id);

    if (!result) {
      return data({ success: false, error: "Analysis not found" }, { status: 404 });
    }

    const report = result.report as AnalysisReport | null;
    
    if (!report) {
      return data({ success: false, error: "Analysis report not found" }, { status: 404 });
    }

    // 2. 카드뉴스용 텍스트 확인 (cardNews 필드)
    const cardNewsText = report.cardNews;
    
    if (!cardNewsText) {
      return data({ 
        success: false, 
        error: "Card news text not generated. Please re-analyze with the updated AI." 
      }, { status: 400 });
    }

    // 3. 이미지 준비
    let imageUrl = result.image_url;
    let imageBase64 = result.image_base64;

    // base64만 있으면 Storage에 업로드
    if (!imageUrl && imageBase64) {
      console.log("[CardNews] Uploading image to storage...");
      const uploadResult = await uploadImageToStorage(
        adminClient,
        Buffer.from(imageBase64, "base64"),
        id,
        "original.jpg"
      );
      imageUrl = uploadResult;
    }

    if (!imageUrl) {
      return data({ success: false, error: "No image available" }, { status: 400 });
    }

    // 4. 아기 이름 가져오기 (body에서 또는 기본값)
    let babyName = "우리 아기";
    try {
      const body = await request.json();
      if (body.babyName) {
        babyName = body.babyName;
      }
    } catch {
      // body가 없어도 OK
    }

    // 5. Bad/Good 카드 이미지 생성
    console.log("[CardNews] Generating feedback card images...");
    
    const badCards: BadCardData[] = cardNewsText.badItems.slice(0, 3).map((item, i) => ({
      number: i + 1,
      title: item.title,
      content: item.content,
      badge: item.badge,
    }));
    
    const goodCards: GoodCardData[] = cardNewsText.goodItems.slice(0, 3).map((item, i) => ({
      number: i + 1,
      title: item.title,
      content: item.content,
    }));

    const [badCardUrls, goodCardUrls] = await Promise.all([
      generateBadCardImages(badCards),
      generateGoodCardImages(goodCards),
    ]);

    console.log(`[CardNews] Generated ${badCardUrls.length} bad cards, ${goodCardUrls.length} good cards`);

    // 6. 핀 오버레이 이미지 생성
    console.log("[CardNews] Generating pin overlay image...");
    const pinData = report.feedbackItems.map(item => ({
      id: item.id,
      x: item.x,
      y: item.y,
      riskLevel: item.riskLevel,
    }));
    
    const imagePinUrl = await generatePinOverlayImage(imageUrl, pinData);
    console.log("[CardNews] Pin overlay image generated");

    // 7. 추천 제품 가져오기
    console.log("[CardNews] Fetching recommended products...");
    const { data: products } = await adminClient
      .from("sleep_recommended_products")
      .select("short_name, image_url")
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .limit(3);

    const productData = (products || []).map(p => ({
      name: p.short_name || "",
      imageUrl: p.image_url || "",
    }));

    // 8. Placid로 카드뉴스 생성
    console.log("[CardNews] Generating Placid card news...");
    
    const cardNewsData: CardNewsData = {
      // 1번: 썸네일
      name: babyName,
      photo1: imageUrl,
      goal: cardNewsText.goal,
      
      // 2번: 엄마의 현실일기
      date: formatDateForCardNews(),
      text122: cardNewsText.momsDiary,
      
      // 3번: 이미지+핀+점수
      imagePinUrl,
      score: report.safetyScore,
      
      // 4번: Bad 피드백 + 추천제품
      badCardUrls,
      products: productData,
      
      // 5번: Good 피드백 + 양총평
      goodCardUrls,
      summary: cardNewsText.summary,
    };

    const slideUrls = await generateAllCardNewsSlides(cardNewsData);
    console.log(`[CardNews] Generated ${slideUrls.length} slides`);

    // 9. DB에 저장 (선택적)
    const { error: updateError } = await adminClient
      .from("sleep_analyses")
      .update({ 
        report_slides: slideUrls,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.warn("[CardNews] Failed to update DB:", updateError);
    }

    return data({
      success: true,
      data: {
        analysisId: id,
        slideCount: slideUrls.length,
        slideUrls,
        message: "Card news generated successfully",
      },
    });

  } catch (error) {
    console.error("[CardNews] Generation error:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

