export type UserRole = 'staff' | 'guardian';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  facilityId?: string;
}

export interface Facility {
  id: string;
  name: string;
  address: string;
  phone: string;
  createdAt: string;
}

export interface Resident {
  id: string;
  facilityId: string;
  name: string;
  dateOfBirth: string;
  admissionDate: string;
  status: 'active' | 'inactive';
  guardianId?: string;
}

export interface Photo {
  id: string;
  facilityId: string;
  fileName: string;
  url: string;
  uploadedAt: string;
  uploadedBy: string;
  residentIds: string[];
  residentNames: string[];
  classified: boolean;
  thumbnail?: string;
}

export interface Guardian {
  id: string;
  email: string;
  name: string;
  residentIds: string[];
}

export interface AuthResponse {
  accessToken: string;
  user: User;
}

export interface StatsData {
  totalPhotos: number;
  photosToday: number;
  totalResidents: number;
  classifiedPhotos: number;
  classificationRate: number;
}
