/**
 * 공장 관리 - 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Factory,
  FactoryFormData,
  FactoryActionResult,
} from "./factories.shared";

// ========== 쿼리 파라미터 ==========

export interface FactoryQueryParams {
  search: string;
}

export function parseFactoryQueryParams(url: URL): FactoryQueryParams {
  return {
    search: url.searchParams.get("search") || "",
  };
}

// ========== Loader 함수들 ==========

/**
 * 공장 목록 조회
 */
export async function getFactories(
  supabase: SupabaseClient,
  params: FactoryQueryParams
): Promise<Factory[]> {
  const { search } = params;

  let query = supabase
    .from("factories")
    .select("*")
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("created_at", { ascending: false });

  if (search) {
    query = query.or(
      `factory_name.ilike.%${search}%,factory_code.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load factories:", error);
    return [];
  }

  return data || [];
}

/**
 * 단일 공장 조회
 */
export async function getFactory(
  supabase: SupabaseClient,
  factoryId: string
): Promise<Factory | null> {
  const { data, error } = await supabase
    .from("factories")
    .select("*")
    .eq("id", factoryId)
    .single();

  if (error) {
    console.error("Failed to load factory:", error);
    return null;
  }

  return data;
}

/**
 * 공장별 제조원가 목록 조회
 */
export async function getFactoryProductCosts(
  supabase: SupabaseClient,
  factoryId: string
) {
  const { data, error } = await supabase
    .from("factory_product_costs")
    .select(`
      *,
      product:products(id, product_name, color_kr, sku_6_size)
    `)
    .eq("factory_id", factoryId)
    .order("sku");

  if (error) {
    console.error("Failed to load factory product costs:", error);
    return [];
  }

  return data || [];
}

/**
 * 제품 목록 조회 (제조원가 연결용)
 */
export async function getActiveProducts(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("products")
    .select("id, sku, product_name, color_kr, sku_6_size")
    .eq("is_active", true)
    .order("sku");

  if (error) {
    console.error("Failed to load products:", error);
    return [];
  }

  return data || [];
}

// ========== Action 함수들 ==========

/**
 * 공장 생성
 */
export async function createFactory(
  supabase: SupabaseClient,
  formData: FactoryFormData
): Promise<FactoryActionResult> {
  const factoryData = {
    factory_code: formData.factory_code,
    factory_name: formData.factory_name,
    contact_name: formData.contact_name || null,
    contact_phone: formData.contact_phone || null,
    contact_email: formData.contact_email || null,
    address: formData.address || null,
    notes: formData.notes || null,
    is_active: formData.is_active,
  };

  const { error } = await supabase.from("factories").insert(factoryData);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "공장이 등록되었습니다." };
}

/**
 * 공장 수정
 */
export async function updateFactory(
  supabase: SupabaseClient,
  id: string,
  formData: FactoryFormData
): Promise<FactoryActionResult> {
  const factoryData = {
    factory_code: formData.factory_code,
    factory_name: formData.factory_name,
    contact_name: formData.contact_name || null,
    contact_phone: formData.contact_phone || null,
    contact_email: formData.contact_email || null,
    address: formData.address || null,
    notes: formData.notes || null,
    is_active: formData.is_active,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("factories")
    .update(factoryData)
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "공장 정보가 수정되었습니다." };
}

/**
 * 공장 삭제 (소프트 삭제)
 */
export async function deleteFactory(
  supabase: SupabaseClient,
  id: string
): Promise<FactoryActionResult> {
  const { error } = await supabase
    .from("factories")
    .update({
      is_deleted: true,
      is_active: false,
      deleted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true, message: "공장이 삭제되었습니다." };
}

/**
 * FormData에서 FactoryFormData 추출
 */
export function extractFactoryFormData(formData: FormData): FactoryFormData {
  return {
    factory_code: formData.get("factory_code") as string,
    factory_name: formData.get("factory_name") as string,
    contact_name: (formData.get("contact_name") as string) || "",
    contact_phone: (formData.get("contact_phone") as string) || "",
    contact_email: (formData.get("contact_email") as string) || "",
    address: (formData.get("address") as string) || "",
    notes: (formData.get("notes") as string) || "",
    is_active: formData.get("is_active") === "true",
  };
}

// ========== 제조원가 Action 함수들 ==========

/**
 * 제조원가 저장 (upsert)
 */
export async function saveFactoryProductCost(
  supabase: SupabaseClient,
  factoryId: string,
  data: {
    sku: string;
    productId: string | null;
    costWithoutVat: number;
    vatAmount: number;
    notes: string | null;
  }
): Promise<FactoryActionResult> {
  const { error } = await supabase
    .from("factory_product_costs")
    .upsert({
      factory_id: factoryId,
      product_id: data.productId,
      sku: data.sku,
      cost_without_vat: data.costWithoutVat,
      vat_amount: data.vatAmount,
      notes: data.notes,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "factory_id,sku"
    });

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * 제조원가 삭제
 */
export async function deleteFactoryProductCost(
  supabase: SupabaseClient,
  id: string
): Promise<FactoryActionResult> {
  const { error } = await supabase
    .from("factory_product_costs")
    .delete()
    .eq("id", id);

  if (error) {
    return { error: error.message };
  }

  return { success: true };
}

/**
 * CSV 데이터로 제조원가 일괄 업로드
 */
export async function uploadFactoryProductCostsCSV(
  supabase: SupabaseClient,
  factoryId: string,
  csvData: string
): Promise<FactoryActionResult> {
  const lines = csvData.split("\n").filter(line => line.trim());
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  const skuIndex = headers.findIndex(h => h.includes("sku"));
  const costWithoutVatIndex = headers.findIndex(h => h.includes("부가세") && h.includes("제외") || h.includes("원가"));
  const vatIndex = headers.findIndex(h => h.includes("부가세") && !h.includes("제외") && !h.includes("포함"));
  const costWithVatIndex = headers.findIndex(h => h.includes("부가세") && h.includes("포함") || h.includes("총액"));

  if (skuIndex === -1) {
    return { error: "CSV에 SKU 컬럼이 없습니다." };
  }

  const costsToInsert = [];
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim());
    const sku = values[skuIndex];
    if (!sku) continue;

    let costWithoutVat = 0;
    let vatAmount = 0;

    if (costWithoutVatIndex >= 0) {
      costWithoutVat = parseFloat(values[costWithoutVatIndex]) || 0;
    }
    if (vatIndex >= 0) {
      vatAmount = parseFloat(values[vatIndex]) || 0;
    } else if (costWithVatIndex >= 0 && costWithoutVatIndex >= 0) {
      const costWithVat = parseFloat(values[costWithVatIndex]) || 0;
      vatAmount = costWithVat - costWithoutVat;
    }

    costsToInsert.push({
      factory_id: factoryId,
      sku,
      cost_without_vat: costWithoutVat,
      vat_amount: vatAmount,
    });
  }

  if (costsToInsert.length > 0) {
    const { error } = await supabase
      .from("factory_product_costs")
      .upsert(costsToInsert, {
        onConflict: "factory_id,sku"
      });

    if (error) {
      return { error: error.message };
    }
  }

  return { success: true, message: `${costsToInsert.length}개 제품의 제조원가가 업로드되었습니다.` };
}
