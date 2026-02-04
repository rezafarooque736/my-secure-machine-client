import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  username: string;
  authToken: string;
  dataSource: string;
  availableDataSources: string[];
  role: 'admin' | 'user';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  language: string;
  setAuth: (user: User) => void;
  logout: () => void;
  setLanguage: (lang: string) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      language: 'en',
      setAuth: (user) => set({ user, isAuthenticated: true }),
      logout: async () => {
        const currentUser = get().user;

        // Call logout API to invalidate token on server
        if (currentUser?.authToken) {
          try {
            await axios.delete(`/api/auth/logout?token=${currentUser.authToken}`);
          } catch (error) {
            console.error('Logout API error:', error);
          }
        }

        // Clear local state
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('guac-auth-storage');
        }
      },
      setLanguage: (language) => set({ language }),
    }),
    {
      name: 'guac-auth-storage',
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Additional logic if needed after hydration
        }
      },
    },
  ),
);
