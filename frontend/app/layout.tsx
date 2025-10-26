import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SocketProvider } from '@/components/providers/socket-provider';
import { EmergencyModeProvider } from '@/components/providers/emergency-mode-provider';

export const metadata: Metadata = {
  title: 'svaz.app - Reliable Video Communication',
  description:
    'Self-hosted video calling and messaging platform with automatic P2P failover',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'svaz.app',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: '#3B82F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
      </head>
      <body className="min-h-screen antialiased">
        <EmergencyModeProvider>
          <SocketProvider>{children}</SocketProvider>
        </EmergencyModeProvider>
      </body>
    </html>
  );
}

