/**
 * 고객용 블로그 허브 페이지 (DB 연동)
 */
import type { Route } from "./+types/index";

import { Link, useLoaderData, data } from "react-router";
import { 
  ArrowLeft, 
  Moon, 
  Package,
  Heart,
  ChevronRight,
  Clock,
  BookOpen
} from "lucide-react";

import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "블로그 | 썬데이허그" },
    { name: "description", content: "썬데이허그의 육아 꿀팁과 제품 활용법" },
  ];
}

// 카테고리 아이콘 매핑
const categoryIcons: Record<string, typeof Moon> = {
  "sleep-guide": Moon,
  "product-tips": Package,
  "parenting": Heart,
};

// 카테고리 색상 매핑
const categoryColors: Record<string, { gradient: string; bg: string }> = {
  "sleep-guide": { gradient: "from-indigo-500 to-purple-600", bg: "bg-indigo-50" },
  "product-tips": { gradient: "from-[#FF6B35] to-orange-500", bg: "bg-orange-50" },
  "parenting": { gradient: "from-pink-500 to-rose-500", bg: "bg-pink-50" },
};

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  // 카테고리 조회
  const { data: categories } = await supabase
    .from("blog_categories")
    .select("*")
    .order("sort_order");

  // 공개된 포스트만 조회
  const { data: posts } = await supabase
    .from("blog_posts")
    .select(`
      *,
      blog_categories (
        id,
        name,
        slug
      )
    `)
    .eq("status", "published")
    .order("published_at", { ascending: false });

  return data({ 
    categories: categories || [], 
    posts: posts || [] 
  });
}

export default function BlogIndexScreen() {
  const { categories, posts } = useLoaderData<typeof loader>();
  
  const featuredPosts = posts.filter(p => p.featured);
  const featuredPost = featuredPosts[0];

  return (
    <div className="min-h-screen bg-[#F5F5F0]">
      <div className="mx-auto max-w-4xl px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link 
            to="/customer"
            className="w-10 h-10 rounded-full bg-white flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">블로그</h1>
            <p className="text-gray-500 text-sm">육아 꿀팁과 제품 활용법</p>
          </div>
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <Link to={`/customer/blog/${featuredPost.slug}`} className="block mb-8 group">
            <div className="relative bg-[#1A1A1A] rounded-3xl overflow-hidden">
              <div className="absolute inset-0">
                {featuredPost.thumbnail_url && (
                  <img 
                    src={featuredPost.thumbnail_url} 
                    alt={featuredPost.title}
                    className="w-full h-full object-cover opacity-40 group-hover:opacity-50 transition-opacity"
                  />
                )}
              </div>
              <div className="relative p-8 md:p-10">
                <span className="inline-block px-3 py-1 bg-[#FF6B35] text-white text-xs font-medium rounded-full mb-4">
                  추천 콘텐츠
                </span>
                <h2 className="text-white text-2xl md:text-3xl font-bold mb-3">
                  {featuredPost.title}
                </h2>
                <p className="text-gray-300 mb-4 line-clamp-2">
                  {featuredPost.excerpt}
                </p>
                <div className="flex items-center gap-4 text-gray-400 text-sm">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featuredPost.read_time}분 읽기
                  </span>
                  <span>
                    {featuredPost.published_at 
                      ? new Date(featuredPost.published_at).toLocaleDateString("ko-KR")
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        )}

        {/* Categories */}
        <div className="mb-10">
          <h2 className="text-lg font-bold text-gray-900 mb-4">카테고리</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => {
              const Icon = categoryIcons[category.slug] || BookOpen;
              const colors = categoryColors[category.slug] || { gradient: "from-gray-500 to-gray-600", bg: "bg-gray-50" };
              const categoryPosts = posts.filter(p => p.blog_categories?.id === category.id);
              
              return (
                <Link 
                  key={category.id}
                  to={`/customer/blog/category/${category.slug}`}
                  className="group"
                >
                  <div className={`${colors.bg} rounded-2xl p-5 hover:shadow-lg transition-all`}>
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors.gradient} flex items-center justify-center mb-3`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-gray-500 text-sm mb-2">{category.description}</p>
                    <p className="text-xs text-gray-400">{categoryPosts.length}개의 글</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Posts */}
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">최근 글</h2>
          {posts.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">아직 작성된 글이 없습니다</p>
            </div>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => {
                const colors = categoryColors[post.blog_categories?.slug || ""] || { bg: "bg-gray-50" };
                
                return (
                  <Link key={post.id} to={`/customer/blog/${post.slug}`} className="block group">
                    <div className="bg-white rounded-2xl p-4 flex gap-4 hover:shadow-md transition-all border border-gray-100">
                      <div className="w-24 h-24 md:w-32 md:h-24 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
                        {post.thumbnail_url ? (
                          <img 
                            src={post.thumbnail_url} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                            <BookOpen className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {post.blog_categories && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors.bg} text-gray-700`}>
                              {post.blog_categories.name}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1 group-hover:text-[#FF6B35] transition-colors">
                          {post.title}
                        </h3>
                        <p className="text-gray-500 text-sm line-clamp-2 hidden md:block">
                          {post.excerpt}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {post.read_time}분
                          </span>
                          <span>
                            {post.published_at 
                              ? new Date(post.published_at).toLocaleDateString("ko-KR")
                              : ""}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-300 self-center flex-shrink-0 group-hover:text-[#FF6B35] group-hover:translate-x-1 transition-all" />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
