'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { createApiClient } from '@/lib/api-client';

/**
 * Hook to check and verify authentication status
 * Validates the stored token and fetches current user data
 * Waits for Zustand persist middleware to rehydrate before checking auth
 */
export function useAuthCheck() {
  const router = useRouter();
  const { isAuthenticated, tokens, setAuth, clearAuth, setLoading } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);
  const [isRehydrated, setIsRehydrated] = useState(false);

  // Wait for Zustand persist to rehydrate from localStorage
  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsRehydrated(true);
    });

    // If already hydrated, set immediately
    if (useAuthStore.persist.hasHydrated()) {
      setIsRehydrated(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Don't check auth until rehydration is complete
    if (!isRehydrated) {
      return;
    }

    const checkAuth = async () => {
      setLoading(true);
      setIsChecking(true);

      try {
        // If not authenticated or no tokens, redirect to login
        if (!isAuthenticated || !tokens) {
          clearAuth();
          router.push('/login');
          return;
        }

        // Create API client with stored tokens
        const apiClient = createApiClient({
          baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
          onTokenRefresh: (accessToken, refreshToken) => {
            const user = useAuthStore.getState().user;
            if (user) {
              setAuth(user, { accessToken, refreshToken });
            }
          },
          onAuthError: () => {
            clearAuth();
            router.push('/login');
          },
        });

        // Set tokens in API client
        apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

        // Verify token by fetching current user
        const user = await apiClient.getCurrentUser();

        // Update user data in store
        setAuth(
          {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            phone: user.phone,
            avatarUrl: user.avatarUrl,
            bio: user.bio || null,
            isOnline: user.isOnline,
            lastSeen: new Date(user.lastSeen),
            createdAt: new Date(user.createdAt),
          },
          tokens
        );
      } catch (error) {
        // If token verification fails, clear auth and redirect
        clearAuth();
        router.push('/login');
      } finally {
        setLoading(false);
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [isRehydrated, isAuthenticated, tokens, setAuth, clearAuth, setLoading, router]);

  return { isChecking };
}

