/**
 * Storage Service Types
 * 파일 저장소 서비스 관련 타입 정의
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface UploadOptions {
  bucket: string;
  fileName: string;
  mimeType: string;
  upsert?: boolean;
}

export interface UploadResult {
  publicUrl: string;
  path: string;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
}

export type StorageClient = SupabaseClient;
