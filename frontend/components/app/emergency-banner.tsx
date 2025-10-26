'use client';

import { useAppStore } from '@/store/app-store';
import { AlertTriangle } from 'lucide-react';

/**
 * Emergency Mode Banner Component
 * 
 * Displays a sticky warning banner at the top of the screen when the app
 * is in Emergency mode (server unavailable, P2P-only communication).
 * 
 * Only visible when mode === 'Emergency'.
 */
export function EmergencyBanner() {
  const mode = useAppStore((state) => state.mode);
  const lastServerContact = useAppStore((state) => state.lastServerContact);

  // Don't render in Normal mode
  if (mode !== 'Emergency') {
    return null;
  }

  // Format last contact time
  const lastContactText = lastServerContact
    ? `Last server contact: ${new Date(lastServerContact).toLocaleTimeString()}`
    : 'Server unavailable';

  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-amber-950 px-4 py-3 shadow-md">
      <div className="container mx-auto flex items-center justify-center gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0" />
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2 text-sm font-medium">
          <span className="font-bold">⚠️ EMERGENCY MODE</span>
          <span className="hidden sm:inline">•</span>
          <span>Server unavailable. Direct P2P connection.</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-xs opacity-90">{lastContactText}</span>
        </div>
      </div>
    </div>
  );
}

