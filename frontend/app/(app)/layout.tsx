import { ProtectedRoute } from '@/components/auth/protected-route';
import { AppHeader } from '@/components/layout/app-header';
import { TabBar } from '@/components/layout/tab-bar';
import { EmergencyBanner } from '@/components/layout/emergency-banner';
import { CallManager } from '@/components/calls/call-manager';
import { PWAInstallPrompt } from '@/components/app/pwa-install-prompt';

/**
 * Layout for protected app routes
 * All routes under (app) require authentication
 * Includes header, emergency banner, bottom tab bar, call manager, and PWA install prompt
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900">
        <EmergencyBanner />
        <AppHeader />
        <main className="flex-1 overflow-y-auto">{children}</main>
        <TabBar />
        <CallManager />
        <PWAInstallPrompt />
      </div>
    </ProtectedRoute>
  );
}

