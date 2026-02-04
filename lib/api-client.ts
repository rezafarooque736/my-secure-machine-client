import axios from 'axios';

const api = axios.create({
  baseURL: '/api/proxy/',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add interceptor to include auth token from Zustand store
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const storage = localStorage.getItem('guac-auth-storage');
    if (storage) {
      const { state } = JSON.parse(storage);
      if (state.user?.authToken) {
        // Guacamole API usually expects token in query param or header
        config.params = {
          ...config.params,
          token: state.user.authToken,
        };
      }
    }
  }
  return config;
});

export default api;
