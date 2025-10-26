'use client';

import { useEmergencyMode } from '@/hooks/use-emergency-mode';
import { useSync } from '@/hooks/use-sync';
import { EmergencyBanner } from '@/components/app/emergency-banner';

/**
 * Emergency Mode Provider
 * 
 * Initializes the emergency mode detector and renders the emergency banner.
 * This is a client component that wraps the app to provide emergency mode functionality.
 */
export function EmergencyModeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize emergency mode detector
  useEmergencyMode();

  // Initialize data sync
  useSync();

  return (
    <>
      <EmergencyBanner />
      {children}
    </>
  );
}

