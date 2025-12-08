/**
 * 수면 분석 추천 제품 관리 페이지
 * 
 * Admin에서 추천 제품의 썸네일, 링크, 키워드 등을 관리
 */
import type { Route } from "./+types/product-manage";

import { data, useLoaderData, useFetcher, Form } from "react-router";
import { useState, useEffect } from "react";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  ExternalLink,
  GripVertical,
  Image as ImageIcon
} from "lucide-react";

import { Button } from "~/core/components/ui/button";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";
import { Textarea } from "~/core/components/ui/textarea";
import makeServerClient from "~/core/lib/supa-client.server";

export function meta(): Route.MetaDescriptors {
  return [{ title: "추천 제품 관리 | 관리자" }];
}

// 카테고리 옵션
const CATEGORIES = [
  { value: "bed_safety", label: "침대/낙상 위험" },
  { value: "suffocation", label: "이불/질식 위험" },
  { value: "temperature", label: "온도/환기" },
  { value: "sleep_general", label: "수면 환경 전반" },
];

const AGE_RANGES = [
  { value: "0-3m", label: "0-3개월" },
  { value: "3-6m", label: "3-6개월" },
  { value: "6-12m", label: "6-12개월" },
  { value: "12m+", label: "12개월 이상" },
];

interface Product {
  id: string;
  name: string;
  short_name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  original_price: number | null;
  purchase_url: string;
  category: string;
  keywords: string[];
  age_range: string[];  // 배열로 변경 (중복 선택)
  badge: string | null;
  display_order: number;
  is_active: boolean;
}

export async function loader({ request }: Route.LoaderArgs) {
  const [supabase] = makeServerClient(request);
  
  const { data: products, error } = await supabase
    .from("sleep_recommended_products")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("제품 목록 조회 오류:", error);
  }

  return data({ products: products || [] });
}

export async function action({ request }: Route.ActionArgs) {
  const [supabase] = makeServerClient(request);
  const formData = await request.formData();
  const actionType = formData.get("actionType") as string;

  if (actionType === "create" || actionType === "update") {
    // 체크박스에서 선택된 age_range 값들 수집
    const ageRanges = formData.getAll("age_range") as string[];
    
    const productData = {
      name: formData.get("name") as string,
      short_name: formData.get("short_name") as string,
      description: formData.get("description") as string || null,
      image_url: formData.get("image_url") as string || null,
      price: parseInt(formData.get("price") as string) || 0,
      original_price: formData.get("original_price") ? parseInt(formData.get("original_price") as string) : null,
      purchase_url: formData.get("purchase_url") as string,
      category: formData.get("category") as string,
      keywords: (formData.get("keywords") as string).split(",").map(k => k.trim()).filter(Boolean),
      age_range: ageRanges.length > 0 ? ageRanges : ["0-3m", "3-6m", "6-12m", "12m+"],
      badge: formData.get("badge") as string || null,
      display_order: parseInt(formData.get("display_order") as string) || 0,
      is_active: formData.get("is_active") === "true",
    };

    if (actionType === "create") {
      const { error } = await supabase
        .from("sleep_recommended_products")
        .insert(productData);
      
      if (error) {
        return data({ error: "제품 추가 실패: " + error.message }, { status: 400 });
      }
    } else {
      const id = formData.get("id") as string;
      const { error } = await supabase
        .from("sleep_recommended_products")
        .update(productData)
        .eq("id", id);
      
      if (error) {
        return data({ error: "제품 수정 실패: " + error.message }, { status: 400 });
      }
    }
  }

  if (actionType === "delete") {
    const id = formData.get("id") as string;
    const { error } = await supabase
      .from("sleep_recommended_products")
      .delete()
      .eq("id", id);
    
    if (error) {
      return data({ error: "제품 삭제 실패: " + error.message }, { status: 400 });
    }
  }

  if (actionType === "toggle") {
    const id = formData.get("id") as string;
    const isActive = formData.get("is_active") === "true";
    
    const { error } = await supabase
      .from("sleep_recommended_products")
      .update({ is_active: !isActive })
      .eq("id", id);
    
    if (error) {
      return data({ error: "상태 변경 실패" }, { status: 400 });
    }
  }

  return data({ success: true });
}

