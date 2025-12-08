/**
 * Sleep Analysis API - Analyze Endpoint
 *
 * POST /api/sleep/analyze
 * Analyzes a sleep environment image provided as base64.
 *
 * Request Body:
 * {
 *   "imageBase64": "data:image/jpeg;base64,...",
 *   "birthDate": "2024-01-15",
 *   "phoneNumber": "010-1234-5678" (optional),
 *   "instagramId": "@instagram_id" (optional)
 * }
 */
import type { Route } from "./+types/analyze";

import { data } from "react-router";

import {
  analyzeSleepEnvironment,
  calculateAgeInMonths,
  parseDataUrl,
} from "../lib/gemini.server";
import { saveSleepAnalysis } from "../queries";

export async function action({ request }: Route.ActionArgs) {
  // Only allow POST
  if (request.method !== "POST") {
    return data({ success: false, error: "Method not allowed" }, { status: 405 });
  }

  try {
    const body = await request.json();
    const { imageBase64, birthDate, phoneNumber, instagramId } = body;

    // Validate required fields
    if (!imageBase64) {
      return data(
        { success: false, error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    if (!birthDate) {
      return data(
        { success: false, error: "birthDate is required (format: YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    // Parse base64 data
    const { base64, mimeType } = parseDataUrl(imageBase64);

    // Analyze with Gemini
    const report = await analyzeSleepEnvironment(base64, mimeType, birthDate);
    const ageInMonths = calculateAgeInMonths(birthDate);

    // Save to database
    const analysisId = await saveSleepAnalysis(report, {
      birthDate,
      ageInMonths,
      imageBase64: base64,
      phoneNumber: phoneNumber ?? null,
      instagramId: instagramId ?? null,
      userId: null, // API requests are anonymous
    });

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
    console.error("Analysis API Error:", error);

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
    message: "Sleep Analysis API is running",
    endpoint: "POST /api/sleep/analyze",
  });
}



