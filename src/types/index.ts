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

export interface StatsData {
  totalPhotos: number;
  photosToday: number;
  totalResidents: number;
  classifiedPhotos: number;
  classificationRate: number;
  facilityName: string;
  facilityCode: string;
}
