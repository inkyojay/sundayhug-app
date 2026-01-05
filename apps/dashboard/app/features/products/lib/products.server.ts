/**
 * 제품 관리 서버 로직
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ProductQueryParams {
  search: string;
  parentSku: string;
  color: string;
  size: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  limit: number;
}

export interface ChannelMapping {
  cafe24: {
    variant_code: string;
    stock_quantity: number;
    additional_price: number;
    product_name: string;
  } | null;
  naver: {
    option_combination_id: number;
    stock_quantity: number;
    price: number;
    product_name: string;
  } | null;
}

export interface SalesData {
  cafe24: { orderCount: number; totalSales: number };
  naver: { orderCount: number; totalSales: number };
}

/**
 * URL에서 쿼리 파라미터 파싱
 */
export function parseProductQueryParams(url: URL): ProductQueryParams {
  return {
    search: url.searchParams.get("search") || "",
    parentSku: url.searchParams.get("parentSku") || "",
    color: url.searchParams.get("color") || "",
    size: url.searchParams.get("size") || "",
    sortBy: url.searchParams.get("sortBy") || "updated_at",
    sortOrder: url.searchParams.get("sortOrder") || "desc",
    page: parseInt(url.searchParams.get("page") || "1"),
    limit: parseInt(url.searchParams.get("limit") || "50"),
  };
}

/**
 * 필터 옵션 조회 (parentSku, colors, sizes)
 */
export async function getFilterOptions(supabase: SupabaseClient) {
  const [parentSkusResult, colorsResult, sizesResult] = await Promise.all([
    supabase
      .from("parent_products")
      .select("parent_sku, product_name")
      .order("product_name", { ascending: true }),
    supabase
      .from("products")
      .select("color_kr")
      .not("color_kr", "is", null)
      .not("color_kr", "eq", ""),
    supabase
      .from("products")
      .select("sku_6_size")
      .not("sku_6_size", "is", null)
      .not("sku_6_size", "eq", ""),
  ]);

  return {
    parentSkus: parentSkusResult.data || [],
    colors: [...new Set(colorsResult.data?.map((c: any) => c.color_kr))].sort() as string[],
    sizes: [...new Set(sizesResult.data?.map((s: any) => s.sku_6_size))].sort() as string[],
  };
}

/**
 * 제품 목록 조회
 */
export async function getProducts(supabase: SupabaseClient, params: ProductQueryParams) {
  const { search, parentSku, color, size, sortBy, sortOrder, page, limit } = params;
  const offset = (page - 1) * limit;

  // 제품 수 쿼리
  let countQuery = supabase.from("products").select("*", { count: "exact", head: true });

  // 제품 목록 쿼리
  let query = supabase
    .from("products")
    .select("*")
    .order(sortBy, { ascending: sortOrder === "asc" });

  // 필터 적용
  if (search) {
    countQuery = countQuery.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
    query = query.or(`sku.ilike.%${search}%,product_name.ilike.%${search}%`);
  }
  if (parentSku) {
    countQuery = countQuery.eq("parent_sku", parentSku);
    query = query.eq("parent_sku", parentSku);
  }
  if (color) {
    countQuery = countQuery.eq("color_kr", color);
    query = query.eq("color_kr", color);
  }
  if (size) {
    countQuery = countQuery.eq("sku_6_size", size);
    query = query.eq("sku_6_size", size);
  }

  const { count: totalCount } = await countQuery;
  query = query.range(offset, offset + limit - 1);
  const { data: products } = await query;

  return {
    products: products || [],
    totalCount: totalCount || 0,
    totalPages: Math.ceil((totalCount || 0) / limit),
  };
}

/**
 * 채널 매핑 조회 (Cafe24, Naver)
 */
