import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

// Supabase Secrets에서 가져오기
const COUPANG_ACCESS_KEY = Deno.env.get("COUPANG_ACCESS_KEY")!;
const COUPANG_SECRET_KEY = Deno.env.get("COUPANG_SECRET_KEY")!;
const COUPANG_VENDOR_ID = Deno.env.get("COUPANG_VENDOR_ID")!;

// HMAC-SHA256 서명 생성
async function generateHmacSignature(
  method: string,
  path: string,
  timestamp: string
): Promise<string> {
  const message = `${timestamp}#${method}#${path}#`;
  
  const encoder = new TextEncoder();
  const keyData = encoder.encode(COUPANG_SECRET_KEY);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  
  // ArrayBuffer를 hex string으로 변환
  const hashArray = Array.from(new Uint8Array(signature));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

serve(async (req) => {
  try {
    console.log("🧪 쿠팡 로켓창고 재고 API 테스트 시작");
    console.log("📦 Vendor ID:", COUPANG_VENDOR_ID);

    // 쿠팡 API 엔드포인트 (로켓창고 재고 조회)
    const endpoint = `/v2/providers/rg_open_api/apis/api/v1/vendors/${COUPANG_VENDOR_ID}/rg/inventory/summaries`;
    const method = "GET";
    const timestamp = Date.now().toString();
    
    // HMAC 서명 생성
    const signature = await generateHmacSignature(method, endpoint, timestamp);
    
    console.log("📝 요청 정보:", {
      endpoint,
      method,
      timestamp,
      signature: signature.substring(0, 20) + "..."
    });

    // 쿠팡 API 호출
    const coupangUrl = `https://api-gateway.coupang.com${endpoint}`;
    
    // 쿠팡 API 인증: Authorization 헤더 생성
    const authorization = `CEA algorithm=HmacSHA256, access-key=${COUPANG_ACCESS_KEY}, signed-date=${timestamp}, signature=${signature}`;
    
    const response = await fetch(coupangUrl, {
      method: method,
      headers: {
        "Content-Type": "application/json;charset=UTF-8",
        "Authorization": authorization,
        "X-Requested-By": COUPANG_VENDOR_ID,
      },
    });

    console.log("📡 응답 상태:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ API 에러:", errorText);
      
      return new Response(
        JSON.stringify({
          success: false,
          error: `쿠팡 API 에러: ${response.status}`,
          details: errorText,
          endpoint: endpoint,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const data = await response.json();
    console.log("✅ API 응답 받음. 데이터 구조 확인:");
    console.log("📊 응답 데이터 키:", Object.keys(data));
    
    // 첫 번째 아이템 샘플 확인 (있는 경우)
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      console.log("📦 첫 번째 아이템 샘플:", JSON.stringify(data.data[0], null, 2));
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "쿠팡 로켓창고 재고 API 테스트 성공",
        dataStructure: {
          responseKeys: Object.keys(data),
          sampleData: data.data ? data.data.slice(0, 3) : data, // 처음 3개만
          totalCount: data.data ? data.data.length : 0,
        },
        fullResponse: data,
      }, null, 2),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("💥 에러 발생:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});

