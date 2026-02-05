/**
 * Sleep Analysis API - Analyze from URL Endpoint
 *
 * POST /api/sleep/analyze-from-url
 * Downloads an image from URL, analyzes it, and saves the result.
 * Useful for integrations with Tally forms or other services.
 *
 * Request Body:
 * {
 *   "imageUrl": "https://storage.tally.so/private/image.jpeg?...",
 *   "birthDate": "2024-01-15",
 *   "phoneNumber": "010-1234-5678" (optional),
 *   "instagramId": "@instagram_id" (optional)
 * }
 */
import type { Route } from "./+types/analyze-from-url";

import { data } from "react-router";

import adminClient from "~/core/lib/supa-admin-client.server";

import {
  analyzeSleepEnvironment,
  calculateAgeInMonths,
} from "../lib/gemini.server";
import {
  downloadImageFromUrl,
  uploadImageToStorage,
  bufferToBase64,
} from "../lib/storage.server";
import { saveSleepAnalysis, updateAnalysisImageUrl } from "../queries";

export async function action({ request }: Route.ActionArgs) {
  // Only allow POST
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { imageUrl, birthDate, phoneNumber, instagramId } = body;

    // Validate required fields
    if (!imageUrl || !birthDate) {
      return data(
        { success: false, error: "imageUrl and birthDate are required" },
        { status: 400 }
      );
    }

    // Download image from URL
    const { buffer, contentType } = await downloadImageFromUrl(imageUrl);
    const base64String = bufferToBase64(buffer);

    // Analyze with Gemini
    const report = await analyzeSleepEnvironment(
      base64String,
      contentType,
      birthDate
    );
    const ageInMonths = calculateAgeInMonths(birthDate);

    // Save to database first (need ID for file path)
    const analysisId = await saveSleepAnalysis(report, {
      birthDate,
      ageInMonths,
      imageBase64: base64String,
      phoneNumber: phoneNumber ?? null,
      instagramId: instagramId ?? null,
      userId: null,
    });

    // Upload image to Supabase Storage
    try {
      const fileName = `images/${analysisId}/original.${contentType.split("/")[1]}`;
      const uploadedImageUrl = await uploadImageToStorage(
        adminClient,
        buffer,
        fileName,
        contentType
      );

      // Update analysis with image URL
      await updateAnalysisImageUrl(analysisId, uploadedImageUrl);

    } catch (uploadError) {
      console.error("Image upload failed (continuing):", uploadError);
    }

    return data({
      success: true,
      data: {
        ...report,
        phoneNumber: phoneNumber ?? null,
        instagramId: instagramId ?? null,
      },
      analysisId,
    });
  } catch (error) {
    console.error("❌ Image URL analysis API error:", error);

    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

// Health check for GET requests
export async function loader() {
  return data({
    success: true,
    message: "Sleep Analysis from URL API is running",
    endpoint: "POST /api/sleep/analyze-from-url",
  });
}

