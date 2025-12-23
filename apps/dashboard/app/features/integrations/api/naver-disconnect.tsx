/**
 * 네이버 커머스 API 연동 해제
 * 
 * POST /api/integrations/naver/disconnect
 */
import { data, redirect } from "react-router";

import type { Route } from "./+types/naver-disconnect";

import { disconnectNaver } from "../lib/naver.server";

/**
 * POST - 연동 해제
 */
export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const accountId = formData.get("accountId") as string;

  if (!accountId) {
    return data({ success: false, error: "계정 ID가 필요합니다." }, { status: 400 });
  }

  const result = await disconnectNaver(accountId);

  if (!result.success) {
    return data({ success: false, error: result.error }, { status: 500 });
  }

  return data({ success: true, message: "연동이 해제되었습니다." });
}

/**
 * GET - 리다이렉트
 */
export async function loader() {
  return redirect("/dashboard/integrations/naver");
}

