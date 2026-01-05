/**
 * Supabase Storage Service
 * Supabase Storage를 통한 파일 업로드/다운로드 서비스
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UploadOptions, UploadResult, DownloadResult } from "./types";

/**
 * Upload file buffer to Supabase Storage
 */
export async function uploadToStorage(
  client: SupabaseClient,
  buffer: Buffer | ArrayBuffer,
  options: UploadOptions
): Promise<UploadResult> {
  const { bucket, fileName, mimeType, upsert = true } = options;

  const { data, error } = await client.storage
    .from(bucket)
    .upload(fileName, buffer, {
      contentType: mimeType,
      upsert,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  const { data: urlData } = client.storage
    .from(bucket)
    .getPublicUrl(fileName);

  if (!urlData?.publicUrl) {
    throw new Error("Failed to generate public URL");
  }

  return {
    publicUrl: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Upload multiple files to Supabase Storage
 */
export async function uploadMultipleToStorage(
  client: SupabaseClient,
  files: Array<{ buffer: Buffer; fileName: string; mimeType: string }>,
  bucket: string
): Promise<UploadResult[]> {
  const results: UploadResult[] = [];

  for (const file of files) {
    const result = await uploadToStorage(client, file.buffer, {
      bucket,
      fileName: file.fileName,
      mimeType: file.mimeType,
    });
    results.push(result);
  }

  return results;
}

/**
 * Download file from URL and return as buffer
 */
export async function downloadFromUrl(imageUrl: string): Promise<DownloadResult> {
  const response = await fetch(imageUrl);

  if (!response.ok) {
    throw new Error(`Download failed: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type") || "application/octet-stream";

  return { buffer, contentType };
}

/**
 * Delete file from Supabase Storage
 */
export async function deleteFromStorage(
  client: SupabaseClient,
  bucket: string,
  filePath: string
): Promise<void> {
  const { error } = await client.storage.from(bucket).remove([filePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}

/**
 * Get public URL for a file
 */
export function getPublicUrl(
  client: SupabaseClient,
  bucket: string,
  filePath: string
): string {
  const { data } = client.storage.from(bucket).getPublicUrl(filePath);
  return data.publicUrl;
}

/**
 * Utility: Convert base64 string to buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, "base64");
}

/**
 * Utility: Convert buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}
