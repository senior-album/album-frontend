import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor — JWT 토큰 자동 첨부
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor — 401 시 토큰 갱신 시도 후 실패하면 로그아웃
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;
          try {
            const refreshRes = await this.instance.post('/auth/refresh');
            const newToken = refreshRes.data.accessToken;
            localStorage.setItem('accessToken', newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.instance(originalRequest);
          } catch {
            // 갱신도 실패 → 로그아웃
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            localStorage.removeItem('facility');
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.instance;
  }

  // ==================== Auth ====================

  public login(email: string, password: string) {
    return this.instance.post('/auth/login', { email, password });
  }

  public registerAdmin(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    facilityName: string;
    facilityAddress: string;
    facilityPhone?: string;
  }) {
    return this.instance.post('/auth/register/admin', data);
  }

  public registerStaff(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    facilityCode: string;
  }) {
    return this.instance.post('/auth/register/staff', data);
  }

  public registerGuardian(data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
  }) {
    return this.instance.post('/auth/register/guardian', data);
  }

  public getMe() {
    return this.instance.get('/auth/me');
  }

  // ==================== Facilities ====================

  public getFacility(id: string) {
    return this.instance.get(`/facilities/${id}`);
  }

  public getFacilityStats(facilityId: string) {
    return this.instance.get(`/facilities/${facilityId}/stats`);
  }

  public getFacilityResidents(facilityId: string) {
    return this.instance.get(`/facilities/${facilityId}/residents`);
  }

  public getFacilityPhotos(facilityId: string) {
    return this.instance.get(`/facilities/${facilityId}/photos`);
  }

  // ==================== Residents ====================

  public createResident(data: { facility_id: string; name: string; [key: string]: any }) {
    return this.instance.post('/residents/', data);
  }

  public registerResidentFace(residentId: string, photoData: FormData) {
    return this.instance.post(`/residents/${residentId}/register-face`, photoData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  public getResidentFaces(residentId: string) {
    return this.instance.get(`/residents/${residentId}/faces`);
  }

  public deleteResidentFace(residentId: string, docId: string) {
    return this.instance.delete(`/residents/${residentId}/faces/${docId}`);
  }

  // ==================== Photos ====================

  public uploadPhoto(_facilityId: string, photoData: FormData) {
    return this.instance.post(`/photos/upload?facility_id=${_facilityId}`, photoData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  }

  // ==================== Photo Like/Share ====================

  public toggleLike(photoId: string) {
    return this.instance.post(`/photos/${photoId}/like`);
  }

  public createShareLink(photoId: string) {
    return this.instance.post(`/photos/${photoId}/share`);
  }

  public getSharedPhoto(shareToken: string) {
    return this.instance.get(`/photos/shared/${shareToken}`);
  }

  // ==================== Photo Tag (수동 분류) ====================

  public addPhotoTag(photoId: string, residentId: string) {
    return this.instance.post(`/photos/${photoId}/tag?resident_id=${residentId}`);
  }

  public removePhotoTag(photoId: string, residentId: string) {
    return this.instance.delete(`/photos/${photoId}/tag/${residentId}`);
  }

  // ==================== Photo Delete ====================

  public deletePhoto(photoId: string) {
    return this.instance.delete(`/photos/${photoId}`);
  }

  public bulkDeletePhotos(photoIds: string[]) {
    return this.instance.post('/photos/bulk-delete', photoIds);
  }

  // ==================== Photo Publish ====================

  public togglePublish(photoId: string) {
    return this.instance.post(`/photos/${photoId}/publish`);
  }

  public bulkPublish(photoIds: string[], isPublic: boolean) {
    return this.instance.post(`/photos/bulk-publish?is_public=${isPublic}`, photoIds);
  }

  // ==================== Guardian ====================

  public getGuardianPhotos() {
    return this.instance.get('/guardians/me/photos');
  }

  public getGuardianResidents() {
    return this.instance.get('/guardians/me/residents');
  }

  public getGuardianStatus() {
    return this.instance.get('/guardians/me/status');
  }

  public getGuardianProfile() {
    return this.instance.get('/guardians/me');
  }

  public updateGuardianProfile(data: { name?: string; phone?: string }) {
    return this.instance.put('/guardians/me/profile', null, { params: data });
  }

  public updateGuardianNotificationSettings(enabled: boolean) {
    return this.instance.put('/guardians/me/settings', null, {
      params: { notification_enabled: enabled },
    });
  }

  // ==================== Invitations (초대) ====================

  public getMyInvitations() {
    return this.instance.get('/invitations/me');
  }

  public acceptInvitation(invitationId: string) {
    return this.instance.post(`/invitations/${invitationId}/accept`);
  }

  public rejectInvitation(invitationId: string) {
    return this.instance.post(`/invitations/${invitationId}/reject`);
  }

  public createInvitation(data: {
    resident_id: string;
    phone: string;
    relationship_type?: string;
    message?: string;
  }) {
    return this.instance.post('/invitations', data);
  }

  public getFacilityInvitations(facilityId: string) {
    return this.instance.get(`/invitations/facility/${facilityId}`);
  }

  // ==================== Kakao Auth ====================

  public getKakaoLoginUrl() {
    return this.instance.get('/auth/kakao/login-url');
  }

  public kakaoCallback(code: string) {
    return this.instance.post('/auth/kakao/callback', null, { params: { code } });
  }

  public setRoleAfterKakao(data: {
    role: string;
    facility_code?: string;
    facility_name?: string;
    facility_address?: string;
    facility_phone?: string;
  }) {
    return this.instance.post('/auth/kakao/set-role', null, { params: data });
  }

  // ==================== Guardian Management (Staff/Admin) ====================

  public getPendingGuardians(facilityId: string) {
    return this.instance.get(`/guardians/facility/${facilityId}/pending`);
  }

  public getAllGuardians(facilityId: string) {
    return this.instance.get(`/guardians/facility/${facilityId}/all`);
  }

  public approveGuardian(guardianId: string, approved: boolean, rejectReason?: string) {
    return this.instance.post(`/guardians/${guardianId}/approve`, {
      approved,
      reject_reason: rejectReason,
    });
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.getClient();
