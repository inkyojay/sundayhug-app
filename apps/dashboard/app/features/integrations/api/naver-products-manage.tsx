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
    supportedActions: [
      "create",
      "update",
      "delete",
      "update_stock",
      "update_option_stock",
      "change_status",
      "change_status_bulk",
      "bulk_update",
      "update_stock_bulk",
      "update_option_stock_bulk",
    ],
    requiredParams: {
      create: ["productData (JSON)"],
      update: ["originProductNo", "productData (JSON)"],
      delete: ["originProductNo"],
      update_stock: ["originProductNo", "stockQuantity"],
      update_option_stock: ["originProductNo", "options (JSON array)"],
      change_status: ["originProductNo", "statusType", "changeReason (optional)"],
      change_status_bulk: ["products (JSON array: [{originProductNo, statusType, changeReason?}])"],
      bulk_update: ["bulkUpdateType", "originProductNos (JSON array)", "updateData (JSON)"],
      update_stock_bulk: ["products (JSON array: [{originProductNo, stockQuantity}])"],
      update_option_stock_bulk: ["options (JSON array: [{originProductNo, optionCombinationId, stockQuantity}])"],
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

      // ============ 상품 상태 변경 (단일) ============
      case "change_status": {
        const originProductNo = formData.get("originProductNo");
        const statusType = formData.get("statusType") as string;
        const changeReason = formData.get("changeReason") as string | null;

        if (!originProductNo) {
          return data({ success: false, error: "originProductNo가 필요합니다" }, { status: 400 });
        }
        if (!statusType) {
          return data({ success: false, error: "statusType이 필요합니다" }, { status: 400 });
        }

        const result = await products.changeProductStatus(
          Number(originProductNo),
          statusType as any,
          changeReason || undefined
        );

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        return data({
          success: true,
          message: "상품 상태가 변경되었습니다",
          originProductNo: Number(originProductNo),
          statusType,
        });
      }

      // ============ 상품 상태 변경 (일괄) ============
      case "change_status_bulk": {
        const productsStr = formData.get("products") as string;

        if (!productsStr) {
          return data({ success: false, error: "products가 필요합니다" }, { status: 400 });
        }

        let productList;
        try {
          productList = JSON.parse(productsStr);
        } catch {
          return data({ success: false, error: "products JSON 파싱 실패" }, { status: 400 });
        }

        if (!Array.isArray(productList) || productList.length === 0) {
          return data({ success: false, error: "products는 배열이어야 합니다" }, { status: 400 });
        }

        const results = await products.changeProductStatusBulk(productList);
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return data({
          success: true,
          message: `${successCount}개 성공, ${failCount}개 실패`,
          results,
          successCount,
          failCount,
        });
      }

      // ============ 대량 상품 수정 ============
      case "bulk_update": {
        const bulkUpdateType = formData.get("bulkUpdateType") as string;
        const originProductNosStr = formData.get("originProductNos") as string;
        const updateDataStr = formData.get("updateData") as string;

        if (!bulkUpdateType) {
          return data({ success: false, error: "bulkUpdateType이 필요합니다" }, { status: 400 });
        }
        if (!originProductNosStr) {
          return data({ success: false, error: "originProductNos가 필요합니다" }, { status: 400 });
        }
        if (!updateDataStr) {
          return data({ success: false, error: "updateData가 필요합니다" }, { status: 400 });
        }

        let originProductNos;
        let updateData;
        try {
          originProductNos = JSON.parse(originProductNosStr);
          updateData = JSON.parse(updateDataStr);
        } catch {
          return data({ success: false, error: "JSON 파싱 실패" }, { status: 400 });
        }

        if (!Array.isArray(originProductNos) || originProductNos.length === 0) {
          return data({ success: false, error: "originProductNos는 배열이어야 합니다" }, { status: 400 });
        }

        const result = await products.bulkUpdateProducts({
          bulkUpdateType: bulkUpdateType as any,
          originProductNos,
          updateData,
        });

        if (!result.success) {
          return data({ success: false, error: result.error }, { status: 500 });
        }

        const successCount = result.results?.filter((r) => r.success).length || 0;
        const failCount = result.results?.filter((r) => !r.success).length || 0;

        return data({
          success: true,
          message: `${successCount}개 성공, ${failCount}개 실패`,
          results: result.results,
          successCount,
          failCount,
        });
      }

      // ============ 재고 일괄 수정 ============
      case "update_stock_bulk": {
        const productsStr = formData.get("products") as string;

        if (!productsStr) {
          return data({ success: false, error: "products가 필요합니다" }, { status: 400 });
        }

        let productList;
        try {
          productList = JSON.parse(productsStr);
        } catch {
          return data({ success: false, error: "products JSON 파싱 실패" }, { status: 400 });
        }

        if (!Array.isArray(productList) || productList.length === 0) {
          return data({ success: false, error: "products는 배열이어야 합니다" }, { status: 400 });
        }

        const results = await products.updateProductStockBulk(productList);
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return data({
          success: true,
          message: `${successCount}개 성공, ${failCount}개 실패`,
          results,
          successCount,
          failCount,
        });
      }

      // ============ 옵션 재고 일괄 수정 ============
      case "update_option_stock_bulk": {
        const optionsStr = formData.get("options") as string;

        if (!optionsStr) {
          return data({ success: false, error: "options가 필요합니다" }, { status: 400 });
        }

        let optionsList: { originProductNo: number; optionCombinationId: number; stockQuantity: number }[];
        try {
          optionsList = JSON.parse(optionsStr);
        } catch {
          return data({ success: false, error: "options JSON 파싱 실패" }, { status: 400 });
        }

        if (!Array.isArray(optionsList) || optionsList.length === 0) {
          return data({ success: false, error: "options는 배열이어야 합니다" }, { status: 400 });
        }

        // 상품별로 옵션 그룹핑
        const productOptionsMap = new Map<number, { optionCombinationId: number; stockQuantity: number }[]>();
        for (const opt of optionsList) {
          const existing = productOptionsMap.get(opt.originProductNo) || [];
          existing.push({
            optionCombinationId: opt.optionCombinationId,
            stockQuantity: opt.stockQuantity,
          });
          productOptionsMap.set(opt.originProductNo, existing);
        }

        // 상품별로 일괄 업데이트
        const productUpdates = Array.from(productOptionsMap.entries()).map(([originProductNo, options]) => ({
          originProductNo,
          options,
        }));

        const results = await products.updateProductOptionStockBulk(productUpdates);
        const successCount = results.filter((r) => r.success).length;
        const failCount = results.filter((r) => !r.success).length;

        return data({
          success: true,
          message: `${successCount}개 상품 옵션 재고 수정 (${optionsList.length}개 옵션)`,
          results,
          successCount,
          failCount,
          totalOptions: optionsList.length,
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