export default function ProductManageScreen() {
  const { products } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 저장 완료 시 모달 닫기
  useEffect(() => {
    if (fetcher.state === "idle" && fetcher.data?.success) {
      setIsCreating(false);
      setEditingProduct(null);
    }
  }, [fetcher.state, fetcher.data]);

  const getCategoryLabel = (value: string) => 
    CATEGORIES.find(c => c.value === value)?.label || value;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">추천 제품 관리</h1>
          <p className="text-gray-500 mt-1">수면 분석 결과에 표시될 추천 제품을 관리합니다</p>
        </div>
        <Button 
          onClick={() => setIsCreating(true)}
          className="bg-[#FF6B35] hover:bg-[#FF6B35]/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          제품 추가
        </Button>
      </div>

      {/* 제품 목록 */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b text-sm font-medium text-gray-600">
          <div className="col-span-1">순서</div>
          <div className="col-span-2">이미지</div>
          <div className="col-span-3">제품명</div>
          <div className="col-span-2">카테고리</div>
          <div className="col-span-1">가격</div>
          <div className="col-span-1">상태</div>
          <div className="col-span-2">관리</div>
        </div>

        {products.map((product: Product) => (
          <div 
            key={product.id} 
            className="grid grid-cols-12 gap-4 p-4 border-b items-center hover:bg-gray-50"
          >
            <div className="col-span-1 flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">{product.display_order}</span>
            </div>
            
            <div className="col-span-2">
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-16 h-16 object-cover rounded-lg"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>
            
            <div className="col-span-3">
              <p className="font-medium text-gray-900">{product.short_name}</p>
              <p className="text-sm text-gray-500 truncate">{product.name}</p>
              {product.badge && (
                <span className="inline-block mt-1 px-2 py-0.5 bg-orange-100 text-orange-700 text-xs rounded-full">
                  {product.badge}
                </span>
              )}
            </div>
            
            <div className="col-span-2">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full">
                {getCategoryLabel(product.category)}
              </span>
            </div>
            
            <div className="col-span-1">
              <p className="font-medium">{product.price.toLocaleString()}원</p>
              {product.original_price && (
                <p className="text-xs text-gray-400 line-through">
                  {product.original_price.toLocaleString()}원
                </p>
              )}
            </div>
            
            <div className="col-span-1">
              <fetcher.Form method="post">
                <input type="hidden" name="actionType" value="toggle" />
                <input type="hidden" name="id" value={product.id} />
                <input type="hidden" name="is_active" value={String(product.is_active)} />
                <button
                  type="submit"
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.is_active 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {product.is_active ? "활성" : "비활성"}
                </button>
              </fetcher.Form>
            </div>
            
            <div className="col-span-2 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditingProduct(product)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <a
                href={product.purchase_url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-500 hover:text-gray-700"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
              <fetcher.Form method="post" onSubmit={(e) => {
                if (!confirm("정말 삭제하시겠습니까?")) e.preventDefault();
              }}>
                <input type="hidden" name="actionType" value="delete" />
                <input type="hidden" name="id" value={product.id} />
                <Button variant="outline" size="sm" type="submit" className="text-red-500 hover:text-red-700">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </fetcher.Form>
            </div>
          </div>
        ))}

        {products.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            등록된 제품이 없습니다. 제품을 추가해주세요.
          </div>
        )}
      </div>

      {/* 제품 추가/수정 모달 */}
      {(isCreating || editingProduct) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {isCreating ? "제품 추가" : "제품 수정"}
              </h2>
              <button 
                onClick={() => { setIsCreating(false); setEditingProduct(null); }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <fetcher.Form method="post" className="p-6 space-y-4">
              <input type="hidden" name="actionType" value={isCreating ? "create" : "update"} />
              {editingProduct && <input type="hidden" name="id" value={editingProduct.id} />}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>제품명 *</Label>
                  <Input 
                    name="name" 
                    defaultValue={editingProduct?.name || ""} 
                    placeholder="썬데이허그 ABC 아기침대"
                    required
                  />
                </div>
                <div>
                  <Label>짧은 이름 *</Label>
                  <Input 
                    name="short_name" 
                    defaultValue={editingProduct?.short_name || ""} 
                    placeholder="ABC 아기침대"
                    required
                  />
                </div>
              </div>

              <div>
                <Label>설명</Label>
                <Textarea 
                  name="description" 
                  defaultValue={editingProduct?.description || ""} 
                  placeholder="안전한 수면을 위한 접이식 아기침대"
                  rows={2}
                />
              </div>

              <div>
                <Label>이미지 URL</Label>
                <Input 
                  name="image_url" 
                  defaultValue={editingProduct?.image_url || ""} 
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>현재 가격 (원) *</Label>
                  <Input 
                    name="price" 
                    type="number"
                    defaultValue={editingProduct?.price || 0} 
                    required
                  />
                </div>
                <div>
                  <Label>원래 가격 (할인 표시용)</Label>
                  <Input 
                    name="original_price" 
                    type="number"
                    defaultValue={editingProduct?.original_price || ""} 
                  />
                </div>
              </div>

              <div>
                <Label>구매 링크 *</Label>
                <Input 
                  name="purchase_url" 
                  defaultValue={editingProduct?.purchase_url || ""} 
                  placeholder="https://smartstore.naver.com/..."
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>카테고리 *</Label>
                  <select 
                    name="category" 
                    defaultValue={editingProduct?.category || "bed_safety"}
                    className="w-full h-10 px-3 rounded-md border border-gray-200"
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>뱃지</Label>
                  <Input 
                    name="badge" 
                    defaultValue={editingProduct?.badge || ""} 
                    placeholder="BEST, NEW, 인기 등"
                  />
                </div>
              </div>

              <div>
                <Label>적용 월령 (중복 선택 가능)</Label>
                <div className="flex flex-wrap gap-3 mt-2 p-3 bg-gray-50 rounded-lg">
                  {AGE_RANGES.map(age => (
                    <label key={age.value} className="flex items-center gap-2 cursor-pointer">
                      <input 
                        type="checkbox" 
                        name="age_range" 
                        value={age.value}
                        defaultChecked={
                          editingProduct?.age_range?.includes(age.value) ?? true
                        }
                        className="w-4 h-4 rounded border-gray-300 text-[#FF6B35] focus:ring-[#FF6B35]"
                      />
                      <span className="text-sm text-gray-700">{age.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  선택한 월령의 아기에게만 이 제품이 추천됩니다
                </p>
              </div>

              <div>
                <Label>매칭 키워드 (쉼표로 구분)</Label>
                <Input 
                  name="keywords" 
                  defaultValue={editingProduct?.keywords?.join(", ") || ""} 
                  placeholder="침대, 낙상, 떨어짐, 가장자리"
                />
                <p className="text-xs text-gray-500 mt-1">
                  분석 결과에 이 키워드가 포함되면 해당 제품이 추천됩니다
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>정렬 순서</Label>
                  <Input 
                    name="display_order" 
                    type="number"
                    defaultValue={editingProduct?.display_order || 0} 
                  />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <input 
                    type="checkbox" 
                    name="is_active" 
                    value="true"
                    defaultChecked={editingProduct?.is_active !== false}
                    id="is_active"
                    className="w-4 h-4"
                  />
                  <Label htmlFor="is_active" className="!mb-0">활성화</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => { setIsCreating(false); setEditingProduct(null); }}
                >
                  취소
                </Button>
                <Button type="submit" className="bg-[#FF6B35] hover:bg-[#FF6B35]/90">
                  <Save className="w-4 h-4 mr-2" />
                  {isCreating ? "추가" : "저장"}
                </Button>
              </div>
            </fetcher.Form>
          </div>
        </div>
      )}
    </div>
  );
}

