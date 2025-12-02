/**
 * 대시보드 - 블로그 글 작성/수정
 */
import type { Route } from "./+types/post-edit";

import { Link, useLoaderData, useNavigate, data, Form, useActionData } from "react-router";
import { ArrowLeft, Save, Eye, ImagePlus, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

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

  // 기존 글 수정인 경우
  if (params.postId && params.postId !== "new") {
    const { data: post } = await supabase
      .from("blog_posts")
      .select("*")
      .eq("id", params.postId)
      .single();

    return data({ post, categories: categories || [], isNew: false });
  }

  return data({ post: null, categories: categories || [], isNew: true });
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

export default function BlogPostEditScreen() {
  const { post, categories, isNew } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigate = useNavigate();

  const [title, setTitle] = useState(post?.title || "");
  const [slug, setSlug] = useState(post?.slug || "");
  const [categoryId, setCategoryId] = useState(post?.category_id || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [thumbnailUrl, setThumbnailUrl] = useState(post?.thumbnail_url || "");
  const [readTime, setReadTime] = useState(post?.read_time || 5);
  const [status, setStatus] = useState(post?.status || "draft");
  const [featured, setFeatured] = useState(post?.featured || false);

  // 제목에서 자동 슬러그 생성
  useEffect(() => {
    if (isNew && title) {
      const generatedSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 50);
      setSlug(generatedSlug);
    }
  }, [title, isNew]);

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
                    <span className="text-muted-foreground text-sm">/customer/blog/</span>
                    <Input
                      id="slug"
                      name="slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="url-slug"
                      required
                    />
                  </div>
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
                <Input
                  name="thumbnailUrl"
                  value={thumbnailUrl}
                  onChange={(e) => setThumbnailUrl(e.target.value)}
                  placeholder="이미지 URL 입력"
                />
              </div>
            </div>

            {/* Read Time */}
            <div className="bg-card p-6 rounded-lg border">
              <h3 className="font-semibold mb-4">읽기 시간</h3>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  name="readTime"
                  value={readTime}
                  onChange={(e) => setReadTime(parseInt(e.target.value) || 5)}
                  min={1}
                  max={60}
                  className="w-20"
                />
                <span className="text-muted-foreground">분</span>
              </div>
            </div>
          </div>
        </div>
      </Form>
    </div>
  );
}

