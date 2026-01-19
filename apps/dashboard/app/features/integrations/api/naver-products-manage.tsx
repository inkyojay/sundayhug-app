/**
 * 네이버 상품 관리 API
 *
 * POST /api/integrations/naver/products/manage
 *
 * 상품 등록/수정/삭제
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-products-manage";

export async function loader({ request }: Route.LoaderArgs) {
  return data({
    message: "POST 요청으로 상품 관리를 진행하세요",
    supportedActions: ["create", "update", "delete", "update_stock", "update_option_stock"],
    requiredParams: {
      create: ["productData (JSON)"],
      update: ["originProductNo", "productData (JSON)"],
      delete: ["originProductNo"],
      update_stock: ["originProductNo", "stockQuantity"],
      update_option_stock: ["originProductNo", "options (JSON array)"],
    },
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  if (!actionType) {
    return data({ success: false, error: "action이 필요합니다" }, { status: 400 });
  }

  try {
    const products = await import("../lib/naver/naver-products.server");

    switch (actionType) {
      // ============ 상품 등록 ============
      case "create": {
        const productDataStr = formData.get("productData") as string;
        if (!productDataStr) {
          return data({ success: false, error: "productData가 필요합니다" }, { status: 400 });
        }

        let productData;
        try {
          productData = JSON.parse(productDataStr);
        } catch {
          return data({ success: false, error: "productData JSON 파싱 실패" }, { status: 400 });
        }

        const result = await products.createProduct(productData);

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "상품이 등록되었습니다",
          originProductNo: result.originProductNo,
          smartstoreChannelProductNo: result.smartstoreChannelProductNo,
        });
      }

      // ============ 상품 수정 ============
      case "update": {
        const originProductNo = formData.get("originProductNo");
        const productDataStr = formData.get("productData") as string;

        if (!originProductNo) {
          return data({ success: false, error: "originProductNo가 필요합니다" }, { status: 400 });
        }
        if (!productDataStr) {
          return data({ success: false, error: "productData가 필요합니다" }, { status: 400 });
        }

        let productData;
        try {
          productData = JSON.parse(productDataStr);
        } catch {
          return data({ success: false, error: "productData JSON 파싱 실패" }, { status: 400 });
        }

        const result = await products.updateProduct({
          originProductNo: Number(originProductNo),
          ...productData,
        });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "상품이 수정되었습니다",
          originProductNo: Number(originProductNo),
        });
      }

      // ============ 상품 삭제 ============
      case "delete": {
        const originProductNo = formData.get("originProductNo");

        if (!originProductNo) {
          return data({ success: false, error: "originProductNo가 필요합니다" }, { status: 400 });
        }

        const result = await products.deleteProduct(Number(originProductNo));

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "상품이 삭제되었습니다",
          originProductNo: Number(originProductNo),
        });
      }

      // ============ 재고 수정 (단일 상품) ============
      case "update_stock": {
        const originProductNo = formData.get("originProductNo");
        const stockQuantity = formData.get("stockQuantity");

        if (!originProductNo) {
          return data({ success: false, error: "originProductNo가 필요합니다" }, { status: 400 });
        }
        if (stockQuantity === null || stockQuantity === undefined) {
          return data({ success: false, error: "stockQuantity가 필요합니다" }, { status: 400 });
        }

        const result = await products.updateProductStock(
          Number(originProductNo),
          Number(stockQuantity)
        );

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "재고가 수정되었습니다",
          originProductNo: Number(originProductNo),
          stockQuantity: Number(stockQuantity),
        });
      }

      // ============ 옵션 재고/가격 수정 ============
      case "update_option_stock": {
        const originProductNo = formData.get("originProductNo");
        const optionsStr = formData.get("options") as string;

        if (!originProductNo) {
          return data({ success: false, error: "originProductNo가 필요합니다" }, { status: 400 });
        }
        if (!optionsStr) {
          return data({ success: false, error: "options가 필요합니다" }, { status: 400 });
        }

        let options;
        try {
          options = JSON.parse(optionsStr);
        } catch {
          return data({ success: false, error: "options JSON 파싱 실패" }, { status: 400 });
        }

        if (!Array.isArray(options) || options.length === 0) {
          return data({ success: false, error: "options는 배열이어야 합니다" }, { status: 400 });
        }

        const result = await products.updateProductOptionStock(Number(originProductNo), options);

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "옵션 재고/가격이 수정되었습니다",
          originProductNo: Number(originProductNo),
          updatedOptions: options.length,
        });
      }

      default:
        return data(
          { success: false, error: `알 수 없는 액션입니다: ${actionType}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("❌ 상품 관리 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}
