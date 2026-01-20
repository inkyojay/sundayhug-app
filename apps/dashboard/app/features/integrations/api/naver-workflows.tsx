/**
 * 네이버 재고 자동 할당 워크플로우 API
 *
 * POST /api/integrations/naver/workflows
 *
 * 워크플로우 CRUD 및 실행
 */
import { data } from "react-router";
import type { Route } from "./+types/naver-workflows";

export async function loader({ request }: Route.LoaderArgs) {
  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  // 워크플로우 목록 조회
  const { data: workflows, error: workflowsError } = await adminClient
    .from("naver_inventory_workflows")
    .select("*")
    .order("created_at", { ascending: false });

  // 최근 실행 로그 조회 (최근 50개)
  const { data: logs, error: logsError } = await adminClient
    .from("naver_inventory_workflow_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(50);

  if (workflowsError || logsError) {
    return data({
      success: false,
      error: workflowsError?.message || logsError?.message,
      workflows: [],
      logs: [],
    });
  }

  return data({
    success: true,
    workflows: workflows || [],
    logs: logs || [],
  });
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("action") as string;

  const { createAdminClient } = await import("~/core/lib/supa-admin.server");
  const adminClient = createAdminClient();

  try {
    switch (actionType) {
      // ============ 워크플로우 생성 ============
      case "create_workflow": {
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const scheduleType = formData.get("scheduleType") as string;
        const scheduleTime = formData.get("scheduleTime") as string;
        const scheduleDaysStr = formData.get("scheduleDays") as string;
        const allocationPercent = formData.get("allocationPercent") as string;

        if (!name || !scheduleTime || !allocationPercent) {
          return data({ success: false, error: "필수 값이 누락되었습니다" }, { status: 400 });
        }

        let scheduleDays = null;
        if (scheduleType === "weekly" && scheduleDaysStr) {
          try {
            scheduleDays = JSON.parse(scheduleDaysStr);
          } catch {
            return data({ success: false, error: "요일 파싱 실패" }, { status: 400 });
          }
        }

        // 다음 실행 시간 계산
        const nextRunAt = calculateNextRunAt(scheduleType, scheduleTime, scheduleDays);

        const { data: workflow, error } = await adminClient
          .from("naver_inventory_workflows")
          .insert({
            name,
            description: description || null,
            schedule_type: scheduleType,
            schedule_time: scheduleTime,
            schedule_days: scheduleDays,
            allocation_percent: parseInt(allocationPercent),
            is_active: true,
            next_run_at: nextRunAt,
          })
          .select()
          .single();

        if (error) {
          console.error("워크플로우 생성 오류:", error);
          return data({ success: false, error: error.message }, { status: 500 });
        }

        return data({
          success: true,
          message: "워크플로우가 생성되었습니다",
          workflow,
        });
      }

      // ============ 워크플로우 수정 ============
      case "update_workflow": {
        const workflowId = formData.get("workflowId") as string;
        const name = formData.get("name") as string;
        const description = formData.get("description") as string;
        const scheduleType = formData.get("scheduleType") as string;
        const scheduleTime = formData.get("scheduleTime") as string;
        const scheduleDaysStr = formData.get("scheduleDays") as string;
        const allocationPercent = formData.get("allocationPercent") as string;

        if (!workflowId || !name || !scheduleTime || !allocationPercent) {
          return data({ success: false, error: "필수 값이 누락되었습니다" }, { status: 400 });
        }

        let scheduleDays = null;
        if (scheduleType === "weekly" && scheduleDaysStr) {
          try {
            scheduleDays = JSON.parse(scheduleDaysStr);
          } catch {
            return data({ success: false, error: "요일 파싱 실패" }, { status: 400 });
          }
        }

        const nextRunAt = calculateNextRunAt(scheduleType, scheduleTime, scheduleDays);

        const { error } = await adminClient
          .from("naver_inventory_workflows")
          .update({
            name,
            description: description || null,
            schedule_type: scheduleType,
            schedule_time: scheduleTime,
            schedule_days: scheduleDays,
            allocation_percent: parseInt(allocationPercent),
            next_run_at: nextRunAt,
          })
          .eq("id", workflowId);

        if (error) {
          console.error("워크플로우 수정 오류:", error);
          return data({ success: false, error: error.message }, { status: 500 });
        }

        return data({ success: true, message: "워크플로우가 수정되었습니다" });
      }

      // ============ 워크플로우 활성화/비활성화 ============
      case "toggle_workflow": {
        const workflowId = formData.get("workflowId") as string;
        const isActive = formData.get("isActive") === "true";

        if (!workflowId) {
          return data({ success: false, error: "workflowId가 필요합니다" }, { status: 400 });
        }

        // 활성화할 때 다음 실행 시간 재계산
        let updateData: any = { is_active: isActive };
        if (isActive) {
          const { data: workflow } = await adminClient
            .from("naver_inventory_workflows")
            .select("schedule_type, schedule_time, schedule_days")
            .eq("id", workflowId)
            .single();

          if (workflow) {
            updateData.next_run_at = calculateNextRunAt(
              workflow.schedule_type,
              workflow.schedule_time,
              workflow.schedule_days
            );
          }
        }

        const { error } = await adminClient
          .from("naver_inventory_workflows")
          .update(updateData)
          .eq("id", workflowId);

        if (error) {
          console.error("워크플로우 상태 변경 오류:", error);
          return data({ success: false, error: error.message }, { status: 500 });
        }

        return data({
          success: true,
          message: isActive ? "워크플로우가 활성화되었습니다" : "워크플로우가 비활성화되었습니다",
        });
      }

      // ============ 워크플로우 삭제 ============
      case "delete_workflow": {
        const workflowId = formData.get("workflowId") as string;

        if (!workflowId) {
          return data({ success: false, error: "workflowId가 필요합니다" }, { status: 400 });
        }

        const { error } = await adminClient
          .from("naver_inventory_workflows")
          .delete()
          .eq("id", workflowId);

        if (error) {
          console.error("워크플로우 삭제 오류:", error);
          return data({ success: false, error: error.message }, { status: 500 });
        }

        return data({ success: true, message: "워크플로우가 삭제되었습니다" });
      }

      // ============ 워크플로우 수동 실행 ============
      case "run_workflow": {
        const workflowId = formData.get("workflowId") as string;

        if (!workflowId) {
          return data({ success: false, error: "workflowId가 필요합니다" }, { status: 400 });
        }

        // 워크플로우 정보 조회
        const { data: workflow, error: workflowError } = await adminClient
          .from("naver_inventory_workflows")
          .select("*")
          .eq("id", workflowId)
          .single();

        if (workflowError || !workflow) {
          return data({ success: false, error: "워크플로우를 찾을 수 없습니다" }, { status: 404 });
        }

        // 실행 로그 생성
        const { data: log, error: logError } = await adminClient
          .from("naver_inventory_workflow_logs")
          .insert({
            workflow_id: workflowId,
            status: "running",
          })
          .select()
          .single();

        if (logError) {
          console.error("실행 로그 생성 오류:", logError);
          return data({ success: false, error: "실행 로그 생성 실패" }, { status: 500 });
        }

        // 실제 재고 할당 실행
        const result = await executeWorkflow(adminClient, workflow, log.id);

        return data({
          success: true,
          message: result.success ? "워크플로우가 실행되었습니다" : "워크플로우 실행 중 오류 발생",
          result,
        });
      }

      default:
        return data({ success: false, error: `알 수 없는 액션: ${actionType}` }, { status: 400 });
    }
  } catch (error) {
    console.error("❌ 워크플로우 API 오류:", error);
    return data(
      {
        success: false,
        error: error instanceof Error ? error.message : "처리 중 오류가 발생했습니다",
      },
      { status: 500 }
    );
  }
}

/**
 * 다음 실행 시간 계산
 */
function calculateNextRunAt(
  scheduleType: string,
  scheduleTime: string,
  scheduleDays: number[] | null
): string {
  const now = new Date();
  const [hours, minutes] = scheduleTime.split(":").map(Number);

  // KST 기준으로 계산
  const kstOffset = 9 * 60; // KST = UTC+9
  const utcNow = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const kstNow = new Date(utcNow.getTime() + kstOffset * 60000);

  // 오늘 실행 시간 (KST)
  const todayRun = new Date(kstNow);
  todayRun.setHours(hours, minutes, 0, 0);

  let nextRun: Date;

  if (scheduleType === "daily") {
    // 오늘 시간이 지났으면 내일
    if (kstNow > todayRun) {
      nextRun = new Date(todayRun.getTime() + 24 * 60 * 60 * 1000);
    } else {
      nextRun = todayRun;
    }
  } else if (scheduleType === "weekly" && scheduleDays && scheduleDays.length > 0) {
    // 다음 실행 요일 찾기
    const currentDay = kstNow.getDay();
    let daysUntilNext = -1;

    // 오늘이 실행 요일이고 시간이 안 지났으면 오늘
    if (scheduleDays.includes(currentDay) && kstNow <= todayRun) {
      daysUntilNext = 0;
    } else {
      // 다음 실행 요일 찾기
      for (let i = 1; i <= 7; i++) {
        const checkDay = (currentDay + i) % 7;
        if (scheduleDays.includes(checkDay)) {
          daysUntilNext = i;
          break;
        }
      }
    }

    nextRun = new Date(todayRun.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
  } else {
    // 기본값: 내일 같은 시간
    nextRun = new Date(todayRun.getTime() + 24 * 60 * 60 * 1000);
  }

  // KST를 UTC로 변환하여 반환
  const utcNextRun = new Date(nextRun.getTime() - kstOffset * 60000);
  return utcNextRun.toISOString();
}

/**
 * 워크플로우 실행
 */
async function executeWorkflow(
  adminClient: any,
  workflow: any,
  logId: string
): Promise<{ success: boolean; optionsUpdated: number; optionsFailed: number; error?: string }> {
  try {
    // 1. 창고 재고 조회
    const { data: inventorySummary } = await adminClient
      .from("inventory_summary")
      .select("sku, current_stock");

    const warehouseStockMap: Record<string, number> = {};
    (inventorySummary || []).forEach((item: { sku: string; current_stock: number }) => {
      warehouseStockMap[item.sku] = item.current_stock;
    });

    // 2. 모든 네이버 옵션 조회
    const { data: options } = await adminClient
      .from("naver_product_options")
      .select("origin_product_no, option_combination_id, internal_sku, seller_management_code, stock_quantity");

    if (!options || options.length === 0) {
      await adminClient
        .from("naver_inventory_workflow_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          options_updated: 0,
          options_failed: 0,
        })
        .eq("id", logId);

      return { success: true, optionsUpdated: 0, optionsFailed: 0 };
    }

    // 3. 업데이트할 옵션 목록 생성
    const updates: { originProductNo: number; optionCombinationId: number; stockQuantity: number }[] = [];

    for (const opt of options) {
      const sku = opt.internal_sku || opt.seller_management_code;
      if (!sku || warehouseStockMap[sku] === undefined) continue;

      const newStock = Math.floor(warehouseStockMap[sku] * (workflow.allocation_percent / 100));
      if (newStock !== opt.stock_quantity) {
        updates.push({
          originProductNo: opt.origin_product_no,
          optionCombinationId: opt.option_combination_id,
          stockQuantity: newStock,
        });
      }
    }

    if (updates.length === 0) {
      await adminClient
        .from("naver_inventory_workflow_logs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          options_updated: 0,
          options_failed: 0,
        })
        .eq("id", logId);

      return { success: true, optionsUpdated: 0, optionsFailed: 0 };
    }

    // 4. 네이버 API 호출
    const products = await import("../lib/naver/naver-products.server");

    // 상품별로 그룹핑
    const productOptionsMap = new Map<number, { optionCombinationId: number; stockQuantity: number }[]>();
    for (const update of updates) {
      const existing = productOptionsMap.get(update.originProductNo) || [];
      existing.push({
        optionCombinationId: update.optionCombinationId,
        stockQuantity: update.stockQuantity,
      });
      productOptionsMap.set(update.originProductNo, existing);
    }

    const productUpdates = Array.from(productOptionsMap.entries()).map(([originProductNo, opts]) => ({
      originProductNo,
      options: opts,
    }));

    const results = await products.updateProductOptionStockBulk(productUpdates);
    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // 5. 워크플로우 상태 업데이트
    const nextRunAt = calculateNextRunAt(
      workflow.schedule_type,
      workflow.schedule_time,
      workflow.schedule_days
    );

    await adminClient
      .from("naver_inventory_workflows")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: failCount === 0 ? "success" : "failed",
        last_run_message: `${successCount}개 성공, ${failCount}개 실패`,
        next_run_at: nextRunAt,
      })
      .eq("id", workflow.id);

    // 6. 로그 업데이트
    await adminClient
      .from("naver_inventory_workflow_logs")
      .update({
        status: failCount === 0 ? "success" : "failed",
        completed_at: new Date().toISOString(),
        options_updated: successCount,
        options_failed: failCount,
        details: { updates: updates.length, productUpdates: productUpdates.length },
      })
      .eq("id", logId);

    return { success: true, optionsUpdated: successCount, optionsFailed: failCount };
  } catch (error) {
    console.error("워크플로우 실행 오류:", error);

    await adminClient
      .from("naver_inventory_workflow_logs")
      .update({
        status: "failed",
        completed_at: new Date().toISOString(),
        error_message: error instanceof Error ? error.message : "알 수 없는 오류",
      })
      .eq("id", logId);

    await adminClient
      .from("naver_inventory_workflows")
      .update({
        last_run_at: new Date().toISOString(),
        last_run_status: "failed",
        last_run_message: error instanceof Error ? error.message : "알 수 없는 오류",
      })
      .eq("id", workflow.id);

    return {
      success: false,
      optionsUpdated: 0,
      optionsFailed: 0,
      error: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}