export async function getChannelMappings(
  supabase: SupabaseClient,
  skuList: string[]
): Promise<Record<string, ChannelMapping>> {
  if (skuList.length === 0) return {};

  const [cafe24VariantsResult, naverOptionsResult] = await Promise.all([
    supabase
      .from("cafe24_product_variants")
      .select("sku, variant_code, stock_quantity, additional_price, product_no")
      .in("sku", skuList),
    supabase
      .from("naver_product_options")
      .select("seller_management_code, option_combination_id, stock_quantity, price, origin_product_no")
      .in("seller_management_code", skuList),
  ]);

  const cafe24ProductNos = [...new Set((cafe24VariantsResult.data || []).map((v: any) => v.product_no))];
  const { data: cafe24Products } =
    cafe24ProductNos.length > 0
      ? await supabase.from("cafe24_products").select("product_no, product_name").in("product_no", cafe24ProductNos)
      : { data: [] };

  const naverProductNos = [...new Set((naverOptionsResult.data || []).map((o: any) => o.origin_product_no))];
  const { data: naverProducts } =
    naverProductNos.length > 0
      ? await supabase
          .from("naver_products")
          .select("origin_product_no, product_name")
          .in("origin_product_no", naverProductNos)
      : { data: [] };

  const channelMappings: Record<string, ChannelMapping> = {};

  for (const variant of cafe24VariantsResult.data || []) {
    const productName =
      (cafe24Products || []).find((p: any) => p.product_no === variant.product_no)?.product_name || "";
    if (!channelMappings[variant.sku]) {
      channelMappings[variant.sku] = { cafe24: null, naver: null };
    }
    channelMappings[variant.sku].cafe24 = {
      variant_code: variant.variant_code,
      stock_quantity: variant.stock_quantity,
      additional_price: variant.additional_price,
      product_name: productName,
    };
  }

  for (const option of naverOptionsResult.data || []) {
    const productName =
      (naverProducts || []).find((p: any) => p.origin_product_no === option.origin_product_no)?.product_name || "";
    if (!channelMappings[option.seller_management_code]) {
      channelMappings[option.seller_management_code] = { cafe24: null, naver: null };
    }
    channelMappings[option.seller_management_code].naver = {
      option_combination_id: option.option_combination_id,
      stock_quantity: option.stock_quantity,
      price: option.price,
      product_name: productName,
    };
  }

  return channelMappings;
}

/**
 * 판매 데이터 집계
 */
export async function getSalesData(
  supabase: SupabaseClient,
  skuList: string[]
): Promise<Record<string, SalesData>> {
  if (skuList.length === 0) return {};

  const { data: orderStats } = await supabase
    .from("orders")
    .select("sku, shop_cd, pay_amt")
    .in("sku", skuList);

  const salesDataMap: Record<string, SalesData> = {};

  for (const order of orderStats || []) {
    if (!order.sku) continue;

    if (!salesDataMap[order.sku]) {
      salesDataMap[order.sku] = {
        cafe24: { orderCount: 0, totalSales: 0 },
        naver: { orderCount: 0, totalSales: 0 },
      };
    }

    if (order.shop_cd === "cafe24") {
      salesDataMap[order.sku].cafe24.orderCount++;
      salesDataMap[order.sku].cafe24.totalSales += order.pay_amt || 0;
    } else if (order.shop_cd === "naver") {
      salesDataMap[order.sku].naver.orderCount++;
      salesDataMap[order.sku].naver.totalSales += order.pay_amt || 0;
    }
  }

  return salesDataMap;
}

/**
 * 제품 업데이트
 */
export async function updateProduct(
  supabase: SupabaseClient,
  id: string,
  changes: Record<string, any>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // 기존 데이터 조회 (로그용)
  const { data: oldData } = await supabase.from("products").select("*").eq("id", id).single();

  const { error } = await supabase
    .from("products")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { success: false, error: error.message };
  }

  // 변경 로그 기록
  for (const [field, newValue] of Object.entries(changes)) {
    if (oldData && oldData[field] !== newValue) {
      await supabase.from("product_change_logs").insert({
        table_name: "products",
        record_id: id,
        field_name: field,
        old_value: oldData[field]?.toString() || null,
        new_value: newValue?.toString() || null,
        changed_by: userId,
        change_type: "update",
      });
    }
  }

  return { success: true };
}

