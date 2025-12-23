/**
 * 네이버 상품 동기화 API
 * 
 * POST /api/integrations/naver/sync-products
 * 네이버 스마트스토어 상품 정보를 조회합니다.
 */
import { data } from "react-router";

import type { Route } from "./+types/naver-sync-products";

/**
 * POST - 상품 동기화 (조회)
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const page = parseInt(formData.get("page") as string) || 1;
  const size = parseInt(formData.get("size") as string) || 100;

  console.log("📦 네이버 상품 조회 시작...");

  try {
    // 동적 import로 서버 전용 모듈 로드
    const { getProducts } = await import("../lib/naver.server");
    
    const result = await getProducts({ page, size });

    if (!result.success) {
      console.error("❌ 상품 조회 실패:", result.error);
      return data({
        success: false,
        error: result.error,
      }, { status: 500 });
    }

    console.log(`✅ 네이버 상품 조회 완료: ${result.count}개`);

    return data({
      success: true,
      products: result.products,
      count: result.count,
    });
  } catch (error) {
    console.error("❌ 상품 조회 중 오류:", error);
    return data({
      success: false,
      error: "상품 조회 중 오류가 발생했습니다.",
    }, { status: 500 });
  }
}

/**
 * GET - API 정보
 */
export async function loader() {
  return data({
    message: "POST /api/integrations/naver/sync-products",
    description: "네이버 스마트스토어 상품을 조회합니다.",
  });
}

