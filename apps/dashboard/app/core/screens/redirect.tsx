/**
 * URL 리다이렉트 처리
 *
 * 기존 URL을 새 URL로 리다이렉트합니다.
 * URL 계층 구조 개선 시 기존 북마크/링크 호환성 유지를 위해 사용됩니다.
 */
import { redirect } from "react-router";
import type { Route } from "./+types/redirect";

// 리다이렉트 맵: 기존 URL -> 새 URL
const redirectMap: Record<string, string> = {
  "/dashboard/parent-products": "/dashboard/products/categories",
  "/dashboard/products-cafe24": "/dashboard/products/cafe24",
  "/dashboard/products-naver": "/dashboard/products/naver",
  "/dashboard/inventory-history": "/dashboard/inventory/history",
  // 주문 관리 통합 리다이렉트
  "/dashboard/orders": "/dashboard/orders/unified",
  "/dashboard/integrations/coupang/orders": "/dashboard/orders/unified?channel=coupang",
};

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const newPath = redirectMap[url.pathname];

  if (newPath) {
    // 쿼리 파라미터 유지
    return redirect(newPath + url.search, 301);
  }

  // 매핑되지 않은 경로는 대시보드로
  return redirect("/dashboard");
}

export default function RedirectPage() {
  // 서버에서 리다이렉트되므로 이 컴포넌트는 렌더링되지 않음
  return null;
}
