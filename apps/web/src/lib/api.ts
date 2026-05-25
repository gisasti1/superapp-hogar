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

  quickVerify: (dni: string) =>
    apiClient.post('/kyc/quick-verify', { dni }).then(r => r.data),

  uploadDni: (front: File, back: File) => {
    const fd = new FormData();
    fd.append('front', front);
    fd.append('back', back);
    return apiClient.post('/kyc/upload-dni', fd).then(r => r.data);
  },

  uploadSelfie: (selfie: File) => {
    const fd = new FormData();
    fd.append('selfie', selfie);
    return apiClient.post('/kyc/selfie', fd).then(r => r.data);
  },

  validateRenaper: () =>
    apiClient.post('/kyc/validate-renaper').then(r => r.data),
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

  // Comprobante manual (transferencia bancaria, depósito, etc.)
  uploadReceipt: (paymentId: string, file: File, note?: string) => {
    const fd = new FormData();
    fd.append('file', file);
    if (note) fd.append('note', note);
    return apiClient.post(`/payments/${paymentId}/receipt`, fd).then(r => r.data);
  },
  approveReceipt: (paymentId: string) =>
    apiClient.post(`/payments/${paymentId}/receipt/approve`).then(r => r.data),
  rejectReceipt: (paymentId: string, note: string) =>
    apiClient.post(`/payments/${paymentId}/receipt/reject`, { note }).then(r => r.data),
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

  unpublish: (id: string) =>
    apiClient.post(`/listings/properties/${id}/unpublish`).then(r => r.data),

  updateProperty: (id: string, dto: object) =>
    apiClient.patch(`/listings/properties/${id}`, dto).then(r => r.data),

  deleteProperty: (id: string) =>
    apiClient.delete(`/listings/properties/${id}`).then(r => r.data),

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

// ─── Favorites ──────────────────────────────────────────────────────────────
export const favoritesApi = {
  list: () => apiClient.get('/favorites').then(r => r.data),
  listIds: (): Promise<string[]> => apiClient.get('/favorites/ids').then(r => r.data),
  toggle: (propertyId: string): Promise<{ favorited: boolean }> =>
    apiClient.post(`/favorites/${propertyId}/toggle`).then(r => r.data),
  remove: (propertyId: string) =>
    apiClient.delete(`/favorites/${propertyId}`).then(r => r.data),
};

// ─── Rental Requests (solicitar alquiler) ─────────────────────────────────
export const rentalRequestsApi = {
  list: () => apiClient.get('/rental-requests').then(r => r.data),
  get: (id: string) => apiClient.get(`/rental-requests/${id}`).then(r => r.data),
  create: (propertyId: string, dto: { message: string; proposedStartDate?: string; proposedMonths?: number }) =>
    apiClient.post(`/rental-requests/property/${propertyId}`, dto).then(r => r.data),
  approve: (id: string, response?: string) =>
    apiClient.post(`/rental-requests/${id}/approve`, { response }).then(r => r.data),
  reject: (id: string, response?: string) =>
    apiClient.post(`/rental-requests/${id}/reject`, { response }).then(r => r.data),
  cancel: (id: string) =>
    apiClient.post(`/rental-requests/${id}/cancel`).then(r => r.data),
};

// ─── External Listings (MercadoLibre y otras plataformas) ─────────────────
export const externalListingsApi = {
  searchMercadoLibre: (params: { q?: string; city?: string; maxPrice?: number; limit?: number }) =>
    apiClient.get('/external-listings/mercadolibre/search', { params }).then(r => r.data),
};

// ─── Rent Adjustments (ICL / IPC) ──────────────────────────────────────────
export const rentAdjustmentsApi = {
  listByContract: (contractId: string) =>
    apiClient.get(`/rent-adjustments/contract/${contractId}`).then(r => r.data),
  preview: (contractId: string, index: 'ICL' | 'IPC' | 'ICL_IPC_MIX', fromDate?: string) =>
    apiClient.get(`/rent-adjustments/contract/${contractId}/preview`, {
      params: { index, ...(fromDate ? { fromDate } : {}) },
    }).then(r => r.data),
  apply: (
    contractId: string,
    dto: {
      index: 'ICL' | 'IPC' | 'ICL_IPC_MIX' | 'CUSTOM';
      fromDate?: string;
      effectiveFrom?: string;
      multiplier?: number;
      periodLabel?: string;
    },
  ) => apiClient.post(`/rent-adjustments/contract/${contractId}/apply`, dto).then(r => r.data),
};

// ─── Conversations (chat 1:1) ──────────────────────────────────────────────
export const conversationsApi = {
  list: () => apiClient.get('/conversations').then(r => r.data),
  unreadCount: (): Promise<{ total: number }> =>
    apiClient.get('/conversations/unread-count').then(r => r.data),
  get: (id: string) => apiClient.get(`/conversations/${id}`).then(r => r.data),
  start: (dto: { otherUserId: string; contractId?: string; rentalRequestId?: string }) =>
    apiClient.post('/conversations/start', dto).then(r => r.data),
  messages: (id: string, since?: string) =>
    apiClient.get(`/conversations/${id}/messages`, { params: since ? { since } : {} }).then(r => r.data),
  send: (id: string, content: string) =>
    apiClient.post(`/conversations/${id}/messages`, { content }).then(r => r.data),
};

// ─── Contract Reviews (reseñas mutuas) ─────────────────────────────────────
export const contractReviewsApi = {
  create: (contractId: string, dto: { rating: number; comment?: string; ratingDetails?: Record<string, number> }) =>
    apiClient.post(`/contract-reviews/contract/${contractId}`, dto).then(r => r.data),
  listByContract: (contractId: string) =>
    apiClient.get(`/contract-reviews/contract/${contractId}`).then(r => r.data),
  listForUser: (userId: string): Promise<{ reviews: any[]; total: number; averageRating: number }> =>
    apiClient.get(`/contract-reviews/user/${userId}`).then(r => r.data),
};

// ─── Issues (reportar desperfectos) ────────────────────────────────────────
export const issuesApi = {
  list: () => apiClient.get('/issues').then(r => r.data),
  get: (id: string) => apiClient.get(`/issues/${id}`).then(r => r.data),
  create: (propertyId: string, dto: object) =>
    apiClient.post(`/issues/property/${propertyId}`, dto).then(r => r.data),
  updateStatus: (id: string, dto: { status: string; resolutionNote?: string }) =>
    apiClient.patch(`/issues/${id}/status`, dto).then(r => r.data),
  uploadPhotos: (files: File[]): Promise<{ urls: string[] }> => {
    const fd = new FormData();
    files.forEach(f => fd.append('files', f));
    return apiClient.post('/issues/upload-photos', fd).then(r => r.data);
  },
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
