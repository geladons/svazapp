/**
 * Sync Hook
 * 
 * Manages data synchronization between API and IndexedDB.
 * Automatically syncs data when user logs in or mode changes.
 * 
 * @module hooks/use-sync
 */

'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useAppStore } from '@/store/app-store';
import { syncManager } from '@/lib/sync-manager';

/**
 * Sync Hook
 * 
 * Handles automatic data synchronization based on auth and mode state.
 * 
 * Sync triggers:
 * - On login (isAuthenticated changes from false → true)
 * - On mode change (Emergency → Normal)
 * 
 * @returns void
 */
export function useSync() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const tokens = useAuthStore((state) => state.tokens);
  const mode = useAppStore((state) => state.mode);

  // Track previous values to detect changes
  const prevAuthRef = useRef(isAuthenticated);
  const prevModeRef = useRef(mode);

  useEffect(() => {
    const performSync = async () => {
      // Skip if not authenticated or no tokens
      if (!isAuthenticated || !tokens) {
        return;
      }

      // Set tokens in sync manager
      syncManager.setTokens(tokens.accessToken, tokens.refreshToken);

      // Detect login (auth changed from false → true)
      const didLogin = !prevAuthRef.current && isAuthenticated;

      // Detect mode change (Emergency → Normal)
      const didRecoverFromEmergency = prevModeRef.current === 'Emergency' && mode === 'Normal';

      // Perform full sync on login or recovery
      if (didLogin || didRecoverFromEmergency) {
        console.log('[useSync] Triggering full sync...', {
          didLogin,
          didRecoverFromEmergency,
        });

        try {
          await syncManager.fullSync();
          console.log('[useSync] Full sync complete');
        } catch (error) {
          console.error('[useSync] Full sync failed:', error);
        }
      }

      // Update previous values
      prevAuthRef.current = isAuthenticated;
      prevModeRef.current = mode;
    };

    performSync();
  }, [isAuthenticated, tokens, mode]);
}

