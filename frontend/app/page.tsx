'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';

/**
 * Root page
 * Redirects to /chats if authenticated, or /login if not authenticated
 * Waits for Zustand persist middleware to rehydrate auth state from localStorage
 * This prevents the 401 error and ensures users stay logged in across page refreshes
 */
export default function RootPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);
  const [isRehydrated, setIsRehydrated] = useState(false);

  useEffect(() => {
    // Wait for Zustand persist middleware to rehydrate from localStorage
    // This ensures we have the correct auth state before redirecting
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
    // Only redirect after rehydration is complete
    if (!isRehydrated) {
      return;
    }

    // Check authentication and redirect accordingly
    if (isAuthenticated && tokens) {
      // User is authenticated, redirect to chats
      router.push('/chats');
    } else {
      // User is not authenticated, redirect to login
      router.push('/login');
    }
  }, [isRehydrated, isAuthenticated, tokens, router]);

  // Show loading state while rehydrating and redirecting
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

