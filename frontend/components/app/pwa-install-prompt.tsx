'use client';

import { useEffect, useState } from 'react';
import { X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import 'pwa-install';

// Extend the Navigator interface to support the standalone property
declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

/**
 * BeforeInstallPromptEvent interface
 * Extended Event type for PWA installation prompt
 */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * PWA Install Prompt Component
 *
 * Displays a banner prompting users to install the PWA after successful login.
 * Uses the beforeinstallprompt event to detect installation availability.
 * Includes special handling for iOS devices where beforeinstallprompt is not supported.
 * Stores user's dismissal preference in localStorage.
 *
 * Features:
 * - Shows only if browser supports PWA installation
 * - Shows only if app is not already installed
 * - Includes special handling for iOS devices
 * - Respects user's dismissal preference
 * - Shows after user engagement (login)
 * - Allows permanent dismissal
 */
export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if user has previously dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      return;
    }

    // Check if app is already installed
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Handle the beforeinstallprompt event for Android and desktop Chrome
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the default prompt
      e.preventDefault();
      // Save the event for later use
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      // Show the install prompt after a short delay (better UX)
      setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Check installation status on initial load
    const checkInstallationStatus = () => {
      if (isStandalone) {
        setIsInstalled(true);
      }
    };

    checkInstallationStatus();

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  /**
   * Show custom UI for PWA installation
   * on iOS and other platforms without beforeinstallprompt
   */
  const showInstallPrompt = () => {
    if (deferredPrompt) {
      // For platforms where beforeinstallprompt works
      deferredPrompt.prompt();
    } else {
      // For iOS and other platforms without beforeinstallprompt support
      // Show custom UI using pwa-install
      showPWAInstallDialog();
    }
  };

  const showPWAInstallDialog = () => {
    // Create pwa-install element
    const installElement = document.createElement('pwa-install');
    // Configure attributes to display instructions
    installElement.setAttribute('open', '');
    installElement.setAttribute('manifest-url', '/manifest.json');

    // Add to body
    document.body.appendChild(installElement);

    // Remove element after closing
    const removeInstallElement = () => {
      if (document.body.contains(installElement)) {
        document.body.removeChild(installElement);
      }
    };

    // Close on close event
    installElement.addEventListener('close', removeInstallElement);
  };

  /**
   * Handle install button click
   */
  const handleInstall = async () => {
    if (!deferredPrompt) {
      // For iOS and other platforms without beforeinstallprompt, show custom dialog
      showInstallPrompt();
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferred prompt
    setDeferredPrompt(null);
    setShowPrompt(false);
 };

  /**
   * Handle dismiss button click
   */
  const handleDismiss = () => {
    setShowPrompt(false);
 };

  /**
   * Handle permanent dismiss (don't show again)
   */
  const handleDismissPermanently = () => {
    localStorage.setItem('pwa-install-dismissed', 'true');
    setShowPrompt(false);
 };

  // Don't show prompt if already installed or if user has dismissed
  if (isInstalled || !showPrompt) {
    return null;
 }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pb-safe animate-in slide-in-from-bottom duration-30">
      <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Download className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
              Install svaz.app
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Install our app for a better experience. Access it directly from your home screen, even offline.
            </p>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleInstall}
                className="text-xs h-8"
              >
                Install
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismiss}
                className="text-xs h-8"
              >
                Not now
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDismissPermanently}
                className="text-xs h-8 text-gray-500 dark:text-gray-400"
              >
                Don't ask again
              </Button>
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 text-gray-40 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
 );
}
