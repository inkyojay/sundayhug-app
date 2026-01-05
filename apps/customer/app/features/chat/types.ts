/**
 * Chat Feature Types
 * AI 육아 상담 채팅 관련 타입 정의
 */

export interface ChatSession {
  id: string;
  userId: string;
  babyProfileId?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  audioUrl?: string;
  createdAt: string;
}

export interface BabyProfile {
  id: string;
  userId: string;
  name: string;
  birthDate: string;
  gender?: "male" | "female";
  createdAt: string;
}

export interface KnowledgeBase {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  createdAt: string;
}
