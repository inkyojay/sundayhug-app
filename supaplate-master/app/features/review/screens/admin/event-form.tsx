/**
 * 관리자용 이벤트 생성/수정 페이지
 */
import type { Route } from "./+types/event-form";

import { useState, useEffect } from "react";
import { Link, useLoaderData, useNavigate, useFetcher, data, redirect } from "react-router";
import { 
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Gift,
  Package,
  ImagePlus,
  GripVertical
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import adminClient from "~/core/lib/supa-admin-client.server";

export function meta(): Route.MetaDescriptors {
  return [
    { title: "이벤트 관리 | 관리자" },
  ];
}

export async function loader({ params }: Route.LoaderArgs) {
  const { id } = params;
  
  // 새 이벤트 생성
  if (id === "new") {
    return data({ 
      event: null,
      products: [],
      gifts: [],
      isNew: true,
    });
  }

  // 기존 이벤트 조회
  const { data: event, error } = await adminClient
    .from("review_events")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !event) {
    throw redirect("/dashboard/events");
  }

  // 제품 목록
  const { data: products } = await adminClient
    .from("review_event_products")
    .select("*")
    .eq("event_id", id)
    .order("sort_order");

  // 사은품 목록
  const { data: gifts } = await adminClient
    .from("review_event_gifts")
    .select("*")
    .eq("event_id", id)
    .order("sort_order");

  return data({ 
    event,
    products: products || [],
    gifts: gifts || [],
    isNew: false,
  });
}

export async function action({ request, params }: Route.ActionArgs) {
  const formData = await request.formData();
  const actionType = formData.get("_action") as string;
  const { id } = params;

  // 이벤트 저장
  if (actionType === "save_event") {
    const eventData = {
      name: formData.get("name") as string,
      description: formData.get("description") as string,
      event_type: formData.get("event_type") as string,
      start_date: formData.get("start_date") as string,
      end_date: formData.get("end_date") as string || null,
      reward_points: parseInt(formData.get("reward_points") as string) || 0,
      banner_image_url: formData.get("banner_image_url") as string || null,
      is_active: formData.get("is_active") === "true",
    };

    if (id === "new") {
      const { data: newEvent, error } = await adminClient
        .from("review_events")
        .insert(eventData)
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return redirect(`/dashboard/events/${newEvent.id}`);
    } else {
      const { error } = await adminClient
        .from("review_events")
        .update(eventData)
        .eq("id", id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: "이벤트가 저장되었습니다." };
    }
  }

  // 제품 추가
  if (actionType === "add_product") {
    const productData = {
      event_id: id,
      product_name: formData.get("product_name") as string,
      product_sub_name: formData.get("product_sub_name") as string || null,
      product_image_url: formData.get("product_image_url") as string || null,
    };

    await adminClient.from("review_event_products").insert(productData);
    return { success: true };
  }

  // 제품 삭제
  if (actionType === "delete_product") {
    const productId = formData.get("product_id") as string;
    await adminClient.from("review_event_products").delete().eq("id", productId);
    return { success: true };
  }

  // 사은품 추가
  if (actionType === "add_gift") {
    const giftData = {
      event_id: id,
      product_id: formData.get("product_id") as string || null,
      gift_name: formData.get("gift_name") as string,
      gift_description: formData.get("gift_description") as string || null,
      gift_image_url: formData.get("gift_image_url") as string || null,
      gift_code: formData.get("gift_code") as string || null,
    };

    await adminClient.from("review_event_gifts").insert(giftData);
    return { success: true };
  }

  // 사은품 삭제
  if (actionType === "delete_gift") {
    const giftId = formData.get("gift_id") as string;
    await adminClient.from("review_event_gifts").delete().eq("id", giftId);
    return { success: true };
  }

  return { success: false };
}

