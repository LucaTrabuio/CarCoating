export interface StoreData {
  store_id: string;
  store_name: string;
  address: string;
  postal_code: string;
  prefecture: string;
  city: string;
  tel: string;
  business_hours: string;
  regular_holiday: string;
  access_map_url: string;
  lat: number;
  lng: number;
  has_booth: boolean;
  level1_staff_count: number;
  level2_staff_count: number;
  seo_keywords: string;
  meta_description: string;
  campaign_title: string;
  campaign_deadline: string;
  discount_rate: number;
  campaign_color_code: string;
  min_price_limit: number;
  google_place_id: string;
  line_url: string;
  email: string;
  parking_spaces: number;
  landmark: string;
  nearby_stations: string; // JSON string: [{name, time}]
}

export interface CoatingTier {
  id: string;
  name: string;
  name_en: string;
  tagline: string;
  description: string;
  durability_years: string;
  application_time: string;
  maintenance_interval: string;
  gloss_rating: number; // 1-5
  water_repellency_rating: number; // 1-5
  layer_count: number;
  layer_description: string;
  key_differentiator: string;
  is_popular: boolean;
  discount_tier: number; // 20, 10, or 5
  prices: {
    SS: number;
    S: number;
    M: number;
    L: number;
    LL: number;
    XL: number;
  };
  maintenance_prices: {
    SS: number;
    S: number;
    M: number;
    L: number;
    LL: number;
    XL: number;
  } | null;
}

export interface CoatingOption {
  id: string;
  name: string;
  category: 'prep' | 'coating' | 'maintenance';
  prices: Record<string, number>; // size or type → price
  is_popular: boolean;
}

export interface CarModel {
  make: string;
  make_en: string;
  model: string;
  model_en: string;
  size: 'SS' | 'S' | 'M' | 'L' | 'LL' | 'XL';
}

export interface CaseStudy {
  id: string;
  store_id: string;
  car_make: string;
  car_model: string;
  car_color: string;
  car_year: number;
  coating_tier: string;
  options: string[];
  before_image: string;
  after_image: string;
  staff_comment: string;
  staff_name: string;
  price: number;
  hours: number;
  date: string;
}

export interface GoogleReview {
  author_name: string;
  rating: number;
  text: string;
  time: number;
  relative_time_description: string;
}

export interface BookingRequest {
  id: string;
  store_id: string;
  status: 1 | 2 | 3 | 4; // 1=received, 2=confirmed, 3=canceled, 4=completed
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  car_make: string;
  car_model: string;
  car_size: string;
  plan_name: string;
  options: string[];
  total_price: number;
  choice_1: string; // ISO date + time
  choice_2: string;
  choice_3: string;
  confirmed_datetime: string | null;
  created_at: string;
}

export type CarSize = 'SS' | 'S' | 'M' | 'L' | 'LL' | 'XL';
