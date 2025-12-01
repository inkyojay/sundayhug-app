// =====================================================
// PlayAuto 재고 동기화 Edge Function
// 생성일: 2025-11-12
// 용도: PlayAuto API → Supabase 재고 데이터 동기화
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS 헤더
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// PlayAuto API 엔드포인트 (고정)
const PLAYAUTO_BASE_URL = "https://openapi.playauto.io";
const PLAYAUTO_AUTH_URL = `${PLAYAUTO_BASE_URL}/api/auth`;
const PLAYAUTO_STOCK_URL = `${PLAYAUTO_BASE_URL}/api/stock/condition`;

// =====================================================
// 메인 핸들러
// =====================================================
serve(async (req: Request) => {
  // CORS Preflight 처리
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();
  let syncLogId: string | null = null;

  try {
    // 환경 변수 확인 (민감 정보만)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const playautoApiKey = Deno.env.get("PLAYAUTO_API_KEY")!;
    const playautoEmail = Deno.env.get("PLAYAUTO_EMAIL")!;
    const playautoPassword = Deno.env.get("PLAYAUTO_PASSWORD")!;

    if (!playautoApiKey || !playautoEmail || !playautoPassword) {
      throw new Error("PlayAuto 인증 정보가 누락되었습니다 (API_KEY, EMAIL, PASSWORD 확인)");
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 요청 바디 파싱
    const { trigger = "manual" } = await req.json().catch(() => ({}));

    // 동기화 로그 시작
    const { data: logData, error: logError } = await supabase
      .from("sync_logs")
      .insert({
        sync_type: trigger,
        status: "success",
        items_synced: 0,
        items_failed: 0,
      })
      .select()
      .single();

    if (logError) throw logError;
    syncLogId = logData.id;

    console.log(`🔄 재고 동기화 시작 (${trigger}) - Log ID: ${syncLogId}`);

    // =====================================================
    // 1단계: PlayAuto 로그인 (토큰 발급)
    // =====================================================
    console.log("🔐 PlayAuto 로그인 중...");
    const authResponse = await fetch(PLAYAUTO_AUTH_URL, {
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
      throw new Error(
        `PlayAuto 로그인 실패: ${authResponse.status} ${authResponse.statusText} - ${errorText}`
      );
    }

    const authData = await authResponse.json();
    console.log("🔍 PlayAuto 로그인 응답:", JSON.stringify(authData, null, 2));
    
    // 토큰 추출 (배열 또는 객체 형식 지원)
    let playautoToken;
    if (Array.isArray(authData) && authData.length > 0) {
      // 배열 형태: [{ "token": "...", "sol_no": ... }]
      playautoToken = authData[0].token;
    } else {
      // 객체 형태: { "token": "..." } 또는 { "data": { "token": "..." } }
      playautoToken = authData.token || authData.data?.token || authData.access_token;
    }

    if (!playautoToken) {
      throw new Error(
        `PlayAuto 토큰을 받지 못했습니다. 응답: ${JSON.stringify(authData)}`
      );
    }

    console.log("✅ PlayAuto 로그인 성공, 토큰 길이:", playautoToken.length);

    // =====================================================
    // 2단계: PlayAuto 재고 조회
    // =====================================================
    console.log("📦 재고 데이터 조회 중...");
    const playautoResponse = await fetch(PLAYAUTO_STOCK_URL, {
      method: "POST",
      headers: {
        "x-api-key": playautoApiKey,
        "Authorization": `Token ${playautoToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start: 0,
        limit: 1000,
        orderbyColumn: "wdate",
        orderbyType: "DESC",
        search_key: "all",
        search_word: "",
        search_type: "partial",
        date_type: "wdate",
        sdate: "2020-01-01",
        edate: new Date().toISOString().split('T')[0]
      })
    });

    if (!playautoResponse.ok) {
      const errorText = await playautoResponse.text();
      throw new Error(
        `PlayAuto API 오류: ${playautoResponse.status} ${playautoResponse.statusText} - ${errorText}`
      );
    }

    const playautoData = await playautoResponse.json();
    console.log(`🔍 PlayAuto 재고 응답:`, JSON.stringify(playautoData, null, 2));
    console.log(`📦 PlayAuto 데이터 수신: ${playautoData.recordsTotal || 0}개 항목`);

    // PlayAuto API 응답 형식:
    // { "results": [...], "recordsTotal": 100 }
    const inventoryItems = playautoData.results || [];

    if (inventoryItems.length === 0) {
      throw new Error(
        `PlayAuto API에서 데이터를 받아오지 못했습니다. 응답: ${JSON.stringify(playautoData)}`
      );
    }

    // =====================================================
    // 제품 마스터 데이터 동기화
    // =====================================================
    let itemsSynced = 0;
    let itemsFailed = 0;

    for (const item of inventoryItems) {
      try {
        // PlayAuto 필드 매핑
        const sku = item.sku_cd;
        const stock = parseInt(item.stock_cnt_real || 0);
        const productName = item.prod_name;
        const safeStock = parseInt(item.stock_cnt_safe || 10);

        if (!sku) {
          console.warn("⚠️ SKU가 없는 항목 스킵:", item);
          itemsFailed++;
          continue;
        }

        // 1. products 테이블에 제품 등록 (없으면 생성)
        const { data: product, error: productError } = await supabase
          .from("products")
          .upsert(
            {
              sku: sku,
              product_name: productName,
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "sku" }
          )
          .select()
          .single();

        if (productError) {
          console.error(`❌ 제품 등록 실패 (${sku}):`, productError);
          itemsFailed++;
          continue;
        }

        // 2. 기존 재고 조회
        const { data: previousInventory } = await supabase
          .from("inventory")
          .select("current_stock")
          .eq("product_id", product.id)
          .order("synced_at", { ascending: false })
          .limit(1)
          .single();

        const previousStock = previousInventory?.current_stock || 0;
        const stockChange = stock - previousStock;

        // 3. inventory 테이블에 현재 재고 저장
        const { error: inventoryError } = await supabase.from("inventory").insert({
          product_id: product.id,
          sku: sku,
          current_stock: stock,
          previous_stock: previousStock,
          stock_change: stockChange,
          alert_threshold: safeStock,
          synced_at: new Date().toISOString(),
        });

        if (inventoryError) {
          console.error(`❌ 재고 저장 실패 (${sku}):`, inventoryError);
          itemsFailed++;
          continue;
        }

        // 4. 재고 변동 이력 저장 (변동이 있을 때만)
        if (stockChange !== 0) {
          await supabase.from("inventory_history").insert({
            product_id: product.id,
            sku: sku,
            stock_before: previousStock,
            stock_after: stock,
            stock_change: stockChange,
            change_reason: trigger,
            sync_log_id: syncLogId,
          });

          console.log(
            `📊 재고 변동: ${sku} (${previousStock} → ${stock}, ${stockChange > 0 ? "+" : ""}${stockChange})`
          );
        }

        itemsSynced++;
      } catch (itemError) {
        console.error("항목 처리 중 오류:", itemError);
        itemsFailed++;
      }
    }

    // =====================================================
    // 동기화 로그 업데이트
    // =====================================================
    const duration = Date.now() - startTime;
    await supabase
      .from("sync_logs")
      .update({
        status: itemsFailed > 0 ? "partial" : "success",
        items_synced: itemsSynced,
        items_failed: itemsFailed,
        duration_ms: duration,
      })
      .eq("id", syncLogId);

    console.log(`✅ 동기화 완료: ${itemsSynced}개 성공, ${itemsFailed}개 실패 (${duration}ms)`);

    // =====================================================
    // 응답 반환
    // =====================================================
    return new Response(
      JSON.stringify({
        success: true,
        message: "재고 동기화 완료",
        data: {
          syncLogId,
          itemsSynced,
          itemsFailed,
          durationMs: duration,
          syncType: trigger,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    // =====================================================
    // 에러 처리
    // =====================================================
    console.error("❌ 동기화 실패:", error);

    // 동기화 로그에 에러 기록
    if (syncLogId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      await supabase
        .from("sync_logs")
        .update({
          status: "error",
          error_message: error.message,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", syncLogId);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

/* =====================================================
 * 배포 명령어:
 * supabase functions deploy sync-inventory --no-verify-jwt
 * 
 * 테스트 명령어:
 * curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/sync-inventory \
 *   -H "Authorization: Bearer YOUR_ANON_KEY" \
 *   -H "Content-Type: application/json" \
 *   -d '{"trigger":"manual"}'
 * ===================================================== */

