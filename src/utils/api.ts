import axios, { AxiosInstance, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,  // httpOnly 쿠키 자동 전송
    });

    // Response interceptor — 401 시 토큰 갱신 시도 후 실패하면 로그아웃
    this.instance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        // FastAPI 422 는 detail 이 [{type, loc, msg, input}, ...] 배열 — 그대로 렌더하면 React #31 로 화면이 죽음.
        // 여기서 읽기 쉬운 문자열로 평탄화해 downstream 코드가 detail 을 문자열로 가정해도 안전하게.
        const data: any = error.response?.data;
        if (data && typeof data === 'object') {
          if (Array.isArray(data.detail)) {
            data.detail = data.detail
              .map((d: any) => {
                if (typeof d === 'string') return d;
                if (d && typeof d === 'object') {
                  const loc = Array.isArray(d.loc) ? d.loc.filter((s: any) => s !== 'body').join('.') : '';
                  return loc ? `${loc}: ${d.msg ?? ''}`.trim() : (d.msg ?? JSON.stringify(d));
                }
                return String(d);
              })
              .join('; ');
          } else if (data.detail && typeof data.detail === 'object') {
            data.detail = data.detail.msg ?? JSON.stringify(data.detail);
          }
        }

        const originalRequest = error.config as any;
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;
          try {
            await this.instance.post('/auth/refresh');
            // 쿠키가 자동으로 갱신되므로 그대로 재요청
            return this.instance(originalRequest);
          } catch {
            // 갱신도 실패 → 로그아웃
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
    consents?: Array<{ document_id: string; agreed: boolean }>;
  }) {
    return this.instance.post('/auth/register/guardian', data);
  }

  public getActiveConsents() {
    return this.instance.get('/consents/active');
  }

  public getMe() {
    return this.instance.get('/auth/me');
  }

  // ==================== Legal (T-020 PR3) ====================

  public getLegalSettings() {
    return this.instance.get<Record<string, string>>('/legal/settings');
  }

  public updateLegalSettings(settings: Record<string, string>) {
    return this.instance.put<Record<string, string>>('/legal/settings', { settings });
  }

  public getAllConsentDocuments() {
    return this.instance.get('/consents/admin/all');
  }

  public publishConsentDocument(data: {
    type: string;
    version: string;
    title: string;
    content: string;
    is_mandatory?: boolean;
  }) {
    return this.instance.post('/consents/admin/publish', data);
  }

  // ==================== Phone OTP ====================

  public sendPhoneOtp(phone: string) {
    return this.instance.post('/auth/phone/otp/send', { phone });
  }

  public verifyPhoneOtp(phone: string, code: string) {
    return this.instance.post('/auth/phone/otp/verify', { phone, code });
  }

  // ==================== Facilities ====================

  public getFacility(id: string) {
    return this.instance.get(`/facilities/${id}`);
  }

  public searchFacilities(q: string, limit = 20) {
    return this.instance.get('/facilities/search', { params: { q, limit } });
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
    return this.instance.post('/residents', data);
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

  // T-030: 입소자 CSV 일괄 import
  public downloadResidentImportTemplate() {
    // CSV 본문을 그대로 받아 브라우저 다운로드 — responseType='blob' 으로 binary 보존.
    return this.instance.get('/residents/import/template', { responseType: 'blob' });
  }

  public importResidentsCsv(facilityId: string, file: File) {
    const form = new FormData();
    form.append('file', file);
    return this.instance.post(`/residents/import?facility_id=${facilityId}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
    phone?: string;
    email?: string;
    relationship_type?: string;
    message?: string;
  }) {
    return this.instance.post('/invitations', data);
  }

  public requestFacilityConnection(data: {
    facility_code: string;
    relationship_type?: string;
    message?: string;
  }) {
    return this.instance.post('/guardians/me/connect', data);
  }

  public getFacilityInvitations(facilityId: string) {
    return this.instance.get(`/invitations/facility/${facilityId}`);
  }

  // ==================== Kakao Auth ====================

  public getKakaoLoginUrl() {
    return this.instance.get('/auth/kakao/login-url');
  }

  public kakaoCallback(code: string, state: string) {
    return this.instance.post('/auth/kakao/callback', null, { params: { code, state } });
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

  public approveGuardian(guardianId: string, approved: boolean, rejectReason?: string, residentId?: string) {
    return this.instance.post(`/guardians/${guardianId}/approve`, {
      approved,
      reject_reason: rejectReason,
      resident_id: residentId,
    });
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.getClient();
