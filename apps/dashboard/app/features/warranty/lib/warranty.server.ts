/**
 * Warranty 서버 로직 (loader/action)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ============================================
// 보증서 목록 조회
// ============================================

export interface WarrantyListParams {
  search?: string;
  statusFilter?: string;
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface WarrantyStats {
  total_warranties: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
  this_week: number;
}

/**
 * 보증서 통계 조회
 */
export async function getWarrantyStats(
  supabase: SupabaseClient
): Promise<WarrantyStats> {
  const { data: statsData } = await supabase
    .from("warranty_stats")
    .select("*")
    .single();

  return (
    statsData || {
      total_warranties: 0,
      pending_count: 0,
      approved_count: 0,
      rejected_count: 0,
      this_week: 0,
    }
  );
}

/**
 * 보증서 목록 조회
 */
export async function getWarrantyList(
  supabase: SupabaseClient,
  params: WarrantyListParams
) {
  const {
    search,
    statusFilter,
    page,
    limit,
    sortBy = "created_at",
    sortOrder = "desc",
  } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("warranties")
    .select(
      `
      id,
      warranty_number,
      tracking_number,
      customer_phone,
      buyer_name,
      product_name,
      product_option,
      warranty_start,
      warranty_end,
      status,
      created_at,
      rejection_reason,
      customers (
        name,
        kakao_nickname
      )
    `,
      { count: "exact" }
    )
    .order(sortBy, { ascending: sortOrder === "asc" });

  // 상태 필터
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  // 검색 (보증서번호, 송장번호, 연락처, 구매자명)
  if (search) {
    query = query.or(
      `warranty_number.ilike.%${search}%,tracking_number.ilike.%${search}%,customer_phone.ilike.%${search}%,buyer_name.ilike.%${search}%`
    );
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1);

  const { data: warranties, count } = await query;

  return {
    warranties: warranties || [],
    totalCount: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

// ============================================
// 보증서 상세 조회
// ============================================

/**
 * 보증서 상세 정보 조회
 */
export async function getWarrantyDetail(
  supabase: SupabaseClient,
  warrantyId: string
) {
  const { data: warranty, error } = await supabase
    .from("warranties")
    .select(
      `
      *,
      customers (
        id,
        name,
        phone,
        email,
        kakao_id,
        kakao_nickname
      ),
      warranty_products (
        id,
        product_code,
        product_name,
        category,
        warranty_months,
        product_image_url
      )
    `
    )
    .eq("id", warrantyId)
    .single();

  if (error || !warranty) {
    throw new Response("보증서를 찾을 수 없습니다.", { status: 404 });
  }

  return warranty;
}

/**
 * 보증서에 연결된 주문 정보 조회
 */
export async function getWarrantyOrderInfo(
  supabase: SupabaseClient,
  orderId: string | null
) {
  if (!orderId) {
    return { orderInfo: null, orderItems: [] };
  }

  const { data: order } = await supabase
    .from("orders")
    .select(
      `
      id,
      uniq,
      shop_ord_no,
      shop_name,
      shop_sale_name,
      shop_opt_name,
      ord_time,
      ord_status,
      to_name,
      to_tel,
      to_htel,
      to_addr1,
      to_addr2,
      to_zipcd,
      invoice_no,
      pay_amt,
      ship_cost,
      ship_msg
    `
    )
    .eq("id", orderId)
    .single();

  let orderItems: any[] = [];
  if (order) {
    const { data: items } = await supabase
      .from("order_items")
      .select("*")
      .eq("order_id", order.id);
    orderItems = items || [];
  }

  return { orderInfo: order || null, orderItems };
}

/**
 * 보증서 이력 조회
 */
export async function getWarrantyLogs(
  supabase: SupabaseClient,
  warrantyId: string
) {
  const { data: logs } = await supabase
    .from("warranty_logs")
    .select("*")
    .eq("warranty_id", warrantyId)
    .order("created_at", { ascending: false });

  return logs || [];
}

/**
 * A/S 신청 이력 조회
 */
export async function getWarrantyAsRequests(
  supabase: SupabaseClient,
  warrantyId: string
) {
  const { data: asRequests } = await supabase
    .from("as_requests")
    .select("*")
    .eq("warranty_id", warrantyId)
    .order("created_at", { ascending: false });

  return asRequests || [];
}

// ============================================
// 보증서 상태 변경
// ============================================

/**
 * 보증서 승인
 */
export async function approveWarranty(
  adminClient: SupabaseClient,
  warrantyId: string,
  warrantyYears: number = 1
) {
  const today = new Date();
  const warrantyEnd = new Date(today);
  warrantyEnd.setFullYear(warrantyEnd.getFullYear() + warrantyYears);

  const warrantyStartStr = today.toISOString().split("T")[0];
  const warrantyEndStr = warrantyEnd.toISOString().split("T")[0];

  const { data, error } = await adminClient
    .from("warranties")
    .update({
      status: "approved",
      approved_at: new Date().toISOString(),
      approved_by: "admin",
      warranty_start: warrantyStartStr,
      warranty_end: warrantyEndStr,
    })
    .eq("id", warrantyId)
    .select("*, customers(name)")
    .single();

  if (error) {
    console.error("승인 오류:", error);
    return {
      success: false,
      error: `승인 실패: ${error.message}`,
      data: null,
      warrantyStartStr: null,
      warrantyEndStr: null,
    };
  }

  return {
    success: true,
    message: "승인되었습니다.",
    data,
    warrantyStartStr,
    warrantyEndStr,
  };
}

/**
 * 보증서 거절
 */
export async function rejectWarranty(
  adminClient: SupabaseClient,
  warrantyId: string,
  rejectionReason: string
) {
  const { data, error } = await adminClient
    .from("warranties")
    .update({
      status: "rejected",
      rejection_reason: rejectionReason || "관리자에 의해 거절됨",
    })
    .eq("id", warrantyId)
    .select("*, customers(name)")
    .single();

  if (error) {
    console.error("거절 오류:", error);
    return { success: false, error: `거절 실패: ${error.message}`, data: null };
  }

  return { success: true, message: "거절되었습니다.", data };
}

/**
 * 보증서 일괄 상태 변경
 */
export async function bulkUpdateWarrantyStatus(
  adminClient: SupabaseClient,
  ids: string[],
  newStatus: string,
  rejectionReason?: string
) {
  if (ids.length === 0) {
    return { success: false, error: "변경할 항목을 선택해주세요." };
  }

  const updateData: any = { status: newStatus };

  if (newStatus === "rejected" && rejectionReason) {
    updateData.rejection_reason = rejectionReason;
  }

  if (newStatus === "approved") {
    updateData.warranty_start = new Date().toISOString();
    const endDate = new Date();
    endDate.setFullYear(endDate.getFullYear() + 5);
    updateData.warranty_end = endDate.toISOString();
  }

  const { error } = await adminClient
    .from("warranties")
    .update(updateData)
    .in("id", ids);

  if (error) {
    return { success: false, error: error.message };
  }

  const statusLabel =
    newStatus === "approved"
      ? "승인"
      : newStatus === "rejected"
        ? "거절"
        : "변경";
  return {
    success: true,
    message: `${ids.length}개 보증서가 ${statusLabel}되었습니다.`,
  };
}

// ============================================
// 보증서 삭제
// ============================================

/**
 * 보증서 삭제
 */
export async function deleteWarranties(
  adminClient: SupabaseClient,
  ids: string[]
) {
  if (ids.length === 0) {
    return { success: false, error: "삭제할 항목을 선택해주세요." };
  }

  try {
    // 1. 먼저 관련 review_submissions 삭제 (외래키 제약조건)
    const { error: reviewError } = await adminClient
      .from("review_submissions")
      .delete()
      .in("warranty_id", ids);

    if (reviewError) {
      console.error("리뷰 삭제 오류:", reviewError);
    }

    // 2. 보증서 삭제
    const { error } = await adminClient.from("warranties").delete().in("id", ids);

    if (error) {
      console.error("삭제 오류:", error);
      return {
        success: false,
        error: `삭제 중 오류가 발생했습니다: ${error.message}`,
      };
    }

    return {
      success: true,
      message: `${ids.length}개 보증서가 삭제되었습니다.`,
    };
  } catch (error: any) {
    console.error("삭제 예외:", error);
    return {
      success: false,
      error: error.message || "삭제 중 오류가 발생했습니다.",
    };
  }
}

// ============================================
// 주문 연결
// ============================================

/**
 * 주문 검색
 */
export async function searchOrders(
  adminClient: SupabaseClient,
  searchQuery: string,
  currentWarrantyId: string
) {
  if (!searchQuery || searchQuery.length < 3) {
    return { success: false, error: "검색어를 3자 이상 입력해주세요." };
  }

  const { data: searchResults, error } = await adminClient
    .from("orders")
    .select(
      `
      id,
      uniq,
      shop_ord_no,
      shop_name,
      shop_sale_name,
      shop_opt_name,
      ord_time,
      ord_status,
      to_name,
      to_tel,
      to_htel,
      invoice_no,
      pay_amt
    `
    )
    .or(
      `invoice_no.ilike.%${searchQuery}%,to_tel.ilike.%${searchQuery}%,to_htel.ilike.%${searchQuery}%,shop_ord_no.ilike.%${searchQuery}%,to_name.ilike.%${searchQuery}%`
    )
    .order("ord_time", { ascending: false })
    .limit(20);

  if (error) {
    return { success: false, error: error.message };
  }

  // 이미 다른 보증서에 연결된 주문 체크
  if (searchResults && searchResults.length > 0) {
    const orderIds = searchResults.map((o) => o.id);
    const { data: linkedWarranties } = await adminClient
      .from("warranties")
      .select("order_id")
      .in("order_id", orderIds)
      .neq("id", currentWarrantyId);

    const linkedOrderIds = new Set(linkedWarranties?.map((w) => w.order_id) || []);
    const resultsWithStatus = searchResults.map((order) => ({
      ...order,
      already_linked: linkedOrderIds.has(order.id),
    }));

    return { success: true, searchResults: resultsWithStatus };
  }

  return { success: true, searchResults: [] };
}

/**
 * 주문 연결
 */
export async function linkOrder(
  adminClient: SupabaseClient,
  warrantyId: string,
  orderId: string
) {
  // 해당 주문이 이미 다른 보증서에 연결되어 있는지 확인
  const { data: existingLink } = await adminClient
    .from("warranties")
    .select("id, warranty_number")
    .eq("order_id", orderId)
    .neq("id", warrantyId)
    .single();

  if (existingLink) {
    return {
      success: false,
      error: `이 주문은 이미 다른 보증서(${existingLink.warranty_number})에 연결되어 있습니다.`,
    };
  }

  // 주문 정보 가져와서 보증서에 연결
  const { data: order } = await adminClient
    .from("orders")
    .select("id, shop_sale_name, shop_opt_name, invoice_no, ord_time, shop_name")
    .eq("id", orderId)
    .single();

  if (!order) {
    return { success: false, error: "주문을 찾을 수 없습니다." };
  }

  const { error } = await adminClient
    .from("warranties")
    .update({
      order_id: orderId,
      tracking_number: order.invoice_no,
      product_name: order.shop_sale_name,
      product_option: order.shop_opt_name,
      sales_channel: order.shop_name,
      order_date: order.ord_time
        ? new Date(order.ord_time).toISOString().split("T")[0]
        : null,
    })
    .eq("id", warrantyId);

  if (error) {
    return { success: false, error: `연결 실패: ${error.message}` };
  }

  return { success: true, message: "주문이 연결되었습니다." };
}

/**
 * 주문 연결 해제
 */
export async function unlinkOrder(
  adminClient: SupabaseClient,
  warrantyId: string
) {
  const { error } = await adminClient
    .from("warranties")
    .update({
      order_id: null,
    })
    .eq("id", warrantyId);

  if (error) {
    return { success: false, error: `연결 해제 실패: ${error.message}` };
  }

  return { success: true, message: "주문 연결이 해제되었습니다." };
}

/**
 * 카카오 알림톡 발송 상태 업데이트
 */
export async function updateKakaoSentStatus(
  adminClient: SupabaseClient,
  warrantyId: string,
  messageId: string
) {
  await adminClient
    .from("warranties")
    .update({
      kakao_sent: true,
      kakao_sent_at: new Date().toISOString(),
      kakao_message_id: messageId,
    })
    .eq("id", warrantyId);
}

// ============================================
// A/S 관련
// ============================================

export interface AsListParams {
  statusFilter?: string;
  typeFilter?: string;
  page: number;
  limit: number;
}

/**
 * A/S 신청 목록 조회
 */
export async function getAsRequestList(
  supabase: SupabaseClient,
  params: AsListParams
) {
  const { statusFilter, typeFilter, page, limit } = params;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("as_requests")
    .select(
      `
      id,
      request_type,
      issue_description,
      status,
      contact_name,
      contact_phone,
      created_at,
      completed_at,
      warranties (
        warranty_number,
        product_name,
        customers (
          name
        )
      )
    `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // 상태 필터
  if (statusFilter && statusFilter !== "all") {
    query = query.eq("status", statusFilter);
  }

  // 유형 필터
  if (typeFilter && typeFilter !== "all") {
    query = query.eq("request_type", typeFilter);
  }

  // 페이지네이션
  query = query.range(offset, offset + limit - 1);

  const { data: asRequests, count } = await query;

  return {
    asRequests: asRequests || [],
    totalCount: count || 0,
    currentPage: page,
    totalPages: Math.ceil((count || 0) / limit),
  };
}

/**
 * A/S 통계 조회
 */
export async function getAsStats(supabase: SupabaseClient) {
  const { data: allRequests } = await supabase
    .from("as_requests")
    .select("status, request_type");

  return {
    total: allRequests?.length || 0,
    received: allRequests?.filter((r) => r.status === "received").length || 0,
    processing: allRequests?.filter((r) => r.status === "processing").length || 0,
    completed: allRequests?.filter((r) => r.status === "completed").length || 0,
  };
}

// ============================================
// 보증서 등록 (공개)
// ============================================

/**
 * 보증서 등록
 */
export async function registerWarranty(
  supabase: SupabaseClient,
  data: {
    userId: string;
    customerName: string;
    phone: string;
    purchaseDate?: string;
    photoUrl: string;
  }
) {
  const { userId, customerName, phone, purchaseDate, photoUrl } = data;
  const normalizedPhone = phone.replace(/-/g, "");

  // 보증서 번호 생성
  const { data: warrantyNumber } = await supabase.rpc("generate_warranty_number");

  // 고객 정보 확인/생성
  let customerId: string | null = null;
  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id")
    .eq("phone", normalizedPhone)
    .single();

  if (existingCustomer) {
    customerId = existingCustomer.id;
    await supabase
      .from("customers")
      .update({ name: customerName })
      .eq("id", customerId);
  } else {
    const { data: newCustomer } = await supabase
      .from("customers")
      .insert({ phone: normalizedPhone, name: customerName })
      .select("id")
      .single();
    customerId = newCustomer?.id || null;
  }

  // 보증서 생성
  const { data: warranty, error } = await supabase
    .from("warranties")
    .insert({
      warranty_number: warrantyNumber || `SH-W-${Date.now()}`,
      user_id: userId,
      customer_id: customerId,
      order_id: null,
      buyer_name: customerName,
      customer_phone: normalizedPhone,
      product_name: "ABC 이동식 아기침대",
      order_date: purchaseDate
        ? new Date(purchaseDate).toISOString().split("T")[0]
        : null,
      status: "pending",
      product_photo_url: photoUrl,
      photo_uploaded_at: new Date().toISOString(),
    })
    .select("warranty_number")
    .single();

  if (error) {
    console.error("Warranty insert error:", error);
    return { success: false, error: "보증서 등록 중 오류가 발생했습니다." };
  }

  return {
    success: true,
    step: "completed",
    warrantyNumber: warranty?.warranty_number,
  };
}
