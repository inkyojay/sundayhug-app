/**
 * Supabase Storage Service (Server-side)
 *
 * Handles image uploads to Supabase Storage for sleep analysis.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET_NAME = "sleep-analysis";

/**
 * Upload image buffer to Supabase Storage
 *
 * @param client - Supabase client instance
 * @param imageBuffer - Image buffer data
 * @param fileName - Target file name (e.g., "analysis-123-image.jpg")
 * @param mimeType - MIME type (e.g., "image/jpeg")
 * @returns Public URL of the uploaded image
 */
export async function uploadImageToStorage(
  client: SupabaseClient,
  imageBuffer: Buffer | ArrayBuffer,
  fileName: string,
  mimeType: string
): Promise<string> {
  try {
    // Upload file
    const { data, error } = await client.storage
      .from(BUCKET_NAME)
      .upload(fileName, imageBuffer, {
        contentType: mimeType,
        upsert: true,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = client.storage
      .from(BUCKET_NAME)
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      throw new Error("Failed to generate public URL");
    }

    return urlData.publicUrl;
  } catch (error) {
    console.error("Storage upload error:", error);
    throw error;
  }
}

/**
 * Upload multiple slides to Supabase Storage (PNG format)
 *
 * @param client - Supabase client instance
 * @param pngBuffers - Array of PNG buffer data
 * @param analysisId - Analysis ID for organizing slides
 * @returns Array of public URLs
 */
export async function uploadSlidesToStorage(
  client: SupabaseClient,
  pngBuffers: Buffer[],
  analysisId: string
): Promise<string[]> {
  const slideUrls: string[] = [];

  for (let i = 0; i < pngBuffers.length; i++) {
    const pngBuffer = pngBuffers[i];
    const fileName = `slides/${analysisId}/slide-${i + 1}.png`;

    const url = await uploadImageToStorage(
      client,
      pngBuffer,
      fileName,
      "image/png"
    );
    slideUrls.push(url);
  }

  return slideUrls;
}

/**
 * Download image from URL and return as buffer
 *
 * @param imageUrl - URL of the image to download
 * @returns Object containing buffer and content type
 */
export async function downloadImageFromUrl(
  imageUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(
      `Image download failed: ${response.status} ${response.statusText}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "image/jpeg";

  return { buffer, contentType };
}

/**
 * Convert base64 string to buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

/**
 * Convert buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

