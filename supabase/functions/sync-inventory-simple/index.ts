// =====================================================
// PlayAuto 재고 동기화 (배치 최적화 버전)
// 용도: 저장된 토큰으로 재고 조회 → Supabase 배치 저장
// 성능: 350개 SKU 기준 10-30초 (기존 150초 → 80% 단축)
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

  const startTime = Date.now();
  let syncLogId: string | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const playautoApiKey = Deno.env.get("PLAYAUTO_API_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { trigger = "manual" } = await req.json().catch(() => ({}));

    console.log("🔄 재고 동기화 시작 (배치 최적화 버전)...");

    // 동기화 로그 생성
    const { data: logData } = await supabase
      .from("sync_logs")
      .insert({ sync_type: trigger, status: "success", items_synced: 0, items_failed: 0 })
      .select()
      .single();
    
    syncLogId = logData?.id;

    // =====================================================
    // 1. 유효한 토큰 가져오기
    // =====================================================
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

    console.log("✅ 토큰 준비 완료");

    // =====================================================
    // 2. PlayAuto 재고 조회 (페이지네이션)
    // =====================================================
    console.log("📦 재고 데이터 조회 중...");
    
    let allItems = [];
    let start = 0;
    const limit = 100;
    let hasMore = true;

    while (hasMore) {
      console.log(`📄 페이지 조회 중... (start: ${start})`);
      
      const stockResponse = await fetch("https://openapi.playauto.io/api/stock/condition", {
        method: "POST",
        headers: {
          "x-api-key": playautoApiKey,
          "Authorization": `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_key: "",
          search_word: "",
          date_type: "wdate",
          sdate: "2025-01-01",
          start: start,
          limit: limit
        })
      });

      if (!stockResponse.ok) {
        const errorText = await stockResponse.text();
        throw new Error(`재고 조회 실패: ${stockResponse.status} - ${errorText}`);
      }

      const stockData = await stockResponse.json();
      const items = stockData.results || [];
      
      console.log(`📦 ${items.length}개 제품 수신 (누적: ${allItems.length + items.length}개)`);
      
      if (items.length === 0) {
        hasMore = false;
      } else {
        allItems = allItems.concat(items);
        start += limit;
        
        if (items.length < limit) {
          hasMore = false;
        }
      }
    }

    console.log(`✅ 전체 ${allItems.length}개 제품 수신 완료`);

    if (allItems.length === 0) {
      throw new Error("재고 데이터가 없습니다");
    }

    // =====================================================
    // 3. 배치 데이터 저장
    // =====================================================
    console.log("💾 배치 처리 시작...");
    
    const validItems = allItems.filter(item => item.sku_cd);
    console.log(`✅ 유효한 제품: ${validItems.length}개`);

    // 3-1. products 배치 upsert
    console.log("📝 제품 정보 배치 저장 중...");
    const productsToUpsert = validItems.map(item => ({
      sku: item.sku_cd,
      product_name: item.prod_name,
      is_active: true,
      updated_at: new Date().toISOString(),
    }));

    const { error: productsError } = await supabase
      .from("products")
      .upsert(productsToUpsert, { onConflict: "sku" });

    if (productsError) {
      console.error("❌ 제품 배치 저장 실패:", productsError);
      throw productsError;
    }

    console.log(`✅ ${productsToUpsert.length}개 제품 정보 저장 완료`);

    // 3-2. 저장된 products 정보 조회 (ID 매핑용)
    console.log("🔍 제품 ID 조회 중...");
    const skus = validItems.map(item => item.sku_cd);
    
    const { data: products, error: selectError } = await supabase
      .from("products")
      .select("id, sku")
      .in("sku", skus);

    if (selectError || !products) {
      throw new Error("제품 ID 조회 실패");
    }

    // SKU → product_id 매핑
    const skuToProductId = new Map();
    products.forEach(p => skuToProductId.set(p.sku, p.id));
    
    console.log(`✅ ${products.length}개 제품 ID 매핑 완료`);

    // 3-3. 기존 재고 조회 (변동량 계산용)
    console.log("📊 기존 재고 조회 중...");
    const productIds = products.map(p => p.id);
    
    const { data: prevInventories } = await supabase
      .from("inventory")
      .select("product_id, current_stock")
      .in("product_id", productIds)
      .order("synced_at", { ascending: false });

    // product_id → previous_stock 매핑 (최신 재고만)
    const productIdToPrevStock = new Map();
    if (prevInventories) {
      prevInventories.forEach(inv => {
        if (!productIdToPrevStock.has(inv.product_id)) {
          productIdToPrevStock.set(inv.product_id, inv.current_stock);
        }
      });
    }

    console.log(`✅ 기존 재고 ${prevInventories?.length || 0}건 조회 완료`);

    // 3-4. inventory 배치 insert
    console.log("📦 재고 데이터 배치 저장 중...");
    const inventoriesToInsert = [];
    const historiesToInsert = [];
    let itemsSynced = 0;
    let itemsFailed = 0;

    for (const item of validItems) {
      try {
        const sku = item.sku_cd;
        const productId = skuToProductId.get(sku);
        
        if (!productId) {
          itemsFailed++;
          continue;
        }

        const currentStock = parseInt(item.stock_cnt_real || 0);
        const previousStock = productIdToPrevStock.get(productId) || 0;
        const stockChange = currentStock - previousStock;
        const safeStock = parseInt(item.stock_cnt_safe || 10);

        // inventory 데이터
        inventoriesToInsert.push({
          product_id: productId,
          sku: sku,
          current_stock: currentStock,
          previous_stock: previousStock,
          stock_change: stockChange,
          alert_threshold: safeStock,
          synced_at: new Date().toISOString(),
        });

        // history 데이터 (변동 있을 때만)
        if (stockChange !== 0) {
          historiesToInsert.push({
            product_id: productId,
            sku: sku,
            stock_before: previousStock,
            stock_after: currentStock,
            stock_change: stockChange,
            change_reason: trigger,
            sync_log_id: syncLogId,
          });
        }

        itemsSynced++;
      } catch (error) {
        console.error("항목 처리 실패:", item.sku_cd, error);
        itemsFailed++;
      }
    }

    // inventory 배치 upsert (SKU 기준으로 업데이트)
    if (inventoriesToInsert.length > 0) {
      const { error: invError } = await supabase
        .from("inventory")
        .upsert(inventoriesToInsert, { onConflict: "sku" });

      if (invError) {
        console.error("❌ 재고 배치 저장 실패:", invError);
        throw invError;
      }
      console.log(`✅ ${inventoriesToInsert.length}개 재고 upsert 완료`);
    }

    // inventory_history 배치 insert
    if (historiesToInsert.length > 0) {
      const { error: histError } = await supabase
        .from("inventory_history")
        .insert(historiesToInsert);

      if (histError) {
        console.error("⚠️ 이력 배치 저장 실패:", histError);
        // 이력 저장 실패는 치명적이지 않으므로 계속 진행
      } else {
        console.log(`✅ ${historiesToInsert.length}개 변동 이력 저장 완료`);
      }
    }

    // =====================================================
    // 4. 로그 업데이트
    // =====================================================
    const duration = Date.now() - startTime;
    
    if (syncLogId) {
      await supabase
        .from("sync_logs")
        .update({
          status: itemsFailed > 0 ? "partial" : "success",
          items_synced: itemsSynced,
          items_failed: itemsFailed,
          duration_ms: duration,
        })
        .eq("id", syncLogId);
    }

    console.log(`✅ 완료: ${itemsSynced}개 성공, ${itemsFailed}개 실패 (${duration}ms = ${(duration/1000).toFixed(1)}초)`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "재고 동기화 완료 (배치 최적화)",
        data: {
          itemsSynced,
          itemsFailed,
          durationMs: duration,
          durationSeconds: (duration / 1000).toFixed(1)
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("❌ 에러:", error);

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
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
