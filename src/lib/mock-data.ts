// Mock auth context
export interface User {
  id: string;
  email: string;
  full_name: string;
  subscription_tier: 'free' | 'premium' | 'premium_plus';
  onboarding_completed: boolean;
  pinterest_connected: boolean;
}

export interface ClosetItem {
  id: string;
  name: string;
  image_url: string;
  category: string;
  subcategory?: string;
  colors: string[];
  brand?: string;
  status: 'ready' | 'needs_wash' | 'at_dry_cleaner' | 'needs_repair';
  tags: string[];
  purchase_price?: number;
  times_worn: number;
  last_worn_date?: string;
}

export interface MatchedLook {
  id: string;
  name: string;
  closet_item_ids: string[];
  occasion?: string;
  season?: string;
  is_favorite: boolean;
  created_by_ai: boolean;
  created_at: string;
}

export const MOCK_CLOSET_ITEMS: ClosetItem[] = [
  { id: '1', name: 'Black Leather Jacket', image_url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=400&h=400&fit=crop', category: 'outerwear', colors: ['#000000'], brand: 'AllSaints', status: 'ready', tags: ['classic', 'edgy'], purchase_price: 350, times_worn: 22 },
  { id: '2', name: 'White Cotton Tee', image_url: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop', category: 'tops', colors: ['#FFFFFF'], brand: 'COS', status: 'ready', tags: ['basic', 'everyday'], purchase_price: 35, times_worn: 45 },
  { id: '3', name: 'Dark Wash Jeans', image_url: 'https://images.unsplash.com/photo-1542272604-787c3835535d?w=400&h=400&fit=crop', category: 'bottoms', colors: ['#1a1a3e'], brand: 'Levi\'s', status: 'ready', tags: ['classic', 'versatile'], purchase_price: 95, times_worn: 38 },
  { id: '4', name: 'Cream Knit Sweater', image_url: 'https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=400&h=400&fit=crop', category: 'tops', colors: ['#F5F0E8'], brand: 'Arket', status: 'ready', tags: ['cozy', 'winter'], purchase_price: 89, times_worn: 15 },
  { id: '5', name: 'Black Chelsea Boots', image_url: 'https://images.unsplash.com/photo-1638247025967-b4e38f787b76?w=400&h=400&fit=crop', category: 'shoes', colors: ['#000000'], brand: 'Dr. Martens', status: 'ready', tags: ['classic'], purchase_price: 169, times_worn: 30 },
  { id: '6', name: 'Sage Linen Dress', image_url: 'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=400&fit=crop', category: 'dresses', colors: ['#8BA888'], status: 'needs_wash', tags: ['summer', 'elegant'], purchase_price: 120, times_worn: 8 },
];

export const MOCK_LOOKS: MatchedLook[] = [
  { id: 'l1', name: 'Casual Friday', closet_item_ids: ['2', '3', '5'], occasion: 'casual', season: 'all', is_favorite: true, created_by_ai: false, created_at: '2026-02-10' },
  { id: 'l2', name: 'Winter Edge', closet_item_ids: ['1', '4', '3', '5'], occasion: 'date_night', season: 'winter', is_favorite: false, created_by_ai: true, created_at: '2026-02-08' },
];

export const CATEGORIES = ['All', 'Tops', 'Bottoms', 'Outerwear', 'Dresses', 'Shoes', 'Accessories'] as const;
export const STATUSES = ['All', 'Ready', 'Needs Wash', 'At Dry Cleaner', 'Needs Repair'] as const;
export const OCCASIONS = ['Work', 'Casual', 'Date Night', 'Event', 'Everyday'] as const;
export const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter', 'All'] as const;
