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
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }).then(r => r.data),

  register: (dto: object) =>
    apiClient.post('/auth/register', dto).then(r => r.data),

  me: () =>
    apiClient.get('/auth/me').then(r => r.data),

  logout: (refreshToken: string) =>
    apiClient.post('/auth/logout', { refreshToken }),
};

export const contractsApi = {
  list: () => apiClient.get('/contracts').then(r => r.data),
  get: (id: string) => apiClient.get(`/contracts/${id}`).then(r => r.data),
};

export const paymentsApi = {
  list: () => apiClient.get('/payments').then(r => r.data),
};

export const mediationApi = {
  listCases: () => apiClient.get('/mediation/cases').then(r => r.data),
  getCase: (id: string) => apiClient.get(`/mediation/cases/${id}`).then(r => r.data),
};
