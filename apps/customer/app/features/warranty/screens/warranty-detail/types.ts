/**
 * Warranty Detail Types
 */

export interface WarrantyCustomer {
  id: string;
  name?: string;
  phone?: string;
  email?: string;
  kakao_id?: string;
  kakao_nickname?: string;
}

export interface WarrantyProduct {
  id: string;
  product_code: string;
  product_name: string;
  category?: string;
  warranty_months?: number;
  product_image_url?: string;
}

export interface Warranty {
  id: string;
  warranty_number: string;
  status: WarrantyStatus;
  buyer_name?: string;
  customer_phone: string;
  product_name?: string;
  product_option?: string;
  product_sku?: string;
  sales_channel?: string;
  tracking_number?: string;
  order_date?: string;
  order_id?: string;
  warranty_start?: string;
  warranty_end?: string;
  product_photo_url?: string;
  photo_uploaded_at?: string;
  kakao_sent?: boolean;
  kakao_sent_at?: string;
  kakao_message_id?: string;
  rejection_reason?: string;
  created_at: string;
  customers?: WarrantyCustomer;
  warranty_products?: WarrantyProduct;
}

export type WarrantyStatus = "pending" | "approved" | "rejected" | "expired";

export interface OrderInfo {
  id: string;
  uniq?: string;
  shop_ord_no?: string;
  shop_name?: string;
  shop_sale_name?: string;
  shop_opt_name?: string;
  ord_time?: string;
  ord_status?: string;
  to_name?: string;
  to_tel?: string;
  to_htel?: string;
  to_addr1?: string;
  to_addr2?: string;
  to_zipcd?: string;
  invoice_no?: string;
  pay_amt?: number;
  ship_cost?: number;
  ship_msg?: string;
  already_linked?: boolean;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_name: string;
  shop_opt_name?: string;
  sku_cd?: string;
  stock_cd?: string;
  sale_cnt?: number;
  pay_amt?: number;
}

export interface WarrantyLog {
  id: string;
  warranty_id: string;
  action: string;
  description?: string;
  created_at: string;
}

export interface ASRequest {
  id: string;
  warranty_id: string;
  request_type: string;
  status: string;
  issue_description?: string;
  created_at: string;
}
