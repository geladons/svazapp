import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * User data interface
 */
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
}

/**
 * Authentication tokens
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication state interface
 */
export interface AuthState {
  /**
   * Current authenticated user
   */
  user: User | null;

  /**
   * Authentication tokens
   */
  tokens: AuthTokens | null;

  /**
   * Whether the user is authenticated
   */
  isAuthenticated: boolean;

  /**
   * Whether authentication is being checked
   */
  isLoading: boolean;

  /**
   * Set the authenticated user and tokens
   */
  setAuth: (user: User, tokens: AuthTokens) => void;

  /**
   * Update user data
   */
  updateUser: (user: Partial<User>) => void;

  /**
   * Update tokens
   */
  updateTokens: (tokens: AuthTokens) => void;

  /**
   * Clear authentication (logout)
   */
  clearAuth: () => void;

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;
}

/**
 * Authentication store
 * Manages user authentication state and tokens
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,

      setAuth: (user: User, tokens: AuthTokens) => {
        set({
          user,
          tokens,
          isAuthenticated: true,
          isLoading: false,
        });
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },

      updateTokens: (tokens: AuthTokens) => {
        set({ tokens });
      },

      clearAuth: () => {
        set({
          user: null,
          tokens: null,
          isAuthenticated: false,
          isLoading: false,
        });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },
    }),
    {
      name: 'svazapp-auth-store',
      partialize: (state) => ({
        user: state.user,
        tokens: state.tokens,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

