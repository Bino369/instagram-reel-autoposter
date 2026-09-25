import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ig_poster_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('ig_poster_token');
      localStorage.removeItem('ig_poster_user');
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new Event('auth-logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data;
  },
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },
};

export const videoApi = {
  list: async () => {
    const res = await api.get('/videos');
    return res.data;
  },
  upload: async (formData, onProgress) => {
    const res = await api.post('/videos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: onProgress,
    });
    return res.data;
  },
  update: async (id, formData) => {
    const res = await api.patch(`/videos/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  delete: async (id) => {
    const res = await api.delete(`/videos/${id}`);
    return res.data;
  },
  reorder: async (items) => {
    const res = await api.post('/videos/reorder', { items });
    return res.data;
  },
  postNow: async (id) => {
    const res = await api.post(`/videos/${id}/post-now`);
    return res.data;
  },
};

export const logApi = {
  list: async () => {
    const res = await api.get('/logs');
    return res.data;
  },
};

export const settingsApi = {
  getInstagram: async () => {
    const res = await api.get('/settings/instagram');
    return res.data;
  },
  saveInstagram: async (username, password) => {
    const res = await api.post('/settings/instagram', { username, password });
    return res.data;
  },
  getSchedule: async () => {
    const res = await api.get('/settings/schedule');
    return res.data;
  },
  saveSchedule: async (interval_hours) => {
    const res = await api.post('/settings/schedule', { interval_hours });
    return res.data;
  },
};

export default api;
