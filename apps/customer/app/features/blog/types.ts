/**
 * Blog Feature Types
 * 블로그 콘텐츠 관련 타입 정의
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  description: string;
  content: string;
  author: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  tags?: string[];
  publishedAt: string;
  createdAt: string;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

export interface BlogMeta {
  title: string;
  description: string;
  image?: string;
  publishedAt: string;
  tags?: string[];
}
