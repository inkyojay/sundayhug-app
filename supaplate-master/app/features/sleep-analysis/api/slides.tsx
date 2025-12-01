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
import { getSleepAnalysis, updateAnalysisSlides } from "../queries";
import type { FeedbackItem, Reference, RiskLevel } from "../schema";

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;

  if (!id) {
    return data({ success: false, error: "Analysis ID is required" }, { status: 400 });
  }

  try {
    const result = await getSleepAnalysis(id);

    if (!result) {
      return data({ success: false, error: "Analysis not found" }, { status: 404 });
    }

    const slides = result.analysis.reportSlides as string[] | null;

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
        instagramId: result.analysis.instagramId,
        phoneNumber: result.analysis.phoneNumber,
        createdAt: result.analysis.createdAt,
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
    const result = await getSleepAnalysis(id);

    if (!result) {
      return data({ success: false, error: "Analysis not found" }, { status: 404 });
    }

    // Build analysis report from database data
    const report = {
      summary: result.analysis.summary,
      feedbackItems: result.feedbackItems.map((item: FeedbackItem) => ({
        id: item.itemNumber,
        x: Number(item.x),
        y: Number(item.y),
        title: item.title,
        feedback: item.feedback,
        riskLevel: item.riskLevel as RiskLevel,
      })),
      references: result.references.map((ref: Reference) => ({
        title: ref.title,
        uri: ref.uri,
      })),
    };

    // Get image base64
    let imageBase64 = result.analysis.imageBase64;

    if (!imageBase64 && result.analysis.imageUrl) {
      // Download from storage if needed
      console.log("📥 Downloading image from Storage:", result.analysis.imageUrl);
      const { buffer } = await downloadImageFromUrl(result.analysis.imageUrl);
      imageBase64 = buffer.toString("base64");
    }

    // Generate slides as PNG
    console.log(`📊 Generating PNG slides for analysis ${id}...`);
    const pngBuffers = await generateAllSlidesAsPng(report, imageBase64 ?? undefined);
    console.log(`✅ Generated ${pngBuffers.length} PNG slides`);

    // Upload to Storage
    const slideUrls = await uploadSlidesToStorage(adminClient, pngBuffers, id);
    console.log(`✅ Uploaded ${slideUrls.length} slides to Storage`);

    // Update database
    await updateAnalysisSlides(id, slideUrls);

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

