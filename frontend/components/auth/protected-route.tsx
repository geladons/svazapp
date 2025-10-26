'use client';

import { useAuthCheck } from '@/hooks/use-auth-check';

/**
 * Protected route wrapper component
 * Ensures user is authenticated before rendering children
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isChecking } = useAuthCheck();

  // Show loading state while checking authentication
  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Render children if authenticated
  return <>{children}</>;
}

