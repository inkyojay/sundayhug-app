// =====================================================
// PlayAuto 주문 조회 (캐시 우선)
// 용도: Supabase 먼저 확인 → 없으면 API 호출
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

    // 요청 파라미터 파싱
    const { 
      forceRefresh = false,  // true면 강제로 API 호출
      daysAgo = 7,           // 조회 기간 (기본 7일)
      shopCd = "",           // 쇼핑몰 코드
      status = [],           // 주문 상태 배열
    } = await req.json().catch(() => ({}));

    console.log(`🔍 주문 조회 시작... (forceRefresh: ${forceRefresh}, daysAgo: ${daysAgo})`);

    // =====================================================
    // 1. 캐시 확인 (forceRefresh가 false일 때만)
    // =====================================================
    if (!forceRefresh) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

      let query = supabase
        .from("orders")
        .select("*")
        .gte("ord_time", cutoffDate.toISOString())
        .order("ord_time", { ascending: false });

      // 쇼핑몰 필터
      if (shopCd) {
        query = query.eq("shop_cd", shopCd);
      }

      // 주문 상태 필터
      if (status.length > 0) {
        query = query.in("ord_status", status);
      }

      const { data: cachedOrders, error: cacheError } = await query;

      if (!cacheError && cachedOrders && cachedOrders.length > 0) {
        console.log(`✅ 캐시에서 ${cachedOrders.length}개 주문 발견!`);

        // 캐시 사용 로그
        await supabase.from("order_sync_logs").insert({
          sync_type: "cache",
          status: "cached",
          orders_synced: cachedOrders.length,
          orders_failed: 0,
          source: "cache",
          duration_ms: Date.now() - startTime,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "캐시에서 주문 조회 완료",
            source: "cache",
            data: {
              orders: cachedOrders,
              orderCount: cachedOrders.length,
              fromCache: true,
            }
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
      }

      console.log("📭 캐시에 데이터 없음, API 호출 시작...");
    } else {
      console.log("🔄 강제 새로고침, API 호출 시작...");
    }

    // =====================================================
    // 2. PlayAuto API 토큰 가져오기
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
    // 3. PlayAuto 주문 조회 (페이지네이션)
    // =====================================================
    console.log("📦 주문 데이터 조회 중...");

    // 날짜 범위 계산
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysAgo);

    const sdate = startDate.toISOString().split('T')[0];
    const edate = endDate.toISOString().split('T')[0];

    let allOrders = [];
    let start = 0;
    const limit = 100;
    let hasMore = true;

    // 동기화 로그 생성
    const { data: logData } = await supabase
      .from("order_sync_logs")
      .insert({
        sync_type: forceRefresh ? "manual" : "auto",
        status: "success",
        orders_synced: 0,
        orders_failed: 0,
        date_range_start: startDate,
        date_range_end: endDate,
        shop_cd: shopCd || null,
        source: "api",
      })
      .select()
      .single();
    
    syncLogId = logData?.id;

    while (hasMore) {
      console.log(`📄 페이지 조회 중... (start: ${start})`);
      
      const requestBody: any = {
        start: start,
        length: limit,
        date_type: "wdate",
        sdate: sdate,
        edate: edate,
        search_key: "",
        search_word: "",
        orderby: "wdate desc",
      };

      // 쇼핑몰 필터 추가
      if (shopCd) {
        requestBody.shop_cd = shopCd;
      }

      // 주문 상태 필터 추가
      if (status.length > 0) {
        requestBody.status = status;
      }

      const ordersResponse = await fetch("https://openapi.playauto.io/api/orders", {
        method: "POST",
        headers: {
          "x-api-key": playautoApiKey,
          "Authorization": `Token ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
      });

      if (!ordersResponse.ok) {
        const errorText = await ordersResponse.text();
        throw new Error(`주문 조회 실패: ${ordersResponse.status} - ${errorText}`);
      }

      const ordersData = await ordersResponse.json();
      const orders = ordersData.results || [];  // results 복수형!
      const orderProducts = ordersData.results_prod || [];  // 주문 상품 정보!
      
      console.log(`📦 ${orders.length}개 주문 수신 (누적: ${allOrders.length + orders.length}개)`);
      console.log(`📦 ${orderProducts.length}개 상품 수신`);
      
      if (orders.length === 0) {
        hasMore = false;
      } else {
        // 주문과 상품 정보를 함께 저장
        for (const order of orders) {
          // 해당 주문의 상품들 찾기
          const products = orderProducts.filter(p => p.uniq === order.uniq);
          allOrders.push({
            ...order,
            products: products  // 주문에 상품 배열 추가
          });
        }
        start += limit;
        
        if (orders.length < limit) {
          hasMore = false;
        }
      }
    }

    console.log(`✅ 전체 ${allOrders.length}개 주문 수신 완료`);

    if (allOrders.length === 0) {
      console.log("⚠️ 조회된 주문이 없습니다");
      
      if (syncLogId) {
        await supabase
          .from("order_sync_logs")
          .update({
            status: "success",
            orders_synced: 0,
            duration_ms: Date.now() - startTime,
          })
          .eq("id", syncLogId);
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: "조회된 주문이 없습니다",
          source: "api",
          data: {
            orders: [],
            orderCount: 0,
            fromCache: false,
          }
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // =====================================================
    // 4. Supabase에 주문 데이터 저장
    // =====================================================
    let ordersSynced = 0;
    let ordersFailed = 0;

    for (const order of allOrders) {
      try {
        // 날짜 필드 파싱 함수
        const parseDate = (dateStr: string | null) => {
          if (!dateStr || dateStr === "" || dateStr === "0000-00-00" || dateStr === "0000-00-00 00:00:00") {
            return null;
          }
          try {
            const date = new Date(dateStr);
            return isNaN(date.getTime()) ? null : date.toISOString();
          } catch {
            return null;
          }
        };

        const orderData = {
          sol_no: order.sol_no || 0,
          uniq: order.uniq,
          ori_uniq: order.ori_uniq || null,
          bundle_no: order.bundle_no || null,
          ord_status: order.ord_status,
          dupl_doubt_yn: order.dupl_doubt_yn === 1,
          
          carr_no: order.carr_no || null,
          carr_ser_no: order.carr_ser_no || null,
          carr_name: order.carr_name || null,
          carr_ser_name: order.carr_ser_name || null,
          invoice_no: order.invoice_no || null,
          
          ship_plan_date: parseDate(order.ship_plan_date),
          
          shop_cd: order.shop_cd || null,
          shop_name: order.shop_name || null,
          shop_id: order.shop_id || null,
          seller_nick: order.seller_nick || null,
          shop_ord_no: order.shop_ord_no || null,
          shop_ord_no_real: order.shop_ord_no_real || null,
          shop_sale_no: order.shop_sale_no || null,
          shop_sale_name: order.shop_sale_name || null,
          shop_sku_cd: order.shop_sku_cd || null,
          shop_opt_name: order.shop_opt_name || null,
          sale_cnt: order.sale_cnt || 0,
          shop_add_opt_name: order.shop_add_opt_name || null,
          
          ship_method: order.ship_method || null,
          delivery_attribute_type: order.delivery_attribute_type || null,
          
          out_time: parseDate(order.out_time),
          wdate: parseDate(order.wdate),
          ord_time: parseDate(order.ord_time),
          pay_time: parseDate(order.pay_time),
          ord_confirm_time: parseDate(order.ord_confirm_time),
          claim_time: parseDate(order.claim_time),
          claim_com_time: parseDate(order.claim_com_time),
          ship_hope_time: parseDate(order.ship_hope_time),
          api_read_time: parseDate(order.api_read_time),
          
          api_read_status: order.api_read_status || null,
          
          pay_amt: parseFloat(order.pay_amt || 0),
          discount_amt: parseFloat(order.discount_amt || 0),
          shop_discount: parseFloat(order.shop_discount || 0),
          seller_discount: parseFloat(order.seller_discount || 0),
          coupon_discount: parseFloat(order.coupon_discount || 0),
          point_discount: parseFloat(order.point_discount || 0),
          
          orderby: order.orderby || null,
          
          order_name: order.order_name || null,
          order_id: order.order_id || null,
          order_tel: order.order_tel || null,
          order_htel: order.order_htel || null,
          order_email: order.order_email || null,
          
          ship_msg: order.ship_msg || null,
          out_order_time: parseDate(order.out_order_time),
          
          to_ctry_cd: order.to_ctry_cd || null,
          to_name: order.to_name || null,
          to_tel: order.to_tel || null,
          to_htel: order.to_htel || null,
          to_addr1: order.to_addr1 || null,
          to_addr2: order.to_addr2 || null,
          to_zipcd: order.to_zipcd || null,
          
          ship_cost: parseFloat(order.ship_cost || 0),
          
          c_sale_cd: order.c_sale_cd || null,
          ord_curr_cd: order.ord_curr_cd || null,
          gprivate_no: order.gprivate_no || null,
          barcode: order.barcode || null,
          
          depot_no: order.depot_no || null,
          depot_name: order.depot_name || null,
          
          sales: parseFloat(order.sales || 0),
          sales_tax: parseFloat(order.sales_tax || 0),
          shop_cost_price: parseFloat(order.shop_cost_price || 0),
          shop_supply_price: parseFloat(order.shop_supply_price || 0),
          ship_delay_yn: order.ship_delay_yn || 0,
          ship_avail_yn: order.ship_avail_yn || 0,
          ship_unable_reason: order.ship_unable_reason || null,
          ord_status_msg: order.ord_status_msg || null,
          exchange_yn: order.exchange_yn || 0,
          memo_yn: order.memo_yn || 0,
          bundle_avail_yn: order.bundle_avail_yn || 0,
          multi_bundle_yn: order.multi_bundle_yn || 0,
          
          memo_yn_bool: order.memo_yn === 1,
          map_yn: order.map_yn === true || order.map_yn === 1,
          supp_vendor: order.supp_vendor || null,
          multi_type: order.multi_type || null,
          multi_search_word: order.multi_search_word || null,
          masking_yn: order.masking_yn === true || order.masking_yn === 1,
          fulfillment_yn: order.fulfillment_yn === true || order.fulfillment_yn === 1,
          non_shipping_yn: order.non_shipping_yn === true || order.non_shipping_yn === 1,
          
          gift_prod_name: order.gift_prod_name || null,
          delay_status: order.delay_status === true || order.delay_status === 1,
          unstore_status: order.unstore_status === true || order.unstore_status === 1,
          delay_ship: order.delay_ship === true || order.delay_ship === 1,
          
          updated_at: new Date().toISOString(),
          synced_at: new Date().toISOString(),
        };

        // upsert (uniq 기준)
        const { data: savedOrder, error: orderError } = await supabase
          .from("orders")
          .upsert(orderData, { onConflict: "uniq" })
          .select()
          .single();

        if (orderError) {
          throw orderError;
        }

        // 주문 상품 정보 저장 (order_items)
        if (order.products && order.products.length > 0) {
          // 기존 order_items 삭제 (중복 방지)
          await supabase
            .from("order_items")
            .delete()
            .eq("order_id", savedOrder.id);

          // 새로운 order_items 삽입
          const orderItems = order.products.map((product: any) => ({
            order_id: savedOrder.id,
            
            // SKU & 제품 정보
            sku_cd: product.sku_cd || null,
            stock_cd: product.stock_cd || null,
            product_name: product.prod_name || product.ord_opt_name || null,
            barcode: product.barcode || null,
            prod_no: product.prod_no || null,
            model_no: product.model_no || product.model || null,
            prod_img: product.prod_img || null,
            attri: product.attri || null,
            
            // 옵션 정보
            shop_opt_name: product.ord_opt_name || null,
            
            // 수량 정보
            sale_cnt: product.opt_sale_cnt || 0,
            pack_unit: product.pack_unit || 1,
            out_cnt: product.out_cnt || 0,
            
            // 세트 정보
            set_no: product.set_no || null,
            set_cd: product.set_cd || null,
            set_name: product.set_name || null,
            add_opt_yn: product.add_opt_yn === 1,
            
            // 금액 정보
            sale_price: parseFloat(product.sale_price || 0),
            cost_price: parseFloat(product.cost_price || 0),
            
            // 재고 정보
            stock_cnt_real: product.stock_cnt_real || 0,
            
            // 배송처 정보
            depot_no: product.depot_no || null,
            depot_name: product.depot_name || null,
          }));

          if (orderItems.length > 0) {
            await supabase
              .from("order_items")
              .insert(orderItems);
          }
        }

        ordersSynced++;
      } catch (error) {
        console.error("주문 저장 실패:", order.uniq, error);
        ordersFailed++;
      }
    }

    // =====================================================
    // 5. 로그 업데이트
    // =====================================================
    const duration = Date.now() - startTime;
    
    if (syncLogId) {
      await supabase
        .from("order_sync_logs")
        .update({
          status: ordersFailed > 0 ? "partial" : "success",
          orders_synced: ordersSynced,
          orders_failed: ordersFailed,
          duration_ms: duration,
        })
        .eq("id", syncLogId);
    }

    console.log(`✅ 완료: ${ordersSynced}개 성공, ${ordersFailed}개 실패 (${duration}ms)`);

    // 저장된 데이터 다시 조회
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysAgo);

    let query = supabase
      .from("orders")
      .select("*")
      .gte("ord_time", cutoffDate.toISOString())
      .order("ord_time", { ascending: false });

    if (shopCd) {
      query = query.eq("shop_cd", shopCd);
    }

    if (status.length > 0) {
      query = query.in("ord_status", status);
    }

    const { data: savedOrders } = await query;

    return new Response(
      JSON.stringify({
        success: true,
        message: "주문 동기화 완료",
        source: "api",
        data: {
          orders: savedOrders || [],
          orderCount: savedOrders?.length || 0,
          ordersSynced,
          ordersFailed,
          durationMs: duration,
          fromCache: false,
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
        .from("order_sync_logs")
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

