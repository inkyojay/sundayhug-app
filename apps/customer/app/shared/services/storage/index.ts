/**
 * Storage Service
 * 파일 저장소 서비스 공개 API
 *
 * Supabase Storage를 통한 파일 업로드/다운로드 기능을 제공합니다.
 */

// Types
export type {
  UploadOptions,
  UploadResult,
  DownloadResult,
  StorageClient,
} from "./types";

// Storage Operations
export {
  uploadToStorage,
  uploadMultipleToStorage,
  downloadFromUrl,
  deleteFromStorage,
  getPublicUrl,
} from "./supabase-storage.server";

// Utilities
export { base64ToBuffer, bufferToBase64 } from "./supabase-storage.server";
