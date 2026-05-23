import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const apiClient = axios.create({
  baseURL: `${BASE_URL}/api/v1`,
  withCredentials: false,
});

// En cliente: adjuntar token desde el store de auth
if (typeof window !== 'undefined') {
  apiClient.interceptors.request.use(config => {
    const raw = localStorage.getItem('superapp-auth');
    if (raw) {
      try {
        const state = JSON.parse(raw);
        const token = state?.state?.accessToken;
        if (token) config.headers.Authorization = `Bearer ${token}`;
      } catch { /* ignore */ }
    }
    return config;
  });

  // Redirigir a /login si hay 401
  apiClient.interceptors.response.use(
    res => res,
    err => {
      if (err?.response?.status === 401) {
        window.location.href = '/login';
      }
      return Promise.reject(err);
    },
  );
}

// ─── Auth ───────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),

  register: (dto: object) =>
    apiClient.post('/auth/register', dto).then(r => r.data),

  me: () =>
    apiClient.get('/auth/me').then(r => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),

  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }).then(r => r.data),

  resetPassword: (token: string, newPassword: string) =>
    apiClient.post('/auth/reset-password', { token, newPassword }).then(r => r.data),
};

// ─── KYC ────────────────────────────────────────────────────────────────────
export const kycApi = {
  getStatus: () =>
    apiClient.get('/kyc/status').then(r => r.data),

  startVerification: () =>
    apiClient.post('/kyc/start').then(r => r.data),

  submitDocuments: (dto: object) =>
    apiClient.post('/kyc/documents', dto).then(r => r.data),
};

// ─── Contracts ──────────────────────────────────────────────────────────────
export const contractsApi = {
  list: () =>
    apiClient.get('/contracts').then(r => r.data),

  get: (id: string) =>
    apiClient.get(`/contracts/${id}`).then(r => r.data),

  create: (dto: object) =>
    apiClient.post('/contracts', dto).then(r => r.data),

  sign: (id: string) =>
    apiClient.post(`/contracts/${id}/sign`).then(r => r.data),

  downloadPdf: (id: string) =>
    apiClient.get(`/contracts/${id}/pdf`, { responseType: 'blob' }).then(r => r.data),
};

// ─── Payments ───────────────────────────────────────────────────────────────
export const paymentsApi = {
  list: () =>
    apiClient.get('/payments').then(r => r.data),

  get: (id: string) =>
    apiClient.get(`/payments/${id}`).then(r => r.data),

  initPayment: (id: string) =>
    apiClient.post(`/payments/${id}/pay`).then(r => r.data),
};

// ─── Mediation ──────────────────────────────────────────────────────────────
export const mediationApi = {
  listCases: () =>
    apiClient.get('/mediation/cases').then(r => r.data),

  getCase: (id: string) =>
    apiClient.get(`/mediation/cases/${id}`).then(r => r.data),

  openCase: (dto: object) =>
    apiClient.post('/mediation/cases', dto).then(r => r.data),

  submitStatement: (id: string, statement: string) =>
    apiClient.post(`/mediation/cases/${id}/statement`, { statement }).then(r => r.data),

  acceptProposal: (id: string) =>
    apiClient.post(`/mediation/cases/${id}/accept`).then(r => r.data),

  escalate: (id: string) =>
    apiClient.post(`/mediation/cases/${id}/escalate`).then(r => r.data),

  sendMessage: (id: string, content: string) =>
    apiClient.post(`/mediation/cases/${id}/messages`, { content }).then(r => r.data),

  getMessages: (id: string) =>
    apiClient.get(`/mediation/cases/${id}/messages`).then(r => r.data),
};

// ─── Insurance ──────────────────────────────────────────────────────────────
export const insuranceApi = {
  getMyPolicies: () =>
    apiClient.get('/insurance/policies').then(r => r.data),

  quote: (dto: object) =>
    apiClient.post('/insurance/quote', dto).then(r => r.data),

  selectQuote: (quoteId: string, providerId: string) =>
    apiClient.post(`/insurance/quote/${quoteId}/select`, { providerId }).then(r => r.data),

  payPolicy: (policyId: string) =>
    apiClient.post(`/insurance/policy/${policyId}/pay`).then(r => r.data),
};

// ─── Deposits ───────────────────────────────────────────────────────────────
export const depositsApi = {
  getByContract: (contractId: string) =>
    apiClient.get(`/deposits/${contractId}`).then(r => r.data),

  requestRelease: (depositId: string, reason: string) =>
    apiClient.post(`/deposits/${depositId}/release`, { reason }).then(r => r.data),
};

// ─── Premium ────────────────────────────────────────────────────────────────
export const premiumApi = {
  getPlans: () =>
    apiClient.get('/premium/plans').then(r => r.data),

  subscribe: (plan: 'FREE' | 'PREMIUM') =>
    apiClient.post('/premium/subscribe', { plan }).then(r => r.data),

  getSubscription: () =>
    apiClient.get('/premium/subscription').then(r => r.data),

  cancel: () =>
    apiClient.delete('/premium/subscription').then(r => r.data),
};

// ─── Listings ───────────────────────────────────────────────────────────────
export const listingsApi = {
  search: (params?: object) =>
    apiClient.get('/listings', { params }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get(`/listings/${id}`).then(r => r.data),

  getMyProperties: () =>
    apiClient.get('/listings/my-properties').then(r => r.data),

  createProperty: (dto: object) =>
    apiClient.post('/listings/properties', dto).then(r => r.data),

  publish: (id: string) =>
    apiClient.post(`/listings/properties/${id}/publish`).then(r => r.data),

  uploadImages: (propertyId: string, files: File[]) => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return apiClient
      .post(`/listings/properties/${propertyId}/images`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then(r => r.data);
  },

  deleteImage: (propertyId: string, imageId: string) =>
    apiClient.delete(`/listings/properties/${propertyId}/images/${imageId}`).then(r => r.data),
};

// ─── Services ───────────────────────────────────────────────────────────────
export const servicesApi = {
  searchProviders: (params?: object) =>
    apiClient.get('/services/providers', { params }).then(r => r.data),

  getProvider: (id: string) =>
    apiClient.get(`/services/providers/${id}`).then(r => r.data),

  createBooking: (dto: object) =>
    apiClient.post('/services/bookings', dto).then(r => r.data),

  quoteBooking: (id: string, dto: object) =>
    apiClient.post(`/services/bookings/${id}/quote`, dto).then(r => r.data),

  acceptBooking: (id: string) =>
    apiClient.post(`/services/bookings/${id}/accept`).then(r => r.data),

  completeBooking: (id: string) =>
    apiClient.post(`/services/bookings/${id}/complete`).then(r => r.data),

  reviewBooking: (id: string, dto: object) =>
    apiClient.post(`/services/bookings/${id}/review`, dto).then(r => r.data),

  getMyBookings: () =>
    apiClient.get('/services/bookings').then(r => r.data),
};
