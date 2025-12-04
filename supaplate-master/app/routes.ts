/**
 * Sundayhug 통합 앱 라우트 설정
 * 
 * 👤 고객용 페이지 (/customer/*)
 *    - 서비스 허브 (홈)
 *    - 디지털 보증서 등록/조회
 *    - 수면 환경 분석기
 *    - 마이페이지 (보증서 + 분석 이력)
 *    - A/S 신청/조회
 * 
 * 🛠️ 관리자용 대시보드 (/dashboard/*)
 *    - 재고 관리
 *    - 주문 관리
 *    - 보증서 승인/관리
 * 
 * 🔐 통합 인증 시스템
 *    - 전화번호 OTP (Solapi 알림톡)
 *    - 카카오 로그인
 *    - 아이디/비밀번호
 * 
 * 업데이트 기록:
 * - 2025-11-27: 보증서 관리 시스템 추가
 * - 2025-12-01: 수면 분석기 통합, 전화번호 OTP 인증 추가
 * - 2025-12-01: 고객 프론트엔드 구조 재구성 (/customer/*)
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
    // 전화번호 OTP 인증 API
    ...prefix("/auth/phone", [
      route("/send-otp", "features/auth/api/send-otp.tsx"),
      route("/verify-otp", "features/auth/api/verify-otp.tsx"),
    ]),
    // 네이버 로그인 API
    route("/auth/naver/token", "features/auth/api/naver-token.tsx"),
    // 고객 회원 API
    ...prefix("/customer", [
      route("/member", "features/customer/api/member.tsx"),
    ]),
    // 보증서 API
    ...prefix("/warranty", [
      route("/upload-photo", "features/warranty/api/upload-photo.tsx"),
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
    ]),
    // 채팅 API
    ...prefix("/chat", [
      route("/send", "features/chat/api/send-message.tsx"),
    ]),
  ]),

  // ========================================
  // 고객용 페이지 (/customer/*)
  // ========================================
  ...prefix("/customer", [
    layout("features/customer/layouts/customer.layout.tsx", [
      // 서비스 허브 (메인)
      index("features/customer/screens/home.tsx"),
      
      // 보증서 서비스
      ...prefix("/warranty", [
        index("features/warranty/screens/public/register.tsx"),
        route("/view/:id", "features/warranty/screens/public/view.tsx"),
      ]),
      
      // 이벤트 후기 (사은품)
      route("/event/review", "features/customer/screens/event-review.tsx"),
      
      // 수면 분석 허브
      ...prefix("/sleep", [
        index("features/customer/screens/sleep-hub.tsx"),
        route("/analyze", "features/sleep-analysis/screens/analyze-public.tsx"),
        route("/result/:id", "features/sleep-analysis/screens/result.tsx", { id: "customer-sleep-result" }),
      ]),
      
      // 블로그 (준비 중 - 비활성화)
      // ...prefix("/blog", [
      //   index("features/customer/screens/blog/index.tsx"),
      //   route("/:postId", "features/customer/screens/blog/post.tsx"),
      // ]),
      
      // AI 육아 상담 (준비 중 - 비활성화)
      // ...prefix("/chat", [
      //   index("features/chat/screens/chat-list.tsx"),
      //   route("/baby-profile", "features/chat/screens/baby-profile.tsx"),
      //   route("/:sessionId", "features/chat/screens/chat-room.tsx"),
      // ]),
      
      // 통합 로그인/회원가입 (Supabase Auth)
      route("/login", "features/customer/screens/login.tsx"),
      route("/register", "features/customer/screens/register.tsx"),
      route("/auth/callback", "features/customer/screens/auth-callback.tsx"),
      // 카카오 로그인 (REST API + Supabase Auth 하이브리드)
      route("/kakao/callback", "features/customer/screens/kakao-callback.tsx", { id: "customer-kakao-callback" }),
      route("/naver/callback", "features/customer/screens/naver-callback.tsx"),
      
      // 마이페이지 (로그인 필요)
      ...prefix("/mypage", [
        index("features/customer/screens/mypage/index.tsx"),
        route("/profile", "features/customer/screens/mypage/profile.tsx"),
        route("/warranties", "features/customer/screens/mypage/warranties.tsx"),
        route("/warranty/:id", "features/customer/screens/mypage/warranty-detail.tsx"),
        route("/analyses", "features/customer/screens/mypage/analyses.tsx"),
        route("/as", "features/customer/screens/mypage/as-list.tsx"),
        route("/review", "features/customer/screens/mypage/review-submit.tsx"),
      ]),
      
      // A/S 신청
      route("/as/:warrantyId", "features/customer/screens/as-request.tsx"),
    ]),
  ]),
  
  // ========================================
  // 법적 문서 (레이아웃 없이 독립적)
  // ========================================
  route("/privacy", "features/customer/screens/privacy.tsx"),
  route("/terms", "features/customer/screens/terms.tsx"),

  // ========================================
  // 관리자 인증 라우트 (어드민용)
  // ========================================
  layout("core/layouts/navigation.layout.tsx", [
    // 루트(/) → /customer로 리다이렉트
    index("features/customer/screens/redirect-to-customer.tsx"),
    // 인증 확인
    route("/auth/confirm", "features/auth/screens/confirm.tsx"),
    
    // 에러 페이지
    route("/error", "core/screens/error.tsx"),

    // 비로그인 사용자용 라우트
    layout("core/layouts/public.layout.tsx", [
      route("/login", "features/auth/screens/login.tsx"),
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
        ...prefix("/review", [
          index("features/review/screens/admin/review-list.tsx"),
        ]),
      ]),
      
      // 계정 설정
      route("/account/edit", "features/users/screens/account.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
