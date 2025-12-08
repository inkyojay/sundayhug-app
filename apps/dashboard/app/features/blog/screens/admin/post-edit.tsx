/**
 * 대시보드 - 블로그 글 작성/수정
 * 
 * AI 기능:
 * - 썸네일 이미지 자동 생성 (Imagen 3)
 * - 읽기 시간 자동 계산
 * - 슬러그 자동 생성 (중복 체크)
 */
import type { Route } from "./+types/post-edit";

import { Link, useLoaderData, useNavigate, data, Form, useActionData, useFetcher } from "react-router";
import { ArrowLeft, Save, Eye, ImagePlus, Loader2, Sparkles, Clock, RefreshCw } from "lucide-react";
import { useState, useEffect, useCallback } from "react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "~/core/components/ui/select";
import { Checkbox } from "~/core/components/ui/checkbox";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta({ data }: Route.MetaArgs): Route.MetaDescriptors {
  const isNew = !data?.post;
  return [{ title: isNew ? "새 글 작성 | 대시보드" : `${data?.post?.title || "글"} 수정 | 대시보드` }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  // 카테고리 목록
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("*")
    .order("sort_order");

  // 기존 슬러그 목록 (중복 체크용)
  const { data: existingSlugs } = await supabase
    .from("blog_posts")
    .select("slug")
    .neq("id", params.postId || "");

  // 기존 글 수정인 경우
  if (params.postId && params.postId !== "new") {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", params.postId)
      .single();

    return data({ 
      post, 
      categories: categories || [], 
      existingSlugs: existingSlugs?.map(s => s.slug) || [],
      isNew: false 
    });
  }

  return data({ 
    post: null, 
    categories: categories || [], 
    existingSlugs: existingSlugs?.map(s => s.slug) || [],
    isNew: true 
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const { data: { user } } = await supabase.auth.getUser();
  
  const formData = await request.formData();
  const title = formData.get("title") as string;
  const slug = formData.get("slug") as string;
  const categoryId = formData.get("categoryId") as string;
  const excerpt = formData.get("excerpt") as string;
  const content = formData.get("content") as string;
  const thumbnailUrl = formData.get("thumbnailUrl") as string;
  const readTime = parseInt(formData.get("readTime") as string) || 5;
  const status = formData.get("status") as string;
  const featured = formData.get("featured") === "true";
  const metaTitle = formData.get("metaTitle") as string;
  const metaDescription = formData.get("metaDescription") as string;

  if (!title || !slug) {
    return data({ success: false, error: "제목과 슬러그는 필수입니다." });
  }

  const postData = {
    title,
    slug,
    category_id: categoryId || null,
    excerpt,
    content,
    thumbnail_url: thumbnailUrl || null,
    read_time: readTime,
    status,
    featured,
    author_id: user?.id || null,
    published_at: status === "published" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
    meta_title: metaTitle || title,
    meta_description: metaDescription || excerpt?.slice(0, 160) || null,
  };

  const isNew = params.postId === "new";

  if (isNew) {
    const { error } = await supabase
      .from("blog_posts")
      .insert(postData);

    if (error) {
      if (error.code === "23505") {
        return data({ success: false, error: "이미 사용 중인 슬러그입니다." });
      }
      return data({ success: false, error: `저장 실패: ${error.message}` });
    }
  } else {
    const { error } = await supabase
      .from("blog_posts")
      .update(postData)
      .eq("id", params.postId);

    if (error) {
      return data({ success: false, error: `수정 실패: ${error.message}` });
    }
  }

  return data({ success: true, isNew });
}

// 읽기 시간 계산 함수 (한국어 기준 분당 약 500자)
function calculateReadTime(text: string): number {
  if (!text) return 1;
  // 마크다운 문법 제거
  const cleanText = text
    .replace(/[#*`\-\[\]()>]/g, "")
    .replace(/\n+/g, " ")
    .trim();
  const charCount = cleanText.length;
  const minutes = Math.ceil(charCount / 500);
  return Math.max(1, Math.min(minutes, 60)); // 최소 1분, 최대 60분
}


export default function BlogPostEditScreen() {
  const { post, categories, existingSlugs, isNew } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();
  const thumbnailFetcher = useFetcher();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [slugTouched, setSlugTouched] = useState(false); // 사용자가 슬러그를 수동 수정했는지
  const [categoryId, setCategoryId] = useState(post?.category_id || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnail_url || "");
  const [readTime, setReadTime] = useState(post?.read_time || 5);
  const [status, setStatus] = useState(post?.status || "draft");
  const [featured, setFeatured] = useState(post?.featured || false);
  const [isGeneratingThumbnail, setIsGeneratingThumbnail] = useState(false);
  const [metaTitle, setMetaTitle] = useState(post?.meta_title || "");
  const [metaDescription, setMetaDescription] = useState(post?.meta_description || "");
  const [isGeneratingSlug, setIsGeneratingSlug] = useState(false);
  const slugFetcher = useFetcher();

  // 슬러그 중복 체크
  const isSlugDuplicate = existingSlugs.includes(slug) && slug !== post?.slug;

  // 제목에서 자동 슬러그 생성 (새 글이고 슬러그가 비어있을 때만)
  useEffect(() => {
    if (isNew && title && !slug && !isGeneratingSlug) {
      handleRegenerateSlug();
    }
  }, [isNew, title]);

  // 읽기 시간 자동 계산
  const handleCalculateReadTime = useCallback(() => {
    const calculatedTime = calculateReadTime(content);
    setReadTime(calculatedTime);
  }, [content]);

  // 본문이 변경될 때마다 읽기 시간 자동 업데이트
  useEffect(() => {
    if (content) {
      handleCalculateReadTime();
    }
  }, [content, handleCalculateReadTime]);

  // AI 영어 슬러그 생성
  const handleRegenerateSlug = () => {
    if (!title) {
      alert("제목을 먼저 입력해주세요.");
      return;
    }
    setIsGeneratingSlug(true);
    slugFetcher.submit(
      { title, content, postId: post?.id || "" },
      { method: "post", action: "/api/blog/generate-slug" }
    );
  };

  // 슬러그 생성 완료 처리
  useEffect(() => {
    if (slugFetcher.state === "idle" && slugFetcher.data) {
      setIsGeneratingSlug(false);
      if (slugFetcher.data.success && slugFetcher.data.slug) {
        setSlug(slugFetcher.data.slug);
        setSlugTouched(false);
      } else if (slugFetcher.data.error) {
        alert(`슬러그 생성 실패: ${slugFetcher.data.error}`);
      }
    }
  }, [slugFetcher.state, slugFetcher.data]);

  // AI 썸네일 생성
  const handleGenerateThumbnail = () => {
    if (!title) {
      alert("제목을 먼저 입력해주세요.");
      return;
    }
    setIsGeneratingThumbnail(true);
    thumbnailFetcher.submit(
      { 
        postId: post?.id || "new",
        title, 
        content 
      },
      { method: "post", action: "/api/blog/generate-thumbnail" }
    );
  };

  // 썸네일 생성 완료 처리
  useEffect(() => {
    if (thumbnailFetcher.state === "idle" && thumbnailFetcher.data) {
      setIsGeneratingThumbnail(false);
      if (thumbnailFetcher.data.success && thumbnailFetcher.data.thumbnailUrl) {
        setThumbnailUrl(thumbnailFetcher.data.thumbnailUrl);
      } else if (thumbnailFetcher.data.error) {
        alert(`썸네일 생성 실패: ${thumbnailFetcher.data.error}`);
      }
    }
  }, [thumbnailFetcher.state, thumbnailFetcher.data]);

  // 저장 성공 시 목록으로 이동
  useEffect(() => {
    if (actionData?.success) {
      navigate("/dashboard/blog");
    }
  }, [actionData, navigate]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard/blog">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isNew ? "새 글 작성" : "글 수정"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "새로운 블로그 글을 작성하세요" : post?.title}
            </p>
          </div>
        </div>
        
        {!isNew && post && (
          <Button variant="outline" asChild>
            <a href={`/customer/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </a>
          </Button>
        )}
      </div>

      {actionData?.error && (
        <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
          {actionData.error}
        </div>
      )}

      <Form method="post">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Title */}
            <div className="bg-card p-6 rounded-lg border">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">제목 *</Label>
                  <Input
                    id="title"
                    name="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="글 제목을 입력하세요"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="slug">슬러그 (URL) *</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm whitespace-nowrap">/customer/blog/</span>
                    <Input
                      id="slug"
                      name="slug"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      placeholder="english-url-slug"
                      required
                      className={isSlugDuplicate ? "border-destructive" : ""}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleRegenerateSlug}
                      disabled={isGeneratingSlug || !title}
                      title="영어 슬러그 재생성 (AI)"
                    >
                      {isGeneratingSlug ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <RefreshCw className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {isSlugDuplicate && (
                    <p className="text-xs text-destructive">
                      이미 사용 중인 슬러그입니다. 다른 슬러그를 입력해주세요.
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    AI가 제목을 영어로 변환합니다. 직접 수정도 가능합니다.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="excerpt">요약</Label>
                  <Textarea
                    id="excerpt"
                    name="excerpt"
                    value={excerpt}
                    onChange={(e) => setExcerpt(e.target.value)}
                    placeholder="글 요약을 입력하세요 (목록에 표시됨)"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="bg-card p-6 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="content">본문 (Markdown)</Label>
                <Textarea
                  id="content"
                  name="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="## 제목&#10;&#10;본문 내용을 작성하세요...&#10;&#10;- 목록 1&#10;- 목록 2"
                  rows={20}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Markdown 문법을 지원합니다. ## 제목, **굵게**, - 목록 등
                </p>
              </div>
            </div>

            {/* SEO Meta Fields */}
            <div className="bg-card p-6 rounded-lg border">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="font-semibold">SEO 설정</h3>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">검색 최적화</span>
              </div>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="metaTitle">메타 타이틀</Label>
                  <Input
                    id="metaTitle"
                    name="metaTitle"
                    value={metaTitle}
                    onChange={(e) => setMetaTitle(e.target.value)}
                    placeholder={title || "검색 결과에 표시될 제목"}
                    maxLength={60}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>검색 결과에 표시되는 제목 (비워두면 글 제목 사용)</span>
                    <span className={metaTitle.length > 60 ? "text-destructive" : ""}>
                      {metaTitle.length}/60
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="metaDescription">메타 디스크립션</Label>
                  <Textarea
                    id="metaDescription"
                    name="metaDescription"
                    value={metaDescription}
                    onChange={(e) => setMetaDescription(e.target.value)}
                    placeholder={excerpt?.slice(0, 160) || "검색 결과에 표시될 설명"}
                    rows={3}
                    maxLength={160}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>검색 결과에 표시되는 설명 (비워두면 요약 사용)</span>
                    <span className={metaDescription.length > 160 ? "text-destructive" : ""}>
                      {metaDescription.length}/160
                    </span>
                  </div>
                </div>

                {/* 미리보기 */}
                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-2">Google 검색 결과 미리보기</p>
                  <div className="space-y-1">
                    <p className="text-blue-600 text-sm font-medium truncate">
                      {metaTitle || title || "페이지 제목"}
                    </p>
                    <p className="text-green-700 text-xs truncate">
                      sundayhug.com/customer/blog/{slug || "url-slug"}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {metaDescription || excerpt || "페이지 설명이 여기에 표시됩니다..."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Publish Settings */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">발행 설정</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>상태</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">임시저장</SelectItem>
                      <SelectItem value="published">공개</SelectItem>
                    </SelectContent>
                  </Select>
                  <input type="hidden" name="status" value={status} />
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id="featured"
                    checked={featured}
                    onCheckedChange={(checked) => setFeatured(checked === true)}
                  />
                  <Label htmlFor="featured" className="cursor-pointer">추천 글로 지정</Label>
                  <input type="hidden" name="featured" value={String(featured)} />
                </div>

                <Button type="submit" className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  {status === "published" ? "발행하기" : "저장하기"}
                </Button>
              </div>
            </div>

            {/* Category */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">카테고리</h3>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger>
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input type="hidden" name="categoryId" value={categoryId} />
            </div>

            {/* Thumbnail */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">썸네일 이미지</h3>
              <div className="space-y-4">
                {thumbnailUrl ? (
                  <div className="relative">
                    <img 
                      src={thumbnailUrl} 
                      alt="썸네일"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => setThumbnailUrl("")}
                    >
                      삭제
                    </Button>
                  </div>
                ) : (
                  <div className="w-full h-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                    <ImagePlus className="w-8 h-8" />
                  </div>
                )}
                
                {/* AI 썸네일 생성 버튼 */}
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGenerateThumbnail}
                  disabled={isGeneratingThumbnail || !title}
                >
                  {isGeneratingThumbnail ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      AI가 이미지 생성 중...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      AI로 썸네일 생성
                    </>
                  )}
                </Button>
                
                <Input
                  name="thumbnailUrl"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="이미지 URL 입력"
                />
                <p className="text-xs text-muted-foreground">
                  AI 생성 또는 직접 URL을 입력하세요
                </p>
              </div>
            </div>

            {/* Read Time */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">읽기 시간</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    name="readTime"
                    value={readTime}
                    onChange={(e) => setReadTime(parseInt(e.target.value) || 1)}
                    min={1}
                    max={60}
                    className="w-20"
                  />
                  <span className="text-muted-foreground">분</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCalculateReadTime}
                    title="본문 기준 자동 계산"
                  >
                    <Clock className="w-4 h-4 mr-1" />
                    자동
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  본문 작성 시 자동 계산됩니다 (한국어 분당 500자 기준)
                </p>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}

