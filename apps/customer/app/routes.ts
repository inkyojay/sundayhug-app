/**
 * 썬데이허그 고객 앱 라우트
 * 
 * 👤 고객용 페이지 (/customer/*)
 *    - 서비스 허브 (홈)
 *    - 디지털 보증서 등록/조회
 *    - 수면 환경 분석기
 *    - 마이페이지 (보증서 + 분석 이력)
 *    - A/S 신청/조회
 *    - 블로그, AI 육아 상담
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
      route("/:id/instagram-card", "features/sleep-analysis/api/instagram-card.tsx"),
      route("/seed-references", "features/sleep-analysis/api/seed-references.tsx"),
    ]),
    // 블로그 API
    ...prefix("/blog", [
      route("/generate-audio", "features/blog/api/generate-audio.tsx"),
      route("/generate-thumbnail", "features/blog/api/generate-thumbnail.tsx"),
      route("/generate-slug", "features/blog/api/generate-slug.tsx"),
    ]),
    // 채팅 API
    ...prefix("/chat", [
      route("/send", "features/chat/api/send-message.tsx"),
      route("/tts", "features/chat/api/text-to-speech.tsx"),
      route("/stt", "features/chat/api/speech-to-text.tsx"),
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
      
      // 블로그
      ...prefix("/blog", [
        index("features/customer/screens/blog/index.tsx"),
        route("/:postId", "features/customer/screens/blog/post.tsx"),
      ]),
      
      // AI 육아 상담
      ...prefix("/chat", [
        index("features/chat/screens/chat-list.tsx"),
        route("/baby-profile", "features/chat/screens/baby-profile.tsx"),
        route("/:sessionId", "features/chat/screens/chat-room.tsx"),
      ]),
      
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
        route("/review-submit", "features/customer/screens/mypage/review-submit.tsx"),
        route("/points", "features/customer/screens/mypage/points.tsx"),
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

  // 루트(/) → /customer로 리다이렉트
  layout("core/layouts/navigation.layout.tsx", [
    index("features/customer/screens/redirect-to-customer.tsx"),
  ]),
] satisfies RouteConfig;
