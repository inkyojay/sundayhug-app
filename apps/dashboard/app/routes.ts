/**
 * 썬데이허그 관리자 대시보드 라우트
 *
 * 관리자용 대시보드 (/dashboard/*)
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
  // ===== 시스템 라우트 =====
  route("/robots.txt", "core/screens/robots.ts"),
  route("/sitemap.xml", "core/screens/sitemap.ts"),

  // ===== API 라우트 =====
  ...prefix("/api", [
    // ----- 설정 API -----
    ...prefix("/settings", [
      route("/theme", "features/settings/api/set-theme.tsx"),
      route("/locale", "features/settings/api/set-locale.tsx"),
    ]),

    // ----- 사용자 API -----
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

    // ----- 수면 분석 API -----
    ...prefix("/sleep", [
      route("/analyze", "features/sleep-analysis/api/analyze.tsx"),
      route("/analyze-from-url", "features/sleep-analysis/api/analyze-from-url.tsx"),
      route("/:id/slides", "features/sleep-analysis/api/slides.tsx"),
      route("/:id/share-card", "features/sleep-analysis/api/share-card.route.ts"),
      route("/seed-references", "features/sleep-analysis/api/seed-references.tsx"),
    ]),

    // ----- 블로그 API -----
    ...prefix("/blog", [
      route("/generate-audio", "features/blog/api/generate-audio.tsx"),
      route("/generate-thumbnail", "features/blog/api/generate-thumbnail.tsx"),
      route("/generate-slug", "features/blog/api/generate-slug.tsx"),
    ]),

    // ----- Cafe24 연동 API -----
    ...prefix("/integrations/cafe24", [
      route("/auth/start", "features/integrations/api/cafe24-auth-start.tsx"),
      route("/auth/callback", "features/integrations/api/cafe24-auth-callback.tsx"),
      route("/sync-orders", "features/integrations/api/cafe24-sync-orders.tsx"),
      route("/sync-products", "features/integrations/api/cafe24-sync-products.tsx"),
    ]),

    // ----- 네이버 커머스 연동 API -----
    ...prefix("/integrations/naver", [
      route("/auth/start", "features/integrations/api/naver-auth-start.tsx"),
      route("/disconnect", "features/integrations/api/naver-disconnect.tsx"),
      route("/sync-orders", "features/integrations/api/naver-sync-orders.tsx"),
      route("/sync-products", "features/integrations/api/naver-sync-products.tsx"),
    ]),

    // ----- 쿠팡 로켓그로스 연동 API -----
    ...prefix("/integrations/coupang", [
      route("/auth/save", "features/integrations/api/coupang-auth-save.tsx"),
      route("/sync-orders", "features/integrations/api/coupang-sync-orders.tsx"),
      route("/sync-products", "features/integrations/api/coupang-sync-products.tsx"),
      route("/sync-inventory", "features/integrations/api/coupang-sync-inventory.tsx"),
    ]),

    // ----- 재고 위치 API -----
    route("/inventory-locations", "features/inventory/api/inventory-locations.tsx"),

    // ----- B2B 문서 생성 API -----
    ...prefix("/b2b", [
      route("/generate-document", "features/b2b/api/generate-document.tsx"),
    ]),
  ]),

  // ===== 인증 라우트 =====
  layout("core/layouts/navigation.layout.tsx", [
    // 루트(/) -> /dashboard로 리다이렉트
    index("features/users/screens/redirect-to-dashboard.tsx"),
    // 인증 확인
    route("/auth/confirm", "features/auth/screens/confirm.tsx"),

    // 에러 페이지
    route("/error", "core/screens/error.tsx"),

    // ----- 비로그인 사용자용 라우트 -----
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

    // ----- 로그인 사용자용 라우트 -----
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

  // ===== 관리자 대시보드 (/dashboard/*) - 로그인 필수 =====
  layout("core/layouts/private.layout.tsx", { id: "private-dashboard" }, [
    layout("features/users/layouts/dashboard.layout.tsx", [
      ...prefix("/dashboard", [
        // ===== 메인 대시보드 =====
        index("features/users/screens/dashboard.tsx"),

        // ===== 기존 URL 리다이렉트 (하위 호환성) =====
        route("/parent-products", "core/screens/redirect.tsx", { id: "redirect-parent-products" }),
        route("/products-cafe24", "core/screens/redirect.tsx", { id: "redirect-products-cafe24" }),
        route("/products-naver", "core/screens/redirect.tsx", { id: "redirect-products-naver" }),
        route("/inventory-history", "core/screens/redirect.tsx", { id: "redirect-inventory-history" }),
        // 주문 관리 통합 리다이렉트 (B2C 주문 -> 통합 주문)
        route("/orders", "core/screens/redirect.tsx", { id: "redirect-orders" }),

        // ===== 제품 관리 =====
        ...prefix("/products", [
          // 제품 목록
          index("features/products/screens/products.tsx"),
          // 제품 분류 (Parent SKU)
          route("/categories", "features/parent-products/screens/parent-products.tsx"),
          // 카페24 제품 리스트
          route("/cafe24", "features/products-cafe24/screens/cafe24-products.tsx"),
          // 네이버 스마트스토어 제품 리스트
          route("/naver", "features/products-naver/screens/naver-products.tsx"),
        ]),

        // ===== 재고/물류 관리 =====
        ...prefix("/inventory", [
          // 재고 현황
          index("features/inventory/screens/inventory.tsx"),
          // 재고 이력
          route("/history", "features/inventory/screens/inventory-history.tsx"),
        ]),
        // 창고 관리
        route("/warehouses", "features/warehouses/screens/warehouse-list.tsx"),
        // 공장 관리
        ...prefix("/factories", [
          index("features/factories/screens/factory-list.tsx"),
          route("/:factoryId/costs", "features/factories/screens/factory-product-costs.tsx"),
        ]),
        // 발주 관리
        ...prefix("/purchase-orders", [
          index("features/purchase-orders/screens/purchase-order-list.tsx"),
          route("/new", "features/purchase-orders/screens/purchase-order-form.tsx", { id: "po-new" }),
          route("/:id", "features/purchase-orders/screens/purchase-order-form.tsx", { id: "po-edit" }),
        ]),
        // 입고 관리
        route("/stock-receipts", "features/stock-receipts/screens/stock-receipt-list.tsx"),
        // 재고 이동
        route("/stock-transfers", "features/stock-transfers/screens/stock-transfer-list.tsx"),
        // 교환/반품/AS
        ...prefix("/returns", [
          index("features/returns/screens/returns-list.tsx"),
          route("/new", "features/returns/screens/returns-form.tsx", { id: "returns-new" }),
          route("/:id/edit", "features/returns/screens/returns-form.tsx", { id: "returns-edit" }),
        ]),

        // ===== 주문 관리 =====
        // 통합 주문 관리 (Cafe24 + 네이버 + 쿠팡) - 기본 주문 화면
        route("/orders/unified", "features/orders-unified/screens/orders-unified.tsx"),
        // 기존 B2C 주문 화면은 /dashboard/orders에서 리다이렉트 처리 (상단 리다이렉트 섹션 참조)
        // B2B 주문 관리
        ...prefix("/b2b", [
          // 업체 관리
          ...prefix("/customers", [
            index("features/b2b/screens/b2b-customer-list.tsx"),
            route("/new", "features/b2b/screens/b2b-customer-form.tsx", { id: "b2b-customer-new" }),
            route("/:id", "features/b2b/screens/b2b-customer-form.tsx", { id: "b2b-customer-edit" }),
            route("/:id/prices", "features/b2b/screens/b2b-customer-prices.tsx"),
          ]),
          // B2B 주문 관리
          ...prefix("/orders", [
            index("features/b2b/screens/b2b-order-list.tsx"),
            route("/new", "features/b2b/screens/b2b-order-form.tsx", { id: "b2b-order-new" }),
            route("/:id", "features/b2b/screens/b2b-order-detail.tsx"),
            route("/:id/edit", "features/b2b/screens/b2b-order-form.tsx", { id: "b2b-order-edit" }),
            route("/:id/shipment", "features/b2b/screens/b2b-shipment-form.tsx"),
          ]),
        ]),

        // ===== 고객/회원 관리 =====
        // 고객 분석
        route("/customer-analytics", "features/customer-analytics/screens/customer-analytics.tsx"),
        // 회원 관리
        ...prefix("/members", [
          index("features/members/screens/member-list.tsx"),
          route("/:id", "features/members/screens/member-detail.tsx"),
        ]),

        // ===== 보증서 관리 =====
        ...prefix("/warranty", [
          index("features/warranty/screens/warranty-list.tsx"),
          route("/pending", "features/warranty/screens/warranty-pending.tsx"),
          route("/as", "features/warranty/screens/as-list.tsx"),
          route("/:id", "features/warranty/screens/warranty-detail.tsx"),
        ]),

        // ===== 수면 분석 관리 =====
        ...prefix("/sleep", [
          index("features/sleep-analysis/screens/analyze.tsx"),
          route("/history", "features/sleep-analysis/screens/history.tsx"),
          route("/result/:id", "features/sleep-analysis/screens/result.tsx", { id: "dashboard-sleep-result" }),
        ]),

        // ===== 콘텐츠 관리 =====
        // 블로그 관리
        ...prefix("/blog", [
          index("features/blog/screens/admin/posts-list.tsx"),
          route("/:postId/edit", "features/blog/screens/admin/post-edit.tsx", { id: "blog-post-edit" }),
          route("/new", "features/blog/screens/admin/post-edit.tsx", { id: "blog-post-new" }),
        ]),
        // AI 상담 지식 관리
        ...prefix("/chat", [
          route("/knowledge", "features/chat/screens/admin/knowledge-list.tsx"),
        ]),

        // ===== 후기/이벤트 관리 =====
        // 후기 인증 관리
        ...prefix("/reviews", [
          index("features/review/screens/admin/review-list.tsx"),
        ]),
        // 이벤트 관리
        ...prefix("/events", [
          index("features/review/screens/admin/event-list.tsx"),
          route("/new", "features/review/screens/admin/event-form.tsx", { id: "event-new" }),
          route("/:id", "features/review/screens/admin/event-form.tsx", { id: "event-edit" }),
          route("/:id/submissions", "features/review/screens/admin/event-submissions.tsx"),
        ]),

        // ===== 외부 연동 관리 =====
        ...prefix("/integrations", [
          route("/cafe24", "features/integrations/screens/cafe24-status.tsx"),
          route("/naver", "features/integrations/screens/naver-status.tsx"),
          route("/coupang", "features/integrations/screens/coupang-status.tsx"),
          route("/coupang/products", "features/integrations/screens/coupang-products.tsx"),
          route("/coupang/inventory", "features/integrations/screens/coupang-inventory.tsx"),
          // 쿠팡 주문은 통합 주문으로 리다이렉트
          route("/coupang/orders", "core/screens/redirect.tsx", { id: "redirect-coupang-orders" }),
        ]),
      ]),

      // ===== 계정 설정 =====
      route("/account/edit", "features/users/screens/account.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
