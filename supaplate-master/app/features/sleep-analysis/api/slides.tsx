/**
 * Sleep Analysis API - Slides Endpoint
 *
 * GET /api/sleep/:id/slides
 * Retrieves slides for an analysis.
 *
 * POST /api/sleep/:id/slides
 * Generates slides for an analysis.
 */
import type { Route } from "./+types/slides";

import { data } from "react-router";

import adminClient from "~/core/lib/supa-admin-client.server";

import { downloadImageFromUrl, uploadSlidesToStorage } from "../lib/storage.server";
import { generateAllSlidesAsPng } from "../lib/slides.server";
import { getSleepAnalysis as getSleepAnalysisFromServer } from "../lib/sleep-analysis.server";
import type { RiskLevel } from "../schema";

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;

  if (!id) {
    return data({ success: false, error: "Analysis ID is required" }, { status: 400 });
  }

  try {
    const result = await getSleepAnalysisFromServer(id);

    if (!result) {
      return data({ success: false, error: "Analysis not found" }, { status: 404 });
    }

    const slides = result.report_slides as string[] | null;

    if (!slides || slides.length === 0) {
      return data(
        { success: false, error: "Slides not generated yet" },
        { status: 404 }
      );
    }

    const isUrlArray =
      slides.length > 0 &&
      typeof slides[0] === "string" &&
      slides[0].startsWith("http");

    return data({
      success: true,
      data: {
        analysisId: id,
        slides,
        slideUrls: isUrlArray ? slides : null,
        slideCount: slides.length,
        instagramId: result.instagram_id,
        phoneNumber: result.phone_number,
        createdAt: result.created_at,
        isUrlArray,
      },
    });
  } catch (error) {
    console.error("Slides retrieval error:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function action({ request, params }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  const { id } = params;

  if (!id) {
    return data({ success: false, error: "Analysis ID is required" }, { status: 400 });
  }

  try {
    const result = await getSleepAnalysisFromServer(id);

    if (!result) {
      return data({ success: false, error: "Analysis not found" }, { status: 404 });
    }

    // summary에서 파싱된 report 사용 (Gemini 형식: summary, feedbackItems, references)
    const parsedReport = result.report;
    
    if (!parsedReport) {
      return data({ success: false, error: "Analysis report not found" }, { status: 404 });
    }

    // Build analysis report from database data
    const report = {
      summary: parsedReport.summary || "",
      feedbackItems: (parsedReport.feedbackItems || []).map((item: any) => ({
        id: item.id || 1,
        x: item.x || 50,
        y: item.y || 50,
        title: item.title || "",
        feedback: item.feedback || "",
        riskLevel: (item.riskLevel || "Info") as RiskLevel,
      })),
      references: parsedReport.references || [],
    };

    // Get image base64
    let imageBase64 = result.image_base64;

    if (!imageBase64 && result.image_url) {
      // Download from storage if needed
      console.log("📥 Downloading image from Storage:", result.image_url);
      const { buffer } = await downloadImageFromUrl(result.image_url);
      imageBase64 = buffer.toString("base64");
    }

    // Generate slides as PNG
    console.log(`📊 Generating PNG slides for analysis ${id}...`);
    const pngBuffers = await generateAllSlidesAsPng(report, imageBase64 ?? undefined);
    console.log(`✅ Generated ${pngBuffers.length} PNG slides`);

    // Upload to Storage
    const slideUrls = await uploadSlidesToStorage(adminClient, pngBuffers, id);
    console.log(`✅ Uploaded ${slideUrls.length} slides to Storage`);

    // Update database using adminClient (bypasses RLS)
    const { error: updateError } = await adminClient
      .from('sleep_analyses')
      .update({ report_slides: slideUrls })
      .eq('id', id);
    
    if (updateError) {
      console.error("Failed to update slides in DB:", updateError);
      throw new Error(`DB update failed: ${updateError.message}`);
    }
    console.log(`✅ Updated slides in database`);

    return data({
      success: true,
      data: {
        analysisId: id,
        slideCount: slideUrls.length,
        slideUrls,
        message: "Slides generated successfully",
      },
    });
  } catch (error) {
    console.error("Slides generation error:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

