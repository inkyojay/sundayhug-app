// =====================================================
// PlayAuto 주문 API 원본 테스트
// 용도: API 응답 구조 확인
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const playautoApiKey = Deno.env.get("PLAYAUTO_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔐 토큰 가져오기...");

    // 토큰 가져오기
    const { data: tokenData } = await supabase
      .from('playauto_tokens')
      .select('*')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let token = tokenData?.token;

    if (!token) {
      console.log("🔐 토큰 없음, 새로 발급...");
      const tokenResponse = await fetch(`${supabaseUrl}/functions/v1/get-playauto-token`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!tokenResponse.ok) {
        throw new Error("토큰 발급 실패");
      }

      const { data: newTokenData } = await supabase
        .from('playauto_tokens')
        .select('token')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      token = newTokenData?.token;
    }

    if (!token) throw new Error("토큰을 가져올 수 없습니다");

    console.log("✅ 토큰:", token.substring(0, 20) + "...");

    // PlayAuto 주문 API 호출
    console.log("📡 PlayAuto API 호출 중...");

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const sdate = startDate.toISOString().split('T')[0];
    const edate = endDate.toISOString().split('T')[0];

    console.log(`📅 날짜 범위: ${sdate} ~ ${edate}`);

    const requestBody = {
      start: 0,
      length: 10,  // 일단 10개만
      date_type: "wdate",
      sdate: sdate,
      edate: edate,
      search_key: "",
      search_word: "",
      orderby: "wdate desc",
    };

    console.log("📤 요청 바디:", JSON.stringify(requestBody, null, 2));

    const ordersResponse = await fetch("https://openapi.playauto.io/api/orders", {
      method: "POST",
      headers: {
        "x-api-key": playautoApiKey,
        "Authorization": `Token ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody)
    });

    console.log("📥 응답 상태:", ordersResponse.status);

    if (!ordersResponse.ok) {
      const errorText = await ordersResponse.text();
      console.error("❌ API 에러:", errorText);
      throw new Error(`주문 조회 실패: ${ordersResponse.status} - ${errorText}`);
    }

    const ordersData = await ordersResponse.json();
    
    console.log("📦 응답 전체 구조:");
    console.log(JSON.stringify(ordersData, null, 2));

    // 응답 구조 분석
    console.log("\n🔍 응답 분석:");
    console.log("- 키 목록:", Object.keys(ordersData));
    
    if (ordersData.result) {
      console.log("- result 존재:", Array.isArray(ordersData.result), "길이:", ordersData.result?.length);
    }
    
    if (ordersData.data) {
      console.log("- data 존재:", Array.isArray(ordersData.data), "길이:", ordersData.data?.length);
    }

    if (ordersData.recordsTotal !== undefined) {
      console.log("- recordsTotal:", ordersData.recordsTotal);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "PlayAuto API 원본 응답",
        rawResponse: ordersData,
        analysis: {
          keys: Object.keys(ordersData),
          hasResult: !!ordersData.result,
          hasData: !!ordersData.data,
          resultLength: ordersData.result?.length || 0,
          dataLength: ordersData.data?.length || 0,
          recordsTotal: ordersData.recordsTotal,
        }
      }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("❌ 에러:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }, null, 2),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});



