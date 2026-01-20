/**
 * 네이버 톡톡 Webhook 엔드포인트
 *
 * 외부에서 접근 가능한 Webhook URL
 * POST /api/talktalk/webhook
 *
 * 네이버 톡톡 서버에서 사용자 이벤트를 수신합니다.
 */

import type { ActionFunctionArgs } from "react-router";

export async function action({ request }: ActionFunctionArgs) {
  // POST 요청만 허용
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    // 요청 본문 파싱
    const body = await request.json();

    console.log("📥 [Webhook] 이벤트 수신:", JSON.stringify(body, null, 2));

    // 필수 필드 검증
    if (!body.event || !body.user) {
      console.error("❌ [Webhook] 필수 필드 누락:", body);
      return new Response(null, { status: 200 }); // 톡톡은 항상 200 응답 필요
    }

    // 이벤트 처리
    const { routeWebhookEvent } = await import("../lib/talktalk");
    const response = await routeWebhookEvent(body);

    // 응답이 있으면 JSON으로 반환 (동기 응답)
    if (response) {
      console.log("📤 [Webhook] 동기 응답:", JSON.stringify(response, null, 2));
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: { "Content-Type": "application/json;charset=UTF-8" },
      });
    }

    // 응답이 없으면 200 OK만 반환
    return new Response(null, { status: 200 });
  } catch (error) {
    console.error("❌ [Webhook] 처리 중 오류:", error);

    // 오류가 발생해도 200 응답 (톡톡 서버 재시도 방지)
    return new Response(null, { status: 200 });
  }
}

// GET 요청 시 Webhook URL 확인용
export async function loader() {
  return new Response(
    JSON.stringify({
      message: "네이버 톡톡 Webhook 엔드포인트입니다.",
      status: "active",
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json;charset=UTF-8" },
    }
  );
}
