/**
 * 쿠팡 로켓그로스 인증 정보 저장 API
 *
 * POST: 인증 정보 저장/업데이트
 */

import type { Route } from "./+types/coupang-auth-save";
import { createClient } from "@supabase/supabase-js";
import { getCoupangProducts, type CoupangCredentials } from "../lib/coupang.server";

export async function action({ request }: Route.ActionArgs) {
  const adminClient = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const formData = await request.formData();
  const intent = formData.get("intent") as string;

  // 인증 정보 저장
  if (intent === "save") {
    const vendorId = formData.get("vendor_id") as string;
    const vendorName = formData.get("vendor_name") as string;
    const accessKey = formData.get("access_key") as string;
    const secretKey = formData.get("secret_key") as string;

    if (!vendorId || !accessKey || !secretKey) {
      return { error: "필수 정보가 누락되었습니다." };
    }

    // 연결 테스트 (상품 목록 조회 시도)
    const testCredentials: CoupangCredentials = {
      id: "",
      vendor_id: vendorId,
      vendor_name: vendorName,
      access_key: accessKey,
      secret_key: secretKey,
      is_active: true,
      last_sync_at: null,
    };

    try {
      // API 연결 테스트
      const testResult = await getCoupangProducts(testCredentials, { maxPerPage: 1 });

      if (testResult.code !== 200 && testResult.code !== "SUCCESS") {
        return { error: `API 연결 실패: ${testResult.message}` };
      }
    } catch (error: any) {
      console.error("[Coupang] Connection test failed:", error);
      return { error: `API 연결 테스트 실패: ${error.message}` };
    }

    // 기존 데이터 확인
    const { data: existing } = await adminClient
      .from("coupang_credentials")
      .select("id")
      .eq("vendor_id", vendorId)
      .single();

    const credentialData = {
      vendor_id: vendorId,
      vendor_name: vendorName || null,
      access_key: accessKey,
      secret_key: secretKey,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // 업데이트
      const { error } = await adminClient
        .from("coupang_credentials")
        .update(credentialData)
        .eq("id", existing.id);

      if (error) {
        return { error: `저장 실패: ${error.message}` };
      }
    } else {
      // 새로 생성
      const { error } = await adminClient
        .from("coupang_credentials")
        .insert(credentialData);

      if (error) {
        return { error: `저장 실패: ${error.message}` };
      }
    }

    return { success: true, message: "인증 정보가 저장되었습니다." };
  }

  // 연동 해제
  if (intent === "disconnect") {
    const vendorId = formData.get("vendor_id") as string;

    if (!vendorId) {
      return { error: "판매자 ID가 필요합니다." };
    }

    const { error } = await adminClient
      .from("coupang_credentials")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("vendor_id", vendorId);

    if (error) {
      return { error: `연동 해제 실패: ${error.message}` };
    }

    return { success: true, message: "연동이 해제되었습니다." };
  }

  // 연동 재활성화
  if (intent === "reconnect") {
    const vendorId = formData.get("vendor_id") as string;

    if (!vendorId) {
      return { error: "판매자 ID가 필요합니다." };
    }

    const { error } = await adminClient
      .from("coupang_credentials")
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq("vendor_id", vendorId);

    if (error) {
      return { error: `연동 재활성화 실패: ${error.message}` };
    }

    return { success: true, message: "연동이 재활성화되었습니다." };
  }

  return { error: "알 수 없는 요청입니다." };
}
