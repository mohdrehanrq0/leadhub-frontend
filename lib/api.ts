import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4001',
  withCredentials: true, // Send httpOnly cookies automatically
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach active workspace ID from localStorage
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const workspaceId = localStorage.getItem('leadhub_workspace_id');
    if (workspaceId) {
      config.headers['X-Workspace-ID'] = workspaceId;
    }
  }
  return config;
});

// Response interceptor — handle 401 by redirecting to login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error.response?.status;
    const originalRequest = error.config;

    // Avoid intercepting auth requests (login, refresh, signup) to prevent infinite loops
    const isAuthRequest = originalRequest?.url?.includes('/api/auth/login') ||
                          originalRequest?.url?.includes('/api/auth/refresh') ||
                          originalRequest?.url?.includes('/api/auth/signup');

    if (status === 401 && !isAuthRequest && typeof window !== 'undefined') {
      // Try to refresh the token first
      try {
        await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
          {},
          { withCredentials: true },
        );
        // Retry original request
        return api(originalRequest);
      } catch {
        // Prevent infinite redirect loop if we are already on login, signup, or verify-email pages
        const path = window.location.pathname;
        if (path !== '/login' && path !== '/signup' && path !== '/verify-email') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);

export default api;