/**
 * 제품 일괄 업데이트
 */
export async function bulkUpdateProducts(
  supabase: SupabaseClient,
  ids: string[],
  changes: Record<string, any>,
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  // 기존 데이터 조회
  const { data: oldDataList } = await supabase.from("products").select("*").in("id", ids);

  const { error } = await supabase
    .from("products")
    .update({
      ...changes,
      updated_at: new Date().toISOString(),
    })
    .in("id", ids);

  if (error) {
    return { success: false, error: error.message };
  }

  // 변경 로그 기록
  for (const oldData of oldDataList || []) {
    for (const [field, newValue] of Object.entries(changes)) {
      if (oldData[field] !== newValue) {
        await supabase.from("product_change_logs").insert({
          table_name: "products",
          record_id: oldData.id,
          field_name: field,
          old_value: oldData[field]?.toString() || null,
          new_value: newValue?.toString() || null,
          changed_by: userId,
          change_type: "bulk_update",
        });
      }
    }
  }

  return { success: true };
}

/**
 * 제품 생성
 */
export async function createProduct(
  supabase: SupabaseClient,
  productData: {
    sku: string;
    product_name?: string;
    parent_sku?: string;
    category?: string;
    color_kr?: string;
    sku_6_size?: string;
    thumbnail_url?: string;
    cost_price?: number;
  },
  userId?: string
): Promise<{ success: boolean; error?: string }> {
  const { data: newProduct, error } = await supabase
    .from("products")
    .insert({
      ...productData,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // 생성 로그
  await supabase.from("product_change_logs").insert({
    table_name: "products",
    record_id: newProduct.id,
    field_name: "sku",
    old_value: null,
    new_value: productData.sku,
    changed_by: userId,
    change_type: "create",
  });

  return { success: true };
}

/**
 * CSV 업로드 (Upsert)
 */
export async function uploadCSV(
  supabase: SupabaseClient,
  csvData: any[],
  userId?: string
): Promise<{ success: boolean; successCount: number; errorCount: number }> {
  let successCount = 0;
  let errorCount = 0;

  for (const row of csvData) {
    if (!row.sku) continue;

    const productData = {
      sku: row.sku,
      product_name: row.product_name || null,
      parent_sku: row.parent_sku || null,
      category: row.category || null,
      color_kr: row.color_kr || null,
      sku_6_size: row.sku_6_size || null,
      thumbnail_url: row.thumbnail_url || null,
      cost_price: row.cost_price ? parseFloat(row.cost_price) : null,
      is_active: row.is_active === "true" || row.is_active === true,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("products").upsert(productData, { onConflict: "sku" });

    if (error) {
      errorCount++;
    } else {
      successCount++;
    }
  }

  // 업로드 로그
  await supabase.from("product_change_logs").insert({
    table_name: "products",
    record_id: "00000000-0000-0000-0000-000000000000",
    field_name: "csv_upload",
    old_value: null,
    new_value: `${successCount} rows uploaded`,
    changed_by: userId,
    change_type: "bulk_update",
  });

  return { success: true, successCount, errorCount };
}

/**
 * 제품 동기화 API 호출
 */
export async function syncProducts(): Promise<{ success: boolean; message?: string; error?: string }> {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!;

  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/sync-inventory-simple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({ trigger: "manual" }),
    });

    const result = await response.json();

    if (response.ok && result.success) {
      return { success: true, message: "제품 동기화가 완료되었습니다!" };
    } else {
      return { success: false, error: result.error || "동기화 중 오류가 발생했습니다." };
    }
  } catch (error: any) {
    return { success: false, error: error.message || "동기화 중 오류가 발생했습니다." };
  }
}
