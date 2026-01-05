/**
 * Gift Selection Component
 */
import { Gift } from "lucide-react";
import type { EventGift } from "../types";

interface GiftSelectionProps {
  gifts: EventGift[];
  selectedGiftId: string | null;
  onSelectGift: (id: string) => void;
}

export function GiftSelection({ gifts, selectedGiftId, onSelectGift }: GiftSelectionProps) {
  if (gifts.length <= 1) return null;

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Gift className="w-5 h-5 text-green-500" />
        사은품 선택 *
      </h3>
      <div className="grid grid-cols-2 gap-3">
        {gifts.map((gift) => (
          <button
            key={gift.id}
            type="button"
            onClick={() => onSelectGift(gift.id)}
            className={`p-4 rounded-xl border-2 transition-all text-center ${
              selectedGiftId === gift.id
                ? "border-green-400 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            {gift.gift_code && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 ${
                  selectedGiftId === gift.id
                    ? "bg-green-500 text-white"
                    : "bg-gray-200 text-gray-700"
                }`}
              >
                {gift.gift_code}
              </span>
            )}
            {gift.gift_image_url && (
              <img
                src={gift.gift_image_url}
                alt={gift.gift_name}
                className="w-full aspect-square object-cover rounded-lg mb-2"
              />
            )}
            <p className="font-medium text-gray-900 text-sm">{gift.gift_name}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
