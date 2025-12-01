// =====================================================
// PlayAuto 토큰 발급 Edge Function
// 용도: PlayAuto API 토큰만 발급받아서 Supabase에 저장
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
    // 환경 변수
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const playautoApiKey = Deno.env.get("PLAYAUTO_API_KEY")!;
    const playautoEmail = Deno.env.get("PLAYAUTO_EMAIL")!;
    const playautoPassword = Deno.env.get("PLAYAUTO_PASSWORD")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔐 PlayAuto 토큰 발급 시작...");

    // PlayAuto 로그인
    const authResponse = await fetch("https://openapi.playauto.io/api/auth", {
      method: "POST",
      headers: {
        "x-api-key": playautoApiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: playautoEmail,
        password: playautoPassword,
      })
    });

    if (!authResponse.ok) {
      const errorText = await authResponse.text();
      throw new Error(`PlayAuto 로그인 실패: ${authResponse.status} - ${errorText}`);
    }

    const authData = await authResponse.json();
    console.log("🔍 응답:", JSON.stringify(authData));

    // 토큰 추출
    let token, solNo;
    if (Array.isArray(authData) && authData.length > 0) {
      token = authData[0].token;
      solNo = authData[0].sol_no;
    } else {
      token = authData.token;
      solNo = authData.sol_no;
    }

    if (!token) {
      throw new Error(`토큰을 받지 못함: ${JSON.stringify(authData)}`);
    }

    console.log("✅ 토큰 발급 성공, 길이:", token.length);

    // 토큰 저장 (24시간 유효)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // 기존 토큰 삭제 (유효한 것만 남기기)
    await supabase
      .from('playauto_tokens')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // 새 토큰 저장
    const { error: insertError } = await supabase
      .from('playauto_tokens')
      .insert({
        token: token,
        sol_no: solNo,
        expires_at: expiresAt.toISOString()
      });

    if (insertError) throw insertError;

    console.log("💾 토큰 저장 완료, 만료:", expiresAt.toISOString());

    return new Response(
      JSON.stringify({
        success: true,
        message: "토큰 발급 및 저장 완료",
        data: {
          tokenLength: token.length,
          solNo: solNo,
          expiresAt: expiresAt.toISOString()
        }
      }),
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
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});


