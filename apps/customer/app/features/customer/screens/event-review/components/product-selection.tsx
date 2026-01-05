/**
 * Product Selection Component
 */
import { Package, CheckCircle } from "lucide-react";
import type { EventProduct, EventGift } from "../types";

interface ProductSelectionProps {
  products: EventProduct[];
  gifts: EventGift[];
  selectedProductId: string | null;
  onSelectProduct: (id: string) => void;
}

export function ProductSelection({
  products,
  gifts,
  selectedProductId,
  onSelectProduct,
}: ProductSelectionProps) {
  if (products.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Package className="w-5 h-5 text-blue-500" />
        후기 작성 제품 *
      </h3>
      <div className="space-y-2">
        {products.map((product) => {
          const productGift = gifts.find((g) => g.product_id === product.id);

          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onSelectProduct(product.id)}
              className={`w-full p-4 rounded-xl border transition-all text-left ${
                selectedProductId === product.id
                  ? "border-blue-400 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-3">
                {selectedProductId === product.id ? (
                  <CheckCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900">{product.product_name}</p>
                  {product.product_sub_name && (
                    <p className="text-sm text-gray-500">{product.product_sub_name}</p>
                  )}
                </div>
                {productGift && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-gray-400">사은품</p>
                    <p className="text-sm text-green-600 font-medium">{productGift.gift_name}</p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