export default function AdminEventFormScreen() {
  const { event, products, gifts, isNew } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();

  // 폼 상태
  const [name, setName] = useState(event?.name || "");
  const [description, setDescription] = useState(event?.description || "");
  const [eventType, setEventType] = useState(event?.event_type || "general");
  const [startDate, setStartDate] = useState(event?.start_date || "");
  const [endDate, setEndDate] = useState(event?.end_date || "");
  const [rewardPoints, setRewardPoints] = useState(event?.reward_points || 0);
  const [bannerImageUrl, setBannerImageUrl] = useState(event?.banner_image_url || "");
  const [isActive, setIsActive] = useState(event?.is_active ?? true);

  // 새 제품 입력
  const [newProductName, setNewProductName] = useState("");
  const [newProductSubName, setNewProductSubName] = useState("");
  const [newProductImage, setNewProductImage] = useState("");

  // 새 사은품 입력
  const [newGiftName, setNewGiftName] = useState("");
  const [newGiftProductId, setNewGiftProductId] = useState("");
  const [newGiftCode, setNewGiftCode] = useState("");
  const [newGiftImage, setNewGiftImage] = useState("");

  const fetcherData = fetcher.data as any;

  const handleSaveEvent = () => {
    fetcher.submit(
      {
        _action: "save_event",
        name,
        description,
        event_type: eventType,
        start_date: startDate,
        end_date: endDate,
        reward_points: rewardPoints.toString(),
        banner_image_url: bannerImageUrl,
        is_active: isActive.toString(),
      },
      { method: "POST" }
    );
  };

  const handleAddProduct = () => {
    if (!newProductName) return;
    
    fetcher.submit(
      {
        _action: "add_product",
        product_name: newProductName,
        product_sub_name: newProductSubName,
        product_image_url: newProductImage,
      },
      { method: "POST" }
    );

    setNewProductName("");
    setNewProductSubName("");
    setNewProductImage("");
  };

  const handleDeleteProduct = (productId: string) => {
    if (!confirm("제품을 삭제하시겠습니까?")) return;
    
    fetcher.submit(
      { _action: "delete_product", product_id: productId },
      { method: "POST" }
    );
  };

  const handleAddGift = () => {
    if (!newGiftName) return;
    
    fetcher.submit(
      {
        _action: "add_gift",
        gift_name: newGiftName,
        product_id: newGiftProductId,
        gift_code: newGiftCode,
        gift_image_url: newGiftImage,
      },
      { method: "POST" }
    );

    setNewGiftName("");
    setNewGiftProductId("");
    setNewGiftCode("");
    setNewGiftImage("");
  };

  const handleDeleteGift = (giftId: string) => {
    if (!confirm("사은품을 삭제하시겠습니까?")) return;
    
    fetcher.submit(
      { _action: "delete_gift", gift_id: giftId },
      { method: "POST" }
    );
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link 
          to="/dashboard/events"
          className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isNew ? "새 이벤트 만들기" : "이벤트 수정"}
          </h1>
          <p className="text-gray-500">후기 이벤트 정보를 입력하세요.</p>
        </div>
      </div>

      {/* 알림 */}
      {fetcherData?.success && fetcherData?.message && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-green-700">✅ {fetcherData.message}</p>
        </div>
      )}
      {fetcherData?.error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-red-700">❌ {fetcherData.error}</p>
        </div>
      )}

      {/* 기본 정보 */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 정보</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>이벤트명 *</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="12월 맘카페 후기 이벤트"
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label>설명</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="이벤트 설명을 입력하세요"
              className="mt-1"
              rows={2}
            />
          </div>

          <div>
            <Label>이벤트 유형 *</Label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value)}
              className="mt-1 w-full h-10 px-3 rounded-md border border-gray-200 bg-white"
            >
              <option value="general">일반 제품</option>
              <option value="abc_bed">ABC 아기침대</option>
              <option value="instagram">인스타그램</option>
              <option value="blog">블로그</option>
            </select>
          </div>

          <div>
            <Label>적립 포인트</Label>
            <Input
              type="number"
              value={rewardPoints}
              onChange={(e) => setRewardPoints(parseInt(e.target.value) || 0)}
              placeholder="0"
              className="mt-1"
            />
          </div>

          <div>
            <Label>시작일 *</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label>종료일</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2">
            <Label>배너 이미지 URL</Label>
            <Input
              value={bannerImageUrl}
              onChange={(e) => setBannerImageUrl(e.target.value)}
              placeholder="https://..."
              className="mt-1"
            />
          </div>

          <div className="md:col-span-2 flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <Label htmlFor="isActive" className="cursor-pointer">
              이벤트 활성화 (고객에게 노출)
            </Label>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleSaveEvent} disabled={!name || !startDate}>
            <Save className="w-4 h-4 mr-2" />
            {isNew ? "이벤트 생성" : "변경사항 저장"}
          </Button>
        </div>
      </div>

      {/* 대상 제품 (새 이벤트가 아닐 때만) */}
      {!isNew && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Package className="w-5 h-5" />
              대상 제품
            </h2>
          </div>

          {/* 제품 목록 */}
          <div className="space-y-3 mb-4">
            {products.map((product: any) => (
              <div 
                key={product.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {product.product_image_url && (
                  <img 
                    src={product.product_image_url} 
                    alt={product.product_name}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{product.product_name}</p>
                  {product.product_sub_name && (
                    <p className="text-sm text-gray-500">{product.product_sub_name}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteProduct(product.id)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>

          {/* 제품 추가 */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">제품 추가</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Input
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                placeholder="제품명 (필수)"
              />
              <Input
                value={newProductSubName}
                onChange={(e) => setNewProductSubName(e.target.value)}
                placeholder="서브옵션 (포켓/스트랩 등)"
              />
              <Input
                value={newProductImage}
                onChange={(e) => setNewProductImage(e.target.value)}
                placeholder="이미지 URL"
              />
            </div>
            <Button
              onClick={handleAddProduct}
              disabled={!newProductName}
              className="mt-3"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              제품 추가
            </Button>
          </div>
        </div>
      )}

      {/* 사은품 (새 이벤트가 아닐 때만) */}
      {!isNew && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Gift className="w-5 h-5" />
              사은품
            </h2>
          </div>

          {/* 사은품 목록 */}
          <div className="space-y-3 mb-4">
            {gifts.map((gift: any) => {
              const linkedProduct = products.find((p: any) => p.id === gift.product_id);
              
              return (
                <div 
                  key={gift.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  {gift.gift_image_url && (
                    <img 
                      src={gift.gift_image_url} 
                      alt={gift.gift_name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      {gift.gift_code && (
                        <span className="px-2 py-0.5 bg-gray-900 text-white text-xs font-bold rounded">
                          {gift.gift_code}
                        </span>
                      )}
                      <p className="font-medium text-gray-900">{gift.gift_name}</p>
                    </div>
                    {linkedProduct && (
                      <p className="text-sm text-gray-500">
                        → {linkedProduct.product_name} 후기 작성 시
                      </p>
                    )}
                    {!linkedProduct && (
                      <p className="text-sm text-orange-600">공통 사은품</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteGift(gift.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}
          </div>

          {/* 사은품 추가 */}
          <div className="border-t border-gray-200 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">사은품 추가</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Input
                value={newGiftName}
                onChange={(e) => setNewGiftName(e.target.value)}
                placeholder="사은품명 (필수)"
              />
              <select
                value={newGiftProductId}
                onChange={(e) => setNewGiftProductId(e.target.value)}
                className="h-10 px-3 rounded-md border border-gray-200 bg-white"
              >
                <option value="">연결 제품 (공통이면 비워두세요)</option>
                {products.map((p: any) => (
                  <option key={p.id} value={p.id}>{p.product_name}</option>
                ))}
              </select>
              <Input
                value={newGiftCode}
                onChange={(e) => setNewGiftCode(e.target.value)}
                placeholder="선택 코드 (A, B 등)"
              />
              <Input
                value={newGiftImage}
                onChange={(e) => setNewGiftImage(e.target.value)}
                placeholder="이미지 URL"
              />
            </div>
            <Button
              onClick={handleAddGift}
              disabled={!newGiftName}
              className="mt-3"
              variant="outline"
            >
              <Plus className="w-4 h-4 mr-2" />
              사은품 추가
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

