/**
 * 창고별 재고 조회 API
 */
import type { Route } from "./+types/inventory-locations";

import makeServerClient from "~/core/lib/supa-client.server";

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const url = new URL(request.url);
  const warehouseId = url.searchParams.get("warehouse_id");
  const sku = url.searchParams.get("sku");

  if (!warehouseId) {
    return Response.json({ error: "warehouse_id is required" }, { status: 400 });
  }

  let query = supabase
    .from("inventory_locations")
    .select(`
      id,
      warehouse_id,
      product_id,
      sku,
      quantity,
      reserved_quantity,
      available_quantity,
      product:products(product_name, color_kr, sku_6_size)
    `)
    .eq("warehouse_id", warehouseId)
    .gt("quantity", 0)
    .order("sku");

  if (sku) {
    query = query.ilike("sku", `%${sku}%`);
  }

  const { data: items, error } = await query;

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  // 제품명 가공
  const processedItems = items?.map(item => ({
    ...item,
    product_name: item.product 
      ? `${item.product.product_name || ""} ${item.product.color_kr || ""} ${item.product.sku_6_size || ""}`.trim()
      : item.sku,
  })) || [];

  return Response.json({ items: processedItems });
}

