'use client';

import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { SocketStatus } from '@/components/socket-status';

/**
 * Home page (protected route)
 * Main dashboard for authenticated users
 */
export default function HomePage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const mode = useAppStore((state) => state.mode);

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome, {user?.displayName}!
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                @{user?.username} • {user?.email}
              </p>
            </div>
            <Button onClick={handleLogout} variant="outline">
              Logout
            </Button>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Application Mode
              </h2>
              <p className="text-blue-800 dark:text-blue-200">
                Current mode: <span className="font-bold">{mode}</span>
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-2">
                {mode === 'Normal'
                  ? 'Connected to server. All features available.'
                  : 'Emergency mode active. Using P2P connections only.'}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Phase 3: Frontend Foundation - Complete
              </h2>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li>✅ Next.js 15 with App Router</li>
                <li>✅ PWA Configuration</li>
                <li>✅ Tailwind CSS & Shadcn UI</li>
                <li>✅ Zustand State Management</li>
                <li>✅ Dexie.js Offline Storage</li>
                <li>✅ API Client with JWT</li>
                <li>✅ Authentication Pages</li>
                <li>✅ Protected Routes</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <h2 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
                Next Steps
              </h2>
              <p className="text-yellow-800 dark:text-yellow-200">
                Phase 4 will implement the main app features: contacts, chat, and video calls.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Socket.io Status Debug Component */}
      <SocketStatus />
    </div>
  );
}

