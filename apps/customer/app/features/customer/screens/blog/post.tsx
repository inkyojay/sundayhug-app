/**
 * 블로그 글 상세 페이지 (DB 연동)
 */
import type { Route } from "./+types/post";

import { Link, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Clock,
  Calendar,
  Share2,
  Moon,
  Package,
  Heart,
  BookOpen,
  Headphones,
  Play,
  Pause
} from "lucide-react";
import React, { useState, useRef } from "react";
import { Button } from "~/core/components/ui/button";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta({ data }: Route.MetaArgs): Route.MetaDescriptors {
  if (!data?.post) {
    return [{ title: "글을 찾을 수 없습니다 | 썬데이허그" }];
  }
  return [
    { title: `${data.post.title} | 썬데이허그 블로그` },
    { name: "description", content: data.post.excerpt || "" },
  ];
}

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, typeof Moon> = {
  "sleep-guide": Moon,
  "product-tips": Package,
  "parenting": Heart,
};

// 카테고리 색상 매핑
const categoryColors: Record<string, string> = {
  "sleep-guide": "bg-indigo-50 text-indigo-700",
  "product-tips": "bg-orange-50 text-orange-700",
  "parenting": "bg-pink-50 text-pink-700",
};

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  // slug로 포스트 조회
  const { data: post } = await supabase
    .from("blog_posts")
    .select(`
      *,
      blog_categories (
        id,
        name,
        slug
      )
    `)
    .eq("slug", params.postId)
    .eq("status", "published")
    .single();

  if (!post) {
    return data({ post: null, relatedPosts: [] });
  }

  // 관련 글 조회 (같은 카테고리, 최대 2개)
  const { data: relatedPosts } = await supabase
    .from("blog_posts")
    .select(`
      id,
      title,
      slug,
      thumbnail_url,
      blog_categories (
        name,
        slug
      )
    `)
    .eq("status", "published")
    .eq("category_id", post.category_id)
    .neq("id", post.id)
    .limit(2);

  return data({ post, relatedPosts: relatedPosts || [] });
}

// 간단한 Markdown 렌더러
function renderMarkdown(content: string) {
  const lines = content.split('\n');
  const elements: JSX.Element[] = [];
  let listItems: string[] = [];
  
  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 mb-4 text-gray-600">
          {listItems.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      );
      listItems = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmedLine = line.trim();
    
    if (trimmedLine.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={i} className="text-xl font-bold text-gray-900 mt-8 mb-4">
          {trimmedLine.replace('## ', '')}
        </h2>
      );
    } else if (trimmedLine.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={i} className="text-lg font-semibold text-gray-800 mt-6 mb-3">
          {trimmedLine.replace('### ', '')}
        </h3>
      );
    } else if (trimmedLine.startsWith('- ')) {
      listItems.push(trimmedLine.replace('- ', ''));
    } else if (trimmedLine.startsWith('|')) {
      // 테이블 스킵
    } else if (trimmedLine === '') {
      flushList();
    } else if (trimmedLine) {
      flushList();
      // **bold** 처리
      const processed = trimmedLine.replace(
        /\*\*([^*]+)\*\*/g, 
        '<strong class="font-semibold text-gray-900">$1</strong>'
      );
      elements.push(
        <p 
          key={i} 
          className="text-gray-600 leading-relaxed mb-4"
          dangerouslySetInnerHTML={{ __html: processed }}
        />
      );
    }
  });
  
  flushList();
  return elements;
}

export default function BlogPostScreen() {
  const { post, relatedPosts } = useLoaderData<typeof loader>();
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">글을 찾을 수 없습니다</h1>
          <Link to="/customer/blog" className="text-[#FF6B35]">
            블로그로 돌아가기
          </Link>
        </div>
      </div>
    );
  }

  const categorySlug = post.blog_categories?.slug || "";
  const CategoryIcon = categoryIcons[categorySlug] || BookOpen;
  const categoryColor = categoryColors[categorySlug] || "bg-gray-50 text-gray-700";

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || "",
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled");
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("링크가 복사되었습니다!");
    }
  };

  const toggleAudio = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      {/* Hero */}
      <div className="relative h-64 md:h-80">
        {post.thumbnail_url ? (
          <img 
            src={post.thumbnail_url} 
            alt={post.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Back Button */}
        <Link 
          to="/customer/blog"
          className="absolute top-6 left-6 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </Link>
      </div>

      <div className="mx-auto max-w-3xl px-6">
        {/* Header */}
        <div className="bg-white rounded-2xl -mt-16 relative z-10 p-6 md:p-8 mb-6 border border-gray-100">
          <div className="flex items-center gap-2 mb-3">
            {post.blog_categories && (
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${categoryColor}`}>
                <CategoryIcon className="w-4 h-4" />
                {post.blog_categories.name}
              </span>
            )}
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            {post.title}
          </h1>
          
          {post.excerpt && (
            <p className="text-gray-500 mb-4">
              {post.excerpt}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {post.read_time}분 읽기
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {post.published_at 
                  ? new Date(post.published_at).toLocaleDateString("ko-KR")
                  : ""}
              </span>
            </div>
            
            <Button variant="ghost" size="sm" className="text-gray-500" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-2" />
              공유
            </Button>
          </div>
        </div>

        {/* Audio Player */}
        {post.audio_url && (
          <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl p-5 mb-6 border border-orange-100">
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleAudio}
                className="w-14 h-14 bg-[#FF6B35] rounded-full flex items-center justify-center hover:bg-[#FF6B35]/90 transition-colors shadow-lg flex-shrink-0"
              >
                {isPlaying ? (
                  <Pause className="w-6 h-6 text-white" />
                ) : (
                  <Play className="w-6 h-6 text-white ml-1" />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Headphones className="w-4 h-4 text-[#FF6B35]" />
                  <span className="font-semibold text-gray-900">오디오로 듣기</span>
                </div>
                <p className="text-sm text-gray-500">
                  {isPlaying ? "재생 중..." : `약 ${post.read_time}분 소요`}
                </p>
              </div>
            </div>
            <audio 
              ref={audioRef}
              src={post.audio_url} 
              onEnded={() => setIsPlaying(false)}
              onPause={() => setIsPlaying(false)}
              onPlay={() => setIsPlaying(true)}
              className="w-full mt-4"
              controls
            />
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-2xl p-6 md:p-8 mb-6 border border-gray-100">
          <article>
            {post.content && renderMarkdown(post.content)}
          </article>
        </div>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <div className="mb-10">
            <h2 className="text-lg font-bold text-gray-900 mb-4">다른 글도 읽어보세요</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {relatedPosts.map((relatedPost) => {
                const relatedColor = categoryColors[relatedPost.blog_categories?.slug || ""] || "bg-gray-50 text-gray-700";
                
                return (
                  <Link key={relatedPost.id} to={`/customer/blog/${relatedPost.slug}`} className="block group">
                    <div className="bg-white rounded-2xl overflow-hidden hover:shadow-md transition-all border border-gray-100">
                      <div className="h-32 overflow-hidden bg-gray-100">
                        {relatedPost.thumbnail_url ? (
                          <img 
                            src={relatedPost.thumbnail_url} 
                            alt={relatedPost.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        {relatedPost.blog_categories && (
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${relatedColor}`}>
                            {relatedPost.blog_categories.name}
                          </span>
                        )}
                        <h3 className="font-semibold text-gray-900 mt-2 line-clamp-2 group-hover:text-[#FF6B35] transition-colors">
                          {relatedPost.title}
                        </h3>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
