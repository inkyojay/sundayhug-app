/**
 * 대시보드 - 블로그 글 목록
 */
import type { Route } from "./+types/posts-list";

import { Link, useLoaderData, data, useFetcher } from "react-router";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Eye,
  EyeOff,
  Star,
  Clock,
  Search,
  Volume2,
  Loader2,
  Check
} from "lucide-react";
import React, { useState } from "react";

import { Button } from "~/core/components/ui/button";
import { Badge } from "~/core/components/ui/badge";
import { Input } from "~/core/components/ui/input";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "블로그 관리 | 대시보드" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const { data: posts, error } = await supabase
    .from("blog_posts")
    .select(`
      id,
      title,
      slug,
      excerpt,
      thumbnail_url,
      read_time,
      status,
      featured,
      audio_url,
      audio_generated_at,
      created_at,
      blog_categories (
        name,
        slug
      )
    `)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("블로그 글 조회 오류:", error);
  }

  return data({ posts: posts || [] });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;
  const postId = formData.get("postId") as string;

  if (actionType === "delete") {
    const { error } = await supabase
      .from("blog_posts")
      .delete()
      .eq("id", postId);

    if (error) {
      return data({ success: false, error: "삭제에 실패했습니다." });
    }
    return data({ success: true });
  }

  if (actionType === "toggle-status") {
    const currentStatus = formData.get("currentStatus") as string;
    const newStatus = currentStatus === "published" ? "draft" : "published";
    
    const { error } = await supabase
      .from("blog_posts")
      .update({ 
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null
      })
      .eq("id", postId);

    if (error) {
      return data({ success: false, error: "상태 변경에 실패했습니다." });
    }
    return data({ success: true });
  }

  if (actionType === "toggle-featured") {
    const currentFeatured = formData.get("currentFeatured") === "true";
    
    const { error } = await supabase
      .from("blog_posts")
      .update({ featured: !currentFeatured })
      .eq("id", postId);

    if (error) {
      return data({ success: false, error: "추천 상태 변경에 실패했습니다." });
    }
    return data({ success: true });
  }

  return data({ success: false, error: "잘못된 요청입니다." });
}

export default function BlogPostsListScreen() {
  const { posts } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const audioFetcher = useFetcher();
  const [searchTerm, setSearchTerm] = useState("");
  const [generatingAudioId, setGeneratingAudioId] = useState<string | null>(null);

  const filteredPosts = posts.filter(post =>
    post.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = (postId: string, title: string) => {
    if (confirm(`"${title}" 글을 삭제하시겠습니까?`)) {
      fetcher.submit(
        { actionType: "delete", postId },
        { method: "post" }
      );
    }
  };

  const handleToggleStatus = (postId: string, currentStatus: string) => {
    fetcher.submit(
      { actionType: "toggle-status", postId, currentStatus },
      { method: "post" }
    );
  };

  const handleToggleFeatured = (postId: string, currentFeatured: boolean) => {
    fetcher.submit(
      { actionType: "toggle-featured", postId, currentFeatured: String(currentFeatured) },
      { method: "post" }
    );
  };

  const handleGenerateAudio = async (postId: string) => {
    setGeneratingAudioId(postId);
    audioFetcher.submit(
      { postId },
      { method: "post", action: "/api/blog/generate-audio" }
    );
  };

  // 오디오 생성 완료 처리
  React.useEffect(() => {
    if (audioFetcher.state === "idle" && audioFetcher.data) {
      setGeneratingAudioId(null);
      if (audioFetcher.data.success) {
        alert("오디오가 생성되었습니다! 페이지를 새로고침하세요.");
      } else {
        alert(`오디오 생성 실패: ${audioFetcher.data.error}`);
      }
    }
  }, [audioFetcher.state, audioFetcher.data]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">블로그 관리</h1>
          <p className="text-muted-foreground">블로그 글을 작성하고 관리하세요</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/blog/new">
            <Plus className="w-4 h-4 mr-2" />
            새 글 작성
          </Link>
        </Button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="글 제목 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">전체 글</p>
          <p className="text-2xl font-bold">{posts.length}</p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">공개됨</p>
          <p className="text-2xl font-bold text-green-600">
            {posts.filter(p => p.status === "published").length}
          </p>
        </div>
        <div className="bg-card p-4 rounded-lg border">
          <p className="text-sm text-muted-foreground">임시저장</p>
          <p className="text-2xl font-bold text-yellow-600">
            {posts.filter(p => p.status === "draft").length}
          </p>
        </div>
      </div>

      {/* Posts List */}
      <div className="bg-card rounded-lg border">
        {filteredPosts.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "검색 결과가 없습니다" : "작성된 글이 없습니다"}
            </p>
            <Button asChild variant="outline">
              <Link to="/dashboard/blog/new">첫 글 작성하기</Link>
            </Button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPosts.map((post) => (
              <div key={post.id} className="p-4 flex items-center gap-4 hover:bg-muted/50">
                {/* Thumbnail */}
                <div className="w-20 h-14 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                  {post.thumbnail_url ? (
                    <img 
                      src={post.thumbnail_url} 
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No Image
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold truncate">{post.title}</h3>
                    {post.featured && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    {post.blog_categories && (
                      <Badge variant="secondary" className="text-xs">
                        {post.blog_categories.name}
                      </Badge>
                    )}
                    <Badge variant={post.status === "published" ? "default" : "outline"}>
                      {post.status === "published" ? "공개" : "임시저장"}
                    </Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {post.read_time}분
                    </span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {/* 오디오 생성 버튼 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleGenerateAudio(post.id)}
                    disabled={generatingAudioId === post.id}
                    title={post.audio_url ? "오디오 재생성" : "오디오 생성"}
                  >
                    {generatingAudioId === post.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : post.audio_url ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Volume2 className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleFeatured(post.id, post.featured)}
                    title={post.featured ? "추천 해제" : "추천 설정"}
                  >
                    <Star className={`w-4 h-4 ${post.featured ? "text-yellow-500 fill-yellow-500" : ""}`} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleStatus(post.id, post.status)}
                    title={post.status === "published" ? "비공개로 변경" : "공개하기"}
                  >
                    {post.status === "published" ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/dashboard/blog/${post.id}/edit`}>
                      <Pencil className="w-4 h-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(post.id, post.title)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

