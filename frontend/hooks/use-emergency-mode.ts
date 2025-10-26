'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/app-store';
import { startEmergencyDetector } from '@/lib/emergency-detector';

/**
 * Hook for managing Emergency Mode detection
 * 
 * Automatically starts the emergency detector on mount and cleans up on unmount.
 * Provides access to the current mode and last server contact timestamp.
 * 
 * @returns Object containing mode and lastServerContact
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { mode, lastServerContact } = useEmergencyMode();
 * 
 *   if (mode === 'Emergency') {
 *     return <div>Emergency Mode Active</div>;
 *   }
 * 
 *   return <div>Normal Mode</div>;
 * }
 * ```
 */
export function useEmergencyMode() {
  const mode = useAppStore((state) => state.mode);
  const lastServerContact = useAppStore((state) => state.lastServerContact);

  useEffect(() => {
    // Start emergency detector
    const cleanup = startEmergencyDetector();

    // Cleanup on unmount
    return () => {
      cleanup();
    };
  }, []);

  return {
    mode,
    lastServerContact,
  };
}

