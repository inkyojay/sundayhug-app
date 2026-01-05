/**
 * Event Review Types
 */
import type { Route } from "../+types/event-review";

export interface EventProduct {
  id: string;
  product_name: string;
  product_sub_name?: string;
}

export interface EventGift {
  id: string;
  gift_name: string;
  gift_code?: string;
  gift_image_url?: string;
  product_id?: string;
}

export interface ReviewEvent {
  id: string;
  name: string;
  is_active: boolean;
  start_date: string;
  end_date?: string;
  show_warranty_link?: boolean;
  show_referral_source?: boolean;
  referral_source_options?: string[];
  review_event_products: EventProduct[];
  review_event_gifts: EventGift[];
}

export interface UserProfile {
  name?: string;
  phone?: string;
  address?: string;
  address_detail?: string;
  zipcode?: string;
}

export interface Warranty {
  id: string;
  warranty_number: string;
  product_name: string;
  buyer_name: string;
  status: string;
  created_at: string;
}

export interface PhotoItem {
  file: File;
  preview: string;
}

export type WarrantyMode = "select" | "register" | null;

export type { Route };
