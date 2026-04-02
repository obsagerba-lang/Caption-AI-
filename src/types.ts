export type AppStyle = 'neon' | 'galaxy' | 'pop' | 'glass';

export type Tone = 
  | 'funny' 
  | 'romantic' 
  | 'savage' 
  | 'aesthetic' 
  | 'motivational' 
  | 'emotional' 
  | 'professional' 
  | 'luxury' 
  | 'travel'
  | 'viral'
  | 'casual'
  | 'minimalist'
  | 'witty'
  | 'inspiring'
  | 'informative'
  | 'short';

export type Language = 
  | 'English' 
  | 'French' 
  | 'Spanish' 
  | 'Portuguese' 
  | 'Swahili' 
  | 'Arabic' 
  | 'Hindi' 
  | 'German' 
  | 'Amharic' 
  | 'Afaan Oromo'
  | 'Portuguese (Brazil)';

export type Platform = 
  | 'Instagram' 
  | 'TikTok' 
  | 'Facebook' 
  | 'WhatsApp Status' 
  | 'Snapchat'
  | 'LinkedIn'
  | 'Pinterest'
  | 'Twitter/X';

export interface CaptionRequest {
  images?: { data: string; mimeType: string }[];
  description?: string;
  tone: Tone;
  languages: Language[];
  platform: Platform;
  count: number;
  linesPerCaption: number;
  emojiIntensity: number; // 0: None, 1: Low, 2: Medium, 3: Abundant
  hashtagCount: number;
  hashtagType: 'popular' | 'niche' | 'branded';
  hashtagLength: 'short' | 'medium' | 'long';
}

export interface CaptionItem {
  text: string;
  copy_button: true;
}

export interface FavoriteCaption {
  id: string;
  text: string;
  language: Language;
}

export interface GeneratedCaptions {
  image_understanding?: {
    description: string;
    mood: string;
    elements?: string[];
  };
  captions?: Record<Language, (CaptionItem | string)[]>;
  hashtags?: string[];
  ui_hints?: {
    copy_enabled: true;
    save_enabled: true;
    regenerate_enabled: true;
  };
  error?: string;
}

export interface Draft {
  id: string;
  images?: { data: string; mimeType: string }[];
  description: string;
  tone: Tone;
  languages: Language[];
  platform: Platform;
  count: number;
  linesPerCaption: number;
  emojiIntensity: number;
  hashtagCount: number;
  hashtagType: 'popular' | 'niche' | 'branded';
  hashtagLength: 'short' | 'medium' | 'long';
  createdAt: number;
}
