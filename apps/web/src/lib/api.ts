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

  // 401 = token expirado/inválido → único caso donde forzamos navegación
  // a /login. Para cualquier otro error (5xx, red, timeout) NO desloguemos
  // ni redirigimos: dejamos que la página o el error boundary lo manejen.
  apiClient.interceptors.response.use(
    res => res,
    err => {
      const status = err?.response?.status;
      if (status === 401) {
        // No estamos ya en una pantalla pública? Si sí, no rebotar en loop.
        const path = typeof window !== 'undefined' ? window.location.pathname : '';
        const isPublic = ['/', '/login', '/register', '/forgot-password', '/reset-password'].some(p =>
          path === p || path.startsWith(p + '/'),
        );
        if (!isPublic) {
          window.location.href = '/login';
        }
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

  // PATCH parcial — solo se actualizan los campos enviados.
  updateProfile: (dto: Record<string, unknown>) =>
    apiClient.patch('/auth/me', dto).then(r => r.data),

  // Soft-delete de la cuenta — requiere reconfirmar password.
  // La info histórica (contratos, pagos, mensajes, bills) se conserva.
  deleteAccount: (password: string, reason?: string) =>
    apiClient.delete('/auth/me', { data: { password, reason } }).then(r => r.data),

  uploadAvatar: (file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return apiClient.post('/auth/me/avatar', fd).then(r => r.data);
  },
  deleteAvatar: () => apiClient.delete('/auth/me/avatar').then(r => r.data),
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

// ─── Admin (role=ADMIN only) ───────────────────────────────────────────────
export const adminApi = {
  stats: () => apiClient.get('/admin/stats').then(r => r.data),

  // Users
  listUsers: (params: { search?: string; role?: string; activeOnly?: boolean } = {}) =>
    apiClient.get('/admin/users', { params }).then(r => r.data),
  setUserActive: (id: string, isActive: boolean) =>
    apiClient.post(`/admin/users/${id}/active`, { isActive }).then(r => r.data),
  changeUserRole: (id: string, role: string) =>
    apiClient.post(`/admin/users/${id}/role`, { role }).then(r => r.data),
  deleteUser: (id: string) =>
    apiClient.delete(`/admin/users/${id}`).then(r => r.data),

  // Properties
  listProperties: (params: { search?: string } = {}) =>
    apiClient.get('/admin/properties', { params }).then(r => r.data),
  forceUnpublishProperty: (id: string) =>
    apiClient.post(`/admin/properties/${id}/force-unpublish`).then(r => r.data),
  deleteProperty: (id: string) =>
    apiClient.delete(`/admin/properties/${id}`).then(r => r.data),

  // Providers
  listProviders: () =>
    apiClient.get('/admin/providers').then(r => r.data),
  verifyProvider: (id: string, isVerified: boolean) =>
    apiClient.post(`/admin/providers/${id}/verify`, { isVerified }).then(r => r.data),
  setProviderActive: (id: string, isActive: boolean) =>
    apiClient.post(`/admin/providers/${id}/active`, { isActive }).then(r => r.data),
  deleteProvider: (id: string) =>
    apiClient.delete(`/admin/providers/${id}`).then(r => r.data),

  // Issues
  listIssues: () =>
    apiClient.get('/admin/issues').then(r => r.data),
  forceCloseIssue: (id: string, note?: string) =>
    apiClient.post(`/admin/issues/${id}/force-close`, { note }).then(r => r.data),

  // Deposits / investments
  listDeposits: (params: { status?: string; invested?: 'yes' | 'no'; currency?: string; search?: string } = {}) =>
    apiClient.get('/admin/deposits', { params }).then(r => r.data),
  getDeposit: (id: string) =>
    apiClient.get(`/admin/deposits/${id}`).then(r => r.data),
  updateDepositInvestment: (id: string, dto: {
    investedIn?: string | null;
    investedAt?: string | null;
    investmentMaturity?: string | null;
    interestRatePct?: number | null;
    investmentNotes?: string | null;
    expectedReleaseDate?: string | null;
  }) => apiClient.put(`/admin/deposits/${id}/investment`, dto).then(r => r.data),

  // Marketing
  marketingStats: () =>
    apiClient.get('/admin/marketing/stats').then(r => r.data),

  /**
   * Descarga el CSV usando el JWT del store (no se puede con <a href> porque
   * Axios necesita inyectar Authorization). Crea un blob y dispara la descarga.
   */
  downloadCsv: async (params: { onlyEmailConsent?: boolean; onlySmsConsent?: boolean; role?: string; city?: string } = {}) => {
    const res = await apiClient.get('/admin/marketing/export.csv', { params, responseType: 'blob' });
    const blob = new Blob([res.data], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `superapp-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};

// ─── Marketing (segmentos + campañas) ─────────────────────────────────────
export const marketingApi = {
  previewSegment: (filters: Record<string, any>): Promise<{ count: number }> =>
    apiClient.post('/marketing/segments/preview', { filters }).then(r => r.data),

  listSegments: () =>
    apiClient.get('/marketing/segments').then(r => r.data),

  getSegment: (id: string) =>
    apiClient.get(`/marketing/segments/${id}`).then(r => r.data),

  listSegmentUsers: (id: string, page = 1) =>
    apiClient.get(`/marketing/segments/${id}/users`, { params: { page } }).then(r => r.data),

  createSegment: (dto: { name: string; description?: string; filters: Record<string, any> }) =>
    apiClient.post('/marketing/segments', dto).then(r => r.data),

  updateSegment: (id: string, dto: { name?: string; description?: string; filters?: Record<string, any> }) =>
    apiClient.patch(`/marketing/segments/${id}`, dto).then(r => r.data),

  deleteSegment: (id: string) =>
    apiClient.delete(`/marketing/segments/${id}`).then(r => r.data),
};

// ─── Marketing → Campañas ──────────────────────────────────────────────────
export const campaignsApi = {
  list: () => apiClient.get('/marketing/campaigns').then(r => r.data),
  get: (id: string) => apiClient.get(`/marketing/campaigns/${id}`).then(r => r.data),

  /** Cuántos destinatarios reales (post-consentimiento) tiene la campaña ahora. */
  preview: (id: string): Promise<{ inSegment: number; reachable: number; filtered: number; channel: 'EMAIL' | 'SMS' }> =>
    apiClient.get(`/marketing/campaigns/${id}/preview`).then(r => r.data),

  create: (dto: {
    name: string;
    segmentId: string;
    channel: 'EMAIL' | 'SMS';
    subject?: string;
    body: string;
  }) => apiClient.post('/marketing/campaigns', dto).then(r => r.data),

  update: (id: string, dto: { name?: string; subject?: string; body?: string; segmentId?: string }) =>
    apiClient.patch(`/marketing/campaigns/${id}`, dto).then(r => r.data),

  remove: (id: string) =>
    apiClient.delete(`/marketing/campaigns/${id}`).then(r => r.data),

  cancel: (id: string) =>
    apiClient.post(`/marketing/campaigns/${id}/cancel`).then(r => r.data),

  /** ⚠️ Irreversible. Manda a todos los destinatarios. */
  send: (id: string, confirmedReachable: number) =>
    apiClient.post(`/marketing/campaigns/${id}/send`, { confirmedReachable }).then(r => r.data),
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

  // Perfil de prestador (yo registrándome como gasista/plomero/etc)
  getMyProviderProfile: () =>
    apiClient.get('/services/provider/me').then(r => r.data),
  upsertMyProviderProfile: (dto: {
    businessName: string;
    category: string;
    description?: string;
    cities: string[];
    isActive?: boolean;
    yearsOfExperience?: number;
    hasInsurance?: boolean;
    emergency24h?: boolean;
    hourlyRate?: number;
    calloutFee?: number;
    serviceRadiusKm?: number;
  }) => apiClient.post('/services/provider/me', dto).then(r => r.data),
};

// ─── Provider Account (onboarding completo del prestador) ─────────────────
export const providerAccountApi = {
  getOnboarding: () =>
    apiClient.get('/services/provider/me/onboarding').then(r => r.data),

  updatePersonalData: (dto: {
    documentType: 'DNI' | 'CUIT' | 'CUIL';
    documentNumber: string;
    contactPhone?: string;
    birthDate?: string;
  }) => apiClient.patch('/services/provider/me/personal-data', dto).then(r => r.data),

  updatePayoutAccount: (dto: {
    payoutMethod: 'BANK_TRANSFER' | 'CVU' | 'MERCADOPAGO';
    cbu?: string;
    cvu?: string;
    bankAlias?: string;
    bankName?: string;
    bankAccountHolder?: string;
    bankAccountHolderId?: string;
    mpAccountId?: string;
  }) => apiClient.patch('/services/provider/me/payout-account', dto).then(r => r.data),

  // KYC uploads — uno por endpoint para que el progreso por archivo sea claro
  uploadIdFront: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/services/provider/me/kyc/id-front', fd).then(r => r.data);
  },
  uploadIdBack: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/services/provider/me/kyc/id-back', fd).then(r => r.data);
  },
  uploadSelfie: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/services/provider/me/kyc/selfie', fd).then(r => r.data);
  },
  submitKyc: () => apiClient.post('/services/provider/me/kyc/submit').then(r => r.data),

  // Matrícula
  updateLicense: (dto: { licenseNumber: string; licenseAuthority: string; licenseExpiry?: string }) =>
    apiClient.patch('/services/provider/me/license', dto).then(r => r.data),
  uploadLicense: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/services/provider/me/license/document', fd).then(r => r.data);
  },
  submitLicense: () => apiClient.post('/services/provider/me/license/submit').then(r => r.data),

  // Portfolio (fotos de trabajos)
  addPortfolioPhoto: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return apiClient.post('/services/provider/me/portfolio', fd).then(r => r.data);
  },
  removePortfolioPhoto: (url: string) =>
    apiClient.delete('/services/provider/me/portfolio', { data: { url } }).then(r => r.data),

  // Seguro
  updateInsurance: (dto: {
    hasInsurance: boolean;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    insuranceExpiry?: string;
  }) => apiClient.patch('/services/provider/me/insurance', dto).then(r => r.data),
};

// ─── Admin: revisión de prestadores ───────────────────────────────────────
export const adminProvidersApi = {
  listPending: (filter: 'KYC' | 'LICENSE' | 'ALL' = 'ALL') =>
    apiClient.get('/services/admin/providers/pending', { params: { filter } }).then(r => r.data),
  reviewKyc: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
    apiClient.post(`/services/admin/providers/${id}/kyc/review`, { action, reason }).then(r => r.data),
  reviewLicense: (id: string, action: 'APPROVE' | 'REJECT', reason?: string) =>
    apiClient.post(`/services/admin/providers/${id}/license/review`, { action, reason }).then(r => r.data),
  verifyPayout: (id: string, verified: boolean) =>
    apiClient.post(`/services/admin/providers/${id}/payout/verify`, { verified }).then(r => r.data),
};

// ─── Contract Templates ───────────────────────────────────────────────────
export const contractTemplatesApi = {
  list: (type?: string) =>
    apiClient.get('/contract-templates', { params: type ? { type } : undefined }).then(r => r.data),
  get: (id: string) =>
    apiClient.get(`/contract-templates/${id}`).then(r => r.data),
  create: (dto: { title: string; description?: string; type?: string; content: string }) =>
    apiClient.post('/contract-templates', dto).then(r => r.data),
  update: (id: string, dto: { title?: string; description?: string; content?: string }) =>
    apiClient.patch(`/contract-templates/${id}`, dto).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/contract-templates/${id}`).then(r => r.data),
  duplicate: (id: string) =>
    apiClient.post(`/contract-templates/${id}/duplicate`).then(r => r.data),
  fill: (dto: {
    templateId?: string; customContent?: string;
    landlordName: string; landlordDni: string; landlordAddress: string;
    tenantName: string; tenantDni: string; tenantAddress: string;
    address: string; city: string; province?: string; rooms?: number;
    startDate: string; endDate: string; monthlyRent: number;
    currency: string; deposit: number;
  }) => apiClient.post('/contract-templates/fill', dto).then(r => r.data as { content: string }),
  saveToContract: (contractId: string, customContent: string, templateId?: string) =>
    apiClient.patch(`/contracts/${contractId}/content`, { customContent, templateId }).then(r => r.data),
};

// ─── Realtor / Agencia inmobiliaria ───────────────────────────────────────
export const realtorApi = {
  getMyAgency: () =>
    apiClient.get('/realtor/me').then(r => r.data),
  upsertMyAgency: (dto: {
    agencyName: string;
    cuit?: string;
    licenseNumber?: string;
    licenseAuthority?: string;
    licenseExpiry?: string;
    description?: string;
    cities?: string[];
    phone?: string;
    website?: string;
  }) => apiClient.post('/realtor/me', dto).then(r => r.data),
  getMyListings: () =>
    apiClient.get('/realtor/me/listings').then(r => r.data),
  getMyContracts: () =>
    apiClient.get('/realtor/me/contracts').then(r => r.data),
  uploadLogo: (file: File) => {
    const fd = new FormData(); fd.append('logo', file);
    return apiClient.put('/realtor/me/logo', fd).then(r => r.data);
  },
};

// ─── My Rental (contrato externo del "Particular") ──────────────────────────
export const myRentalApi = {
  get: () =>
    apiClient.get('/my-rental').then(r => r.data),
  upsert: (dto: {
    landlordName: string;
    landlordPhone?: string;
    landlordEmail?: string;
    landlordCbu?: string;
    address: string;
    city: string;
    province?: string;
    monthlyAmount: number;
    currency?: string;
    depositAmount?: number;
    dueDay?: number;
    startDate: string;
    endDate: string;
    notes?: string;
  }) => apiClient.put('/my-rental', dto).then(r => r.data),
  remove: () =>
    apiClient.delete('/my-rental').then(r => r.data),
  listPayments: () =>
    apiClient.get('/my-rental/payments').then(r => r.data),
  registerPayment: (dto: {
    period: string;
    amount: number;
    currency?: string;
    paidAt: string;
    method?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'OTHER';
    receiptUrl?: string;
    note?: string;
  }) => apiClient.post('/my-rental/payments', dto).then(r => r.data),
  deletePayment: (id: string) =>
    apiClient.delete(`/my-rental/payments/${id}`).then(r => r.data),
};

// ─── Bills (presupuesto mensual del Particular) ──────────────────────────
export type PaymentMethod = 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'CARD' | 'AUTO_DEBIT';

export interface BillItem {
  id?: string;
  category: 'RENT' | 'EXPENSES' | 'ELECTRIC' | 'GAS' | 'WATER' | 'ABL' | 'INTERNET' | 'CABLE' | 'INSURANCE' | 'OTHER';
  label: string;
  amount: number | string;
  currency?: string;
  dueDay?: number | null;
  isEnabled?: boolean;
  notes?: string | null;
  sortOrder?: number;
  frozenUntil?: string | null;
  paymentMethod?: PaymentMethod | null;
  autoDebit?: boolean;
}

export const billsApi = {
  list: () =>
    apiClient.get<{ bills: BillItem[]; suggested: BillItem[] }>('/bills').then(r => r.data),
  upsert: (dto: BillItem) =>
    apiClient.post('/bills', dto).then(r => r.data),
  toggle: (id: string, isEnabled: boolean) =>
    apiClient.patch(`/bills/${id}/toggle`, { isEnabled }).then(r => r.data),
  remove: (id: string) =>
    apiClient.delete(`/bills/${id}`).then(r => r.data),
  seedFromRental: () =>
    apiClient.post('/bills/seed-from-rental').then(r => r.data),
  listPayments: () =>
    apiClient.get('/bills/payments').then(r => r.data),
  payMonth: (dto: {
    period: string;
    paidAt: string;
    method?: 'CASH' | 'TRANSFER' | 'MERCADOPAGO' | 'OTHER';
    note?: string;
    overrides?: Record<string, number>;
    skip?: string[];
  }) => apiClient.post('/bills/payments', dto).then(r => r.data),
  deletePayment: (id: string) =>
    apiClient.delete(`/bills/payments/${id}`).then(r => r.data),
  freeze: (id: string, dto: { months?: number; until?: string | null }) =>
    apiClient.patch(`/bills/${id}/freeze`, dto).then(r => r.data),
  freezeAll: (dto: { months?: number; until?: string | null }) =>
    apiClient.patch('/bills/freeze-all', dto).then(r => r.data),
};
