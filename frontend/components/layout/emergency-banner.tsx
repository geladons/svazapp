'use client';

import { AlertTriangle } from 'lucide-react';
import { useAppStore } from '@/store/app-store';

/**
 * Emergency mode banner
 * Displays a warning banner when the app is in Emergency mode
 */
export function EmergencyBanner() {
  const mode = useAppStore((state) => state.mode);

  if (mode !== 'Emergency') {
    return null;
  }

  return (
    <div className="bg-yellow-500 dark:bg-yellow-600 text-white px-4 py-3 flex items-center gap-3 shadow-md">
      <AlertTriangle className="h-5 w-5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">EMERGENCY MODE</p>
        <p className="text-xs opacity-90">
          Server unavailable. Using direct P2P connections.
        </p>
      </div>
    </div>
  );
}

