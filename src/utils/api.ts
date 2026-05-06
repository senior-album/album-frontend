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

  // ==================== Support ====================

  public reportPhoneClaim(phone: string, note?: string) {
    return this.instance.post('/support/phone-claim', { phone, note: note || '' });
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

  public getFacilityResidents(facilityId: string, params?: { skip?: number; limit?: number }) {
    return this.instance.get(`/facilities/${facilityId}/residents`, {
      params: { limit: 500, ...params },
    });
  }

  public getFacilityPhotos(facilityId: string, params?: { skip?: number; limit?: number }) {
    // 백엔드 기본 limit=50 — 명시 안 하면 50장 컷. launch target (30명 사용자 / 시설 1곳)
    // 기준 500 이면 충분, 그 이상은 별도 페이지네이션 PR (B) 에서 처리.
    return this.instance.get(`/facilities/${facilityId}/photos`, {
      params: { limit: 500, ...params },
    });
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
    invite_type?: 'sms' | 'in_app';
    phone?: string;
    email?: string;
    invitee_user_id?: string;
    relationship_type?: string;
    message?: string;
  }) {
    return this.instance.post('/invitations', data);
  }

  // T-149: 가입 회원 초대용 — 전화번호/이메일 정확 일치만 매칭, 결과는 마스킹.
  public searchUser(query: string) {
    return this.instance.get<{
      id: string;
      name_masked: string;
      phone_masked: string | null;
      email_masked: string | null;
    } | null>('/users/search', { params: { query } });
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

  // ==================== Admin (운영자 전용, T-144~) ====================

  public listAdminUsers(params?: {
    role?: string;
    facility_id?: string;
    is_active?: boolean | string;
    q?: string;
    page?: number;
    size?: number;
  }) {
    return this.instance.get('/admin/users', { params });
  }

  public patchAdminUser(
    userId: string,
    body: {
      is_active?: boolean;
      is_admin?: boolean;
      is_operator?: boolean;
      facility_id?: string | null;
    },
  ) {
    return this.instance.patch(`/admin/users/${userId}`, body);
  }

  // T-145
  public listAdminFacilities(params?: { q?: string; page?: number; size?: number }) {
    return this.instance.get('/admin/facilities', { params });
  }

  public createAdminFacility(body: { name: string; address: string; phone?: string; code?: string }) {
    return this.instance.post('/admin/facilities', body);
  }

  public patchAdminFacility(
    facilityId: string,
    body: { name?: string; address?: string; phone?: string },
  ) {
    return this.instance.patch(`/admin/facilities/${facilityId}`, body);
  }

  // T-146
  public listAdminGuardians(params?: {
    facility_id?: string;
    state?: 'pending' | 'approved' | 'rejected';
    page?: number;
    size?: number;
  }) {
    return this.instance.get('/admin/guardians', { params });
  }

  // T-147
  public listAdminPhotoJobs(params?: {
    status?: 'pending' | 'processing' | 'completed' | 'failed' | string;
    facility_id?: string;
    page?: number;
    size?: number;
  }) {
    return this.instance.get('/admin/photo-jobs', { params });
  }

  public retryAdminPhotoJob(jobId: string) {
    return this.instance.post(`/admin/photo-jobs/${jobId}/retry`);
  }

  // T-148
  public getAdminStats() {
    return this.instance.get('/admin/stats');
  }

  // ==================== Wellness Logs (T-241) ====================

  public listWellnessLogs(
    residentId: string,
    params?: { start_date?: string; end_date?: string },
  ) {
    return this.instance.get(`/residents/${residentId}/wellness-logs`, { params });
  }

  public getWellnessLog(residentId: string, logDate: string) {
    return this.instance.get(`/residents/${residentId}/wellness-logs/${logDate}`);
  }

  public upsertWellnessLog(
    residentId: string,
    logDate: string,
    body: {
      mobility_status?: string | null;
      meal_breakfast?: string | null;
      meal_lunch?: string | null;
      meal_dinner?: string | null;
      notes?: string | null;
    },
  ) {
    return this.instance.put(`/residents/${residentId}/wellness-logs/${logDate}`, body);
  }

  // ==================== Facility Permissions (T-150) ====================

  public listFacilityPermissionKeys() {
    return this.instance.get('/facility-permissions/keys');
  }

  public listFacilityStaffPermissions() {
    return this.instance.get('/facility-permissions/staff');
  }

  public getMyFacilityPermissions() {
    return this.instance.get('/facility-permissions/me');
  }

  public grantFacilityPermission(userId: string, permissionKey: string) {
    return this.instance.post('/facility-permissions/grant', {
      user_id: userId,
      permission_key: permissionKey,
    });
  }

  public revokeFacilityPermission(userId: string, permissionKey: string) {
    return this.instance.delete(
      `/facility-permissions/${userId}/${permissionKey}`,
    );
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.getClient();
