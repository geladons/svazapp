/**
 * Socket Status Component
 *
 * Debug component to display Socket.io connection status.
 * Shows connection state and allows manual connect/disconnect for testing.
 *
 * @module components/socket-status
 */

'use client';

import { useSocket } from '@/hooks/use-socket';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Socket Status Component
 *
 * Displays Socket.io connection status for debugging.
 *
 * @returns Status component
 */
export function SocketStatus() {
  const { isConnected } = useSocket();
  const mode = useAppStore((state) => state.mode);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);

  return (
    <div className="fixed bottom-4 right-4 rounded-lg border bg-card p-4 text-card-foreground shadow-lg">
      <h3 className="mb-2 text-sm font-semibold">Socket.io Status</h3>
      <div className="space-y-1 text-xs">
        <div className="flex items-center gap-2">
          <div
            className={`h-2 w-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
        <div>Mode: {mode}</div>
        <div>Auth: {isAuthenticated ? 'Yes' : 'No'}</div>
        {user && <div>User: {user.username}</div>}
      </div>
    </div>
  );
}

