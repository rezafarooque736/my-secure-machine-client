import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface User {
  username: string;
  authToken: string;
  dataSource: string;
  availableDataSources: string[];
  role: 'user';
  sessionId?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  language: string;

  // Actions
  setAuth: (user: User) => void;
  updateSessionId: (sessionId: string) => void;
  logout: () => Promise<void>;
  setLanguage: (lang: string) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Store
// ─────────────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      language: 'en',

      // ── Set auth state after login ────────────────────────────────────────
      // Called in your login page after POST /api/auth/login resolves.
      // The full response object (authToken, username, role, sessionId, etc.)
      // is stored directly.
      setAuth: (user: User) => set({ user, isAuthenticated: true }),

      // ── Patch sessionId separately ────────────────────────────────────────
      // Useful if you create the UserSession asynchronously after setAuth.
      updateSessionId: (sessionId: string) => {
        const current = get().user;
        if (current) {
          set({ user: { ...current, sessionId } });
        }
      },

      // ── Logout ────────────────────────────────────────────────────────────
      // 1. Calls DELETE /api/auth/logout with token + sessionId + username
      //    so the server can revoke the Guacamole token AND close the
      //    UserSession record in one request.
      // 2. Clears Zustand state regardless of API success (client-side
      //    logout is never blocked by a server error).
      logout: async () => {
        const currentUser = get().user;

        if (currentUser?.authToken) {
          try {
            await axios.delete('/api/auth/logout', {
              params: {
                token: currentUser.authToken,
                // Pass sessionId so the route closes the UserSession record
                ...(currentUser.sessionId && {
                  sessionId: currentUser.sessionId,
                }),
                // Pass username for the audit log entry
                ...(currentUser.username && {
                  username: currentUser.username,
                }),
              },
            });
          } catch (error) {
            // Non-fatal — always clear local state even if the API call fails
            // (e.g. network offline, token already expired)
            console.warn('[store] Logout API error (non-fatal):', error);
          }
        }

        // Clear Zustand state — persist middleware will sync to localStorage
        set({ user: null, isAuthenticated: false });
      },

      // ── Language preference ───────────────────────────────────────────────
      setLanguage: (language: string) => set({ language }),
    }),

    {
      name: 'guac-auth-storage', // localStorage key

      // Only persist these fields — avoids storing transient UI state
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
      }),

      onRehydrateStorage: () => (state) => {
        // Guard: if the persisted token somehow ended up null/empty,
        // treat the session as logged out to prevent a stuck auth state.
        if (state?.user && !state.user.authToken) {
          state.user = null;
          state.isAuthenticated = false;
        }
      },
    },
  ),
);
