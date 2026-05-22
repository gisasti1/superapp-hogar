import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import Constants from 'expo-constants';
import { useAuthStore } from '../stores/auth.store';
import { RegisterDto } from '@superapp/shared';

const BASE_URL = Constants.expoConfig?.extra?.apiUrl ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Adjuntar JWT en cada request
apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().accessToken;
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Refresh automático si el access token expira
let isRefreshing = false;
let refreshQueue: Array<(token: string) => void> = [];

apiClient.interceptors.response.use(
  res => res,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (isRefreshing) {
        return new Promise(resolve => {
          refreshQueue.push((token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(apiClient(original));
          });
        });
      }

      isRefreshing = true;
      const refreshToken = useAuthStore.getState().refreshToken;

      try {
        const { data } = await axios.post(`${BASE_URL}/api/v1/auth/refresh`, { refreshToken });
        useAuthStore.getState().setAccessToken(data.accessToken);
        refreshQueue.forEach(cb => cb(data.accessToken));
        refreshQueue = [];
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return apiClient(original);
      } catch {
        useAuthStore.getState().clearAuth();
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  register: (dto: RegisterDto) =>
    apiClient.post('/auth/register', dto).then(r => r.data),

  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),

  refresh: (refreshToken: string) =>
    apiClient.post('/auth/refresh', { refreshToken }).then(r => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  me: () => apiClient.get('/auth/me').then(r => r.data),
};

// ─── KYC ──────────────────────────────────────────────────────────────────────

export const kycApi = {
  startVerification: () =>
    apiClient.post('/kyc/start').then(r => r.data),

  uploadDni: (frontUri: string, backUri: string) => {
    const form = new FormData();
    form.append('front', { uri: frontUri, type: 'image/jpeg', name: 'front.jpg' } as any);
    form.append('back', { uri: backUri, type: 'image/jpeg', name: 'back.jpg' } as any);
    return apiClient.post('/kyc/upload-dni', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  uploadSelfie: (uri: string) => {
    const form = new FormData();
    form.append('selfie', { uri, type: 'image/jpeg', name: 'selfie.jpg' } as any);
    return apiClient.post('/kyc/selfie', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },

  getStatus: () => apiClient.get('/kyc/status').then(r => r.data),
};

// ─── Insurance ────────────────────────────────────────────────────────────────

export const insuranceApi = {
  quote: (params: object) =>
    apiClient.post('/insurance/quote', params).then(r => r.data),

  selectQuote: (quoteId: string) =>
    apiClient.post(`/insurance/quote/${quoteId}/select`).then(r => r.data),

  payPolicy: (policyId: string, preferenceId: string) =>
    apiClient.post(`/insurance/policy/${policyId}/pay`, { preferenceId }).then(r => r.data),

  getPolicy: (policyId: string) =>
    apiClient.get(`/insurance/policy/${policyId}`).then(r => r.data),
};

// ─── Contracts ────────────────────────────────────────────────────────────────

export const contractsApi = {
  create: (dto: object) =>
    apiClient.post('/contracts', dto).then(r => r.data),

  get: (id: string) =>
    apiClient.get(`/contracts/${id}`).then(r => r.data),

  list: () =>
    apiClient.get('/contracts').then(r => r.data),

  sign: (id: string) =>
    apiClient.post(`/contracts/${id}/sign`).then(r => r.data),
};

// ─── Payments ────────────────────────────────────────────────────────────────

export const paymentsApi = {
  list: () => apiClient.get('/payments').then(r => r.data),
  pay: (paymentId: string) =>
    apiClient.post(`/payments/${paymentId}/pay`).then(r => r.data),
};

// ─── Mediation ───────────────────────────────────────────────────────────────

export const mediationApi = {
  openCase: (dto: object) =>
    apiClient.post('/mediation/cases', dto).then(r => r.data),

  submitStatement: (caseId: string, content: string) =>
    apiClient.post(`/mediation/cases/${caseId}/statement`, { content }).then(r => r.data),

  getCase: (caseId: string) =>
    apiClient.get(`/mediation/cases/${caseId}`).then(r => r.data),

  listCases: () =>
    apiClient.get('/mediation/cases').then(r => r.data),

  acceptProposal: (caseId: string) =>
    apiClient.post(`/mediation/cases/${caseId}/accept`).then(r => r.data),

  escalate: (caseId: string) =>
    apiClient.post(`/mediation/cases/${caseId}/escalate`).then(r => r.data),
};
