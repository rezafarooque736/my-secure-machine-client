import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || '',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send cookies (including httpOnly) automatically
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('guac-auth-storage');
    if (token) {
      try {
        const parsed = JSON.parse(token);
        if (parsed?.state?.user?.authToken) {
          config.params = {
            ...config.params,
            token: parsed.state.user.authToken,
          };
        }
      } catch {
        // Invalid token, ignore
      }
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized - redirect to login
      window.location.href = '/';
    }
    return Promise.reject(error);
  },
);

export default axiosInstance;
