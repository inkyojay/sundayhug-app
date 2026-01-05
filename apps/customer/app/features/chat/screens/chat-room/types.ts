/**
 * Chat Room Types
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  image_url?: string;
  sources?: string | Source[];
  created_at: string;
}

export interface Source {
  name: string;
  url?: string;
}

export interface BabyProfile {
  id: string;
  user_id: string;
  name: string | null;
  birth_date: string;
  feeding_type: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string | null;
  baby_profile_id: string | null;
  created_at: string;
  baby_profiles?: BabyProfile;
}

export interface SelectedImage {
  file: File;
  preview: string;
}

export interface LoaderData {
  session: ChatSession | null;
  messages: Message[];
  babyProfile: BabyProfile | null;
  isNew: boolean;
}
