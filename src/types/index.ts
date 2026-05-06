export type UserRole = 'staff' | 'guardian';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  is_admin?: boolean;
  is_operator?: boolean;
  facility_id?: string;
  phone?: string;
  profile_image?: string;
  is_active?: boolean;
  // T-056: register_staff 직후엔 false. 시설장 승인 후 true.
  is_staff_approved?: boolean;
  created_at?: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  phone: string;
  code: string;
  created_at?: string;
}

export interface Resident {
  id: string;
  facility_id: string;
  name: string;
  birth_date?: string;
  gender?: string;
  room_number?: string;
  medical_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchedResident {
  resident_id: string;
  resident_name?: string;
  confidence?: number;
}

export interface Photo {
  id: string;
  facility_id: string;
  resident_id?: string;
  original_url: string;
  thumbnail_url?: string;
  is_processed: boolean;
  processing_status: string;
  created_at: string;
  matched_residents?: MatchedResident[];
  is_public?: boolean;
  like_count?: number;
  liked_by_me?: boolean;
}

export interface Guardian {
  id: string;
  user_id: string;
  resident_id: string;
  relationship_type?: string;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  facility?: Facility;
}

// T-241: 입소자 안부 일지
export type MobilityStatus = 'independent' | 'walker' | 'wheelchair' | 'bedridden';
export type MealStatus = 'full' | 'partial' | 'refused' | 'skipped';

export interface WellnessLog {
  id: string;
  resident_id: string;
  log_date: string; // ISO date (YYYY-MM-DD)
  mobility_status: MobilityStatus | null;
  meal_breakfast: MealStatus | null;
  meal_lunch: MealStatus | null;
  meal_dinner: MealStatus | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string | null;
}

export interface WellnessLogUpsert {
  mobility_status?: MobilityStatus | null;
  meal_breakfast?: MealStatus | null;
  meal_lunch?: MealStatus | null;
  meal_dinner?: MealStatus | null;
  notes?: string | null;
}

export interface StatsData {
  totalPhotos: number;
  photosToday: number;
  totalResidents: number;
  classifiedPhotos: number;
  classificationRate: number;
  facilityName: string;
  facilityCode: string;
}

// T-150: 시설 직원 메뉴 권한 위임
export const PERMISSION_KEYS = {
  FACILITY_STATS_VIEW: 'facility:stats:view',
  FACILITY_STAFF_APPROVE: 'facility:staff:approve',
} as const;
export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

export interface PermissionKeyOut {
  key: string;
  description: string;
}

export interface StaffPermissionRow {
  user_id: string;
  name: string;
  email: string;
  is_admin: boolean;
  permission_keys: string[];
  has_all_via_role: boolean;
}

export interface MyPermissions {
  permission_keys: string[];
  has_all_via_role: boolean;
}

// T-143: 시설 사용 지표 트렌드
export type StatsRange = '3m' | '6m' | '12m';

export interface StatsTrendBucket {
  month: string; // YYYY-MM
  photos_uploaded: number;
  photos_classified: number;
  matching_rate: number; // 0..100, 1 decimal
  active_guardians: number;
  photos_unprocessed_eom: number;
}

export interface StatsTrendsResponse {
  facility_id: string;
  range: StatsRange;
  items: StatsTrendBucket[];
}

// T-056: 직원 승인
export interface PendingStaffRow {
  user_id: string;
  email: string;
  name: string;
  phone?: string | null;
  created_at?: string | null;
}

export interface PendingStaffListResponse {
  items: PendingStaffRow[];
}

export interface StaffApprovalActionResponse {
  user_id: string;
  is_staff_approved: boolean;
  is_rejected: boolean;
}
