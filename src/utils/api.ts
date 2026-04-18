import axios, { AxiosInstance, InternalAxiosRequestConfig, AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.instance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  public getClient(): AxiosInstance {
    return this.instance;
  }

  // Auth
  public login(email: string, password: string) {
    return this.instance.post('/auth/login', { email, password });
  }

  public registerStaff(email: string, password: string, name: string, facilityId: string) {
    return this.instance.post('/auth/register/staff', {
      email,
      password,
      name,
      facilityId,
    });
  }

  public registerGuardian(email: string, password: string, name: string) {
    return this.instance.post('/auth/register/guardian', {
      email,
      password,
      name,
    });
  }

  // Facilities
  public getFacility(id: string) {
    return this.instance.get(`/facilities/${id}`);
  }

  public getFacilityResidents(facilityId: string) {
    return this.instance.get(`/facilities/${facilityId}/residents`);
  }

  public getFacilityPhotos(facilityId: string) {
    return this.instance.get(`/facilities/${facilityId}/photos`);
  }

  // Residents
  public createResident(facilityId: string, data: any) {
    return this.instance.post(`/residents/`, {
      facilityId,
      ...data,
    });
  }

  public registerResidentFace(residentId: string, photoData: FormData) {
    return this.instance.post(
      `/residents/${residentId}/register-face`,
      photoData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  // Photos
  public uploadPhoto(facilityId: string, photoData: FormData) {
    return this.instance.post(
      `/photos/upload`,
      photoData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
  }

  // Guardian
  public getGuardianPhotos() {
    return this.instance.get('/photos/guardian/my-photos');
  }

  public getGuardianProfile() {
    return this.instance.get('/guardians/me/photos');
  }

  public getGuardianResidents() {
    return this.instance.get('/guardians/me/residents');
  }
}

export const apiClient = new ApiClient();
export const api = apiClient.getClient();
