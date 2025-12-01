// =====================================================
// 노션 → Supabase 제품 동기화 Edge Function
// 용도: 노션 데이터베이스에서 제품 정보 가져오기 → Supabase 저장
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const NOTION_API_URL = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // 환경 변수 가져오기
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const notionApiKey = Deno.env.get("NOTION_API_KEY")!;
    const notionParentDbId = Deno.env.get("NOTION_PARENT_PRODUCTS_DB_ID")!;
    const notionSoloDbId = Deno.env.get("NOTION_SOLO_PRODUCTS_DB_ID")!;

    if (!notionApiKey || !notionParentDbId || !notionSoloDbId) {
      throw new Error("노션 환경 변수가 누락되었습니다 (NOTION_API_KEY, DB IDs 확인)");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔄 노션 → Supabase 동기화 시작...");

    // =====================================================
    // 1. Parent Products 동기화 (제품 분류)
    // =====================================================
    console.log("📦 Parent Products 동기화 중...");
    
    let parentLogId: string | null = null;
    const { data: parentLog } = await supabase
      .from("notion_sync_logs")
      .insert({ sync_type: "parent_products", status: "success", items_synced: 0, items_failed: 0 })
      .select()
      .single();
    
    parentLogId = parentLog?.id;

    const parentProducts = await fetchNotionDatabase(
      notionParentDbId,
      notionApiKey,
      "parent",
      null
    );

    let parentSynced = 0;
    let parentFailed = 0;

    for (const item of parentProducts) {
      try {
        const { data: inserted } = await supabase
          .from("parent_products")
          .upsert({
            parent_sku: item.parent_sku,
            product_name: item.product_name,
            category: item.category,
            subcategory: item.subcategory,
            description: item.description,
            notion_page_id: item.notion_page_id,
            is_active: item.is_active,
            updated_at: new Date().toISOString(),
          }, { onConflict: "parent_sku" })
          .select()
          .single();

        if (inserted) parentSynced++;
      } catch (error) {
        console.error("Parent 저장 실패:", error);
        parentFailed++;
      }
    }

    // Parent 로그 업데이트
    if (parentLogId) {
      await supabase
        .from("notion_sync_logs")
        .update({
          status: parentFailed > 0 ? "partial" : "success",
          items_synced: parentSynced,
          items_failed: parentFailed,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", parentLogId);
    }

    console.log(`✅ Parent Products: ${parentSynced}개 동기화, ${parentFailed}개 실패`);

    // =====================================================
    // 2. Solo Products 동기화 (Solo SKU)
    // =====================================================
    console.log("📦 Solo Products 동기화 중...");
    
    let soloLogId: string | null = null;
    const { data: soloLog } = await supabase
      .from("notion_sync_logs")
      .insert({ sync_type: "solo_products", status: "success", items_synced: 0, items_failed: 0 })
      .select()
      .single();
    
    soloLogId = soloLog?.id;

    // Parent Products 데이터를 메모리에 캐시 (notion_page_id -> parent_sku 매핑)
    const { data: parentProductsData } = await supabase
      .from("parent_products")
      .select("notion_page_id, parent_sku");
    
    const parentSkuMap = new Map<string, string>();
    if (parentProductsData) {
      for (const pp of parentProductsData) {
        if (pp.notion_page_id && pp.parent_sku) {
          parentSkuMap.set(pp.notion_page_id, pp.parent_sku);
        }
      }
    }

    const soloProducts = await fetchNotionDatabase(
      notionSoloDbId,
      notionApiKey,
      "solo",
      parentSkuMap
    );

    let soloSynced = 0;
    let soloFailed = 0;

    for (const item of soloProducts) {
      try {
        const { data: inserted } = await supabase
          .from("products")
          .upsert({
            sku: item.sku,
            product_name: item.product_name,
            parent_sku: item.parent_sku,
            color_kr: item.color_kr,
            sku_6_size: item.sku_6_size,
            notion_page_id: item.notion_page_id,
            is_active: item.is_active,
            updated_at: new Date().toISOString(),
          }, { onConflict: "sku" })
          .select()
          .single();

        if (inserted) soloSynced++;
      } catch (error) {
        console.error("Solo 저장 실패:", error);
        soloFailed++;
      }
    }

    // Solo 로그 업데이트
    if (soloLogId) {
      await supabase
        .from("notion_sync_logs")
        .update({
          status: soloFailed > 0 ? "partial" : "success",
          items_synced: soloSynced,
          items_failed: soloFailed,
          duration_ms: Date.now() - startTime,
        })
        .eq("id", soloLogId);
    }

    console.log(`✅ Solo Products: ${soloSynced}개 동기화, ${soloFailed}개 실패`);

    // =====================================================
    // 3. 응답 반환
    // =====================================================
    const totalDuration = Date.now() - startTime;

    return new Response(
      JSON.stringify({
        success: true,
        message: "노션 동기화 완료",
        data: {
          parent_products: {
            synced: parentSynced,
            failed: parentFailed,
          },
          solo_products: {
            synced: soloSynced,
            failed: soloFailed,
          },
          durationMs: totalDuration,
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("❌ 노션 동기화 에러:", error);

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

// =====================================================
// 노션 데이터베이스 조회 함수
// =====================================================
async function fetchNotionDatabase(
  databaseId: string,
  apiKey: string,
  type: "parent" | "solo",
  parentSkuMap: Map<string, string> | null
): Promise<any[]> {
  const results: any[] = [];
  let hasMore = true;
  let startCursor: string | undefined = undefined;

  while (hasMore) {
    const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        start_cursor: startCursor,
        page_size: 100,
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`노션 API 에러: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    // 데이터 파싱
    for (const page of data.results) {
      if (type === "parent") {
        results.push(parseParentProduct(page));
      } else {
        results.push(parseSoloProduct(page, parentSkuMap));
      }
    }

    hasMore = data.has_more;
    startCursor = data.next_cursor;
  }

  return results;
}

// =====================================================
// Parent Product 파싱
// =====================================================
function parseParentProduct(page: any): any {
  const props = page.properties;

  return {
    notion_page_id: page.id,
    parent_sku: getPlainText(props["Parents SKU"]) || "",
    product_name: getPlainText(props["Product_KR"]) || "",
    category: null,  // 노션에 없음
    subcategory: null,  // 노션에 없음
    description: null,  // 노션에 없음
    is_active: true,  // 기본값
  };
}

// =====================================================
// Solo Product 파싱
// =====================================================
function parseSoloProduct(page: any, parentSkuMap: Map<string, string> | null): any {
  const props = page.properties;

  // Parents SKU relation에서 page ID 추출
  const parentPageId = getRelation(props["Parents SKU"]);
  let parentSku = "";
  
  // parentSkuMap에서 parent_sku 찾기
  if (parentPageId && parentSkuMap) {
    parentSku = parentSkuMap.get(parentPageId) || "";
  }

  return {
    notion_page_id: page.id,
    sku: getPlainText(props["Solo SKU"]) || "",
    product_name: getPlainText(props["이름"]) || "",
    parent_sku: parentSku,
    color_kr: getPlainText(props["Color_KR"]) || "",
    sku_6_size: getPlainText(props["SKU_6_Size"]) || "",
    is_active: true,  // 기본값
  };
}

// =====================================================
// 노션 속성 파싱 헬퍼 함수
// =====================================================
function getPlainText(property: any): string | null {
  if (!property) return null;
  
  if (property.type === "title" && property.title?.length > 0) {
    return property.title[0].plain_text;
  }
  
  if (property.type === "rich_text" && property.rich_text?.length > 0) {
    return property.rich_text[0].plain_text;
  }

  return null;
}

function getSelect(property: any): string | null {
  if (!property || property.type !== "select") return null;
  return property.select?.name || null;
}

function getCheckbox(property: any): boolean | null {
  if (!property || property.type !== "checkbox") return null;
  return property.checkbox;
}

function getRelation(property: any): string | null {
  if (!property || property.type !== "relation") return null;
  // relation 필드는 배열로 되어 있고, 첫 번째 관계의 ID를 반환
  // 하지만 우리는 Parents SKU 값이 필요하므로, 별도로 조회해야 함
  // 일단은 relation이 있으면 나중에 Parent Product에서 parent_sku를 찾아야 함
  // 여기서는 일단 relation page ID를 반환
  if (property.relation && property.relation.length > 0) {
    return property.relation[0].id;
  }
  return null;
}

