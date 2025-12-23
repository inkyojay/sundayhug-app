/**
 * 썬데이허그 관리자 대시보드 라우트
 * 
 * 🛠️ 관리자용 대시보드 (/dashboard/*)
 *    - 제품/재고/주문 관리
 *    - 보증서 승인/관리
 *    - 수면 분석 관리
 *    - 블로그/AI 상담 지식 관리
 *    - 후기 이벤트 관리
 */
import {
  type RouteConfig,
  index,
  layout,
  prefix,
  route,
} from "@react-router/dev/routes";

export default [
  // 시스템 라우트
  route("/robots.txt", "core/screens/robots.ts"),
  route("/sitemap.xml", "core/screens/sitemap.ts"),

  // API 라우트
  ...prefix("/api", [
    ...prefix("/settings", [
      route("/theme", "features/settings/api/set-theme.tsx"),
      route("/locale", "features/settings/api/set-locale.tsx"),
    ]),
    ...prefix("/users", [
      index("features/users/api/delete-account.tsx"),
      route("/password", "features/users/api/change-password.tsx"),
      route("/email", "features/users/api/change-email.tsx"),
      route("/profile", "features/users/api/edit-profile.tsx"),
      route("/providers", "features/users/api/connect-provider.tsx"),
      route(
        "/providers/:provider",
        "features/users/api/disconnect-provider.tsx",
      ),
    ]),
    // 수면 분석 API
    ...prefix("/sleep", [
      route("/analyze", "features/sleep-analysis/api/analyze.tsx"),
      route("/analyze-from-url", "features/sleep-analysis/api/analyze-from-url.tsx"),
      route("/:id/slides", "features/sleep-analysis/api/slides.tsx"),
      route("/:id/share-card", "features/sleep-analysis/api/share-card.route.ts"),
      route("/seed-references", "features/sleep-analysis/api/seed-references.tsx"),
    ]),
    // 블로그 API
    ...prefix("/blog", [
      route("/generate-audio", "features/blog/api/generate-audio.tsx"),
      route("/generate-thumbnail", "features/blog/api/generate-thumbnail.tsx"),
      route("/generate-slug", "features/blog/api/generate-slug.tsx"),
    ]),
  ]),

  // ========================================
  // 관리자 인증 라우트
  // ========================================
  layout("core/layouts/navigation.layout.tsx", [
    // 루트(/) → /dashboard로 리다이렉트
    index("features/users/screens/redirect-to-dashboard.tsx"),
    // 인증 확인
    route("/auth/confirm", "features/auth/screens/confirm.tsx"),
    
    // 에러 페이지
    route("/error", "core/screens/error.tsx"),

    // 비로그인 사용자용 라우트
    layout("core/layouts/public.layout.tsx", [
      route("/login", "features/auth/screens/login.tsx"),
      route("/register", "features/auth/screens/register.tsx"),
      route("/join", "features/auth/screens/join.tsx"),
      ...prefix("/auth", [
        route("/api/resend", "features/auth/api/resend.tsx"),
        route(
          "/forgot-password/reset",
          "features/auth/screens/forgot-password.tsx",
        ),
        route("/magic-link", "features/auth/screens/magic-link.tsx"),
        ...prefix("/otp", [
          route("/start", "features/auth/screens/otp/start.tsx"),
          route("/complete", "features/auth/screens/otp/complete.tsx"),
        ]),
        ...prefix("/social", [
          route("/start/:provider", "features/auth/screens/social/start.tsx"),
          route(
            "/complete/:provider",
            "features/auth/screens/social/complete.tsx",
          ),
        ]),
      ]),
    ]),

    // 로그인 사용자용 라우트
    layout("core/layouts/private.layout.tsx", { id: "private-auth" }, [
      ...prefix("/auth", [
        route(
          "/forgot-password/create",
          "features/auth/screens/new-password.tsx",
        ),
        route("/email-verified", "features/auth/screens/email-verified.tsx"),
      ]),
      route("/logout", "features/auth/screens/logout.tsx"),
    ]),
  ]),

  // ========================================
  // 관리자 대시보드 (/dashboard/*) - 로그인 필수
  // ========================================
  layout("core/layouts/private.layout.tsx", { id: "private-dashboard" }, [
    layout("features/users/layouts/dashboard.layout.tsx", [
      ...prefix("/dashboard", [
        // 메인 대시보드
        index("features/users/screens/dashboard.tsx"),
        
        // 제품 관리
        route("/products", "features/products/screens/products.tsx"),
        
        // 제품 분류 (Parent SKU)
        route("/parent-products", "features/parent-products/screens/parent-products.tsx"),
        
        // 재고 관리
        route("/inventory", "features/inventory/screens/inventory.tsx"),
        
        // 주문 관리
        route("/orders", "features/orders/screens/orders.tsx"),
        
        // 보증서 관리 (관리자용)
        ...prefix("/warranty", [
          index("features/warranty/screens/warranty-list.tsx"),
          route("/pending", "features/warranty/screens/warranty-pending.tsx"),
          route("/as", "features/warranty/screens/as-list.tsx"),
          route("/:id", "features/warranty/screens/warranty-detail.tsx"),
        ]),
        
        // 수면 분석 관리 (관리자용)
        ...prefix("/sleep", [
          index("features/sleep-analysis/screens/analyze.tsx"),
          route("/history", "features/sleep-analysis/screens/history.tsx"),
          route("/result/:id", "features/sleep-analysis/screens/result.tsx", { id: "dashboard-sleep-result" }),
        ]),
        
        // 블로그 관리 (관리자용)
        ...prefix("/blog", [
          index("features/blog/screens/admin/posts-list.tsx"),
          route("/:postId/edit", "features/blog/screens/admin/post-edit.tsx", { id: "blog-post-edit" }),
          route("/new", "features/blog/screens/admin/post-edit.tsx", { id: "blog-post-new" }),
        ]),
        
        // AI 상담 지식 관리 (관리자용)
        ...prefix("/chat", [
          route("/knowledge", "features/chat/screens/admin/knowledge-list.tsx"),
        ]),
        
        // 후기 인증 관리 (관리자용)
        ...prefix("/reviews", [
          index("features/review/screens/admin/review-list.tsx"),
        ]),
        
        // 후기 이벤트 관리 (관리자용)
        ...prefix("/events", [
          index("features/review/screens/admin/event-list.tsx"),
          route("/new", "features/review/screens/admin/event-form.tsx", { id: "event-new" }),
          route("/:id", "features/review/screens/admin/event-form.tsx", { id: "event-edit" }),
          route("/:id/submissions", "features/review/screens/admin/event-submissions.tsx"),
        ]),
        
        // 회원 관리 (관리자용)
        ...prefix("/members", [
          index("features/members/screens/member-list.tsx"),
          route("/:id", "features/members/screens/member-detail.tsx"),
        ]),
        
        // 외부 연동 관리
        ...prefix("/integrations", [
          route("/cafe24", "features/integrations/screens/cafe24-status.tsx"),
        ]),
      ]),
      
      // 계정 설정
      route("/account/edit", "features/users/screens/account.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
