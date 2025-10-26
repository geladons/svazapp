/**
 * Settings Page
 *
 * Application settings and preferences.
 * Includes notifications, privacy, appearance, and account management.
 *
 * @module app/(app)/settings/page
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Settings as SettingsIcon,
  Bell,
  Lock,
  Palette,
  LogOut,
  Trash2,
  Moon,
  Sun,
  Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/auth-store';
import { createApiClient } from '@/lib/api-client';

/**
 * Settings interface
 */
interface AppSettings {
  notifications: {
    enabled: boolean;
    sound: boolean;
  };
  privacy: {
    searchable: boolean;
  };
  appearance: {
    darkMode: boolean;
  };
}

/**
 * Default settings
 */
const defaultSettings: AppSettings = {
  notifications: {
    enabled: true,
    sound: true,
  },
  privacy: {
    searchable: true,
  },
  appearance: {
    darkMode: false,
  },
};

/**
 * Settings Page
 *
 * Manages application settings and user preferences.
 * Settings are persisted to localStorage.
 *
 * @returns Settings page component
 */
export default function SettingsPage() {
  const router = useRouter();
  const { user, tokens, setAuth, clearAuth } = useAuthStore();

  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  /**
   * Create memoized API client
   */
  const apiClient = useMemo(() => {
    const client = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: (accessToken, refreshToken) => {
        if (user) {
          setAuth(user, { accessToken, refreshToken });
        }
      },
      onAuthError: () => {
        clearAuth();
        router.push('/login');
      },
    });

    if (tokens) {
      client.setTokens(tokens.accessToken, tokens.refreshToken);
    }

    return client;
  }, [user, tokens, setAuth, clearAuth, router]);

  /**
   * Load settings from localStorage
   */
  useEffect(() => {
    const loadSettings = () => {
      try {
        const stored = localStorage.getItem('app-settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (err) {
        console.error('[Settings] Error loading settings:', err);
      }
    };

    loadSettings();
  }, []);

  /**
   * Save settings to localStorage
   */
  const saveSettings = (newSettings: AppSettings) => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (err) {
      console.error('[Settings] Error saving settings:', err);
    }
  };

  /**
   * Toggle notification setting
   */
  const toggleNotifications = () => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        enabled: !settings.notifications.enabled,
      },
    };
    saveSettings(newSettings);
  };

  /**
   * Toggle notification sound
   */
  const toggleNotificationSound = () => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        sound: !settings.notifications.sound,
      },
    };
    saveSettings(newSettings);
  };

  /**
   * Toggle searchable setting
   */
  const toggleSearchable = () => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        searchable: !settings.privacy.searchable,
      },
    };
    saveSettings(newSettings);
  };

  /**
   * Toggle dark mode
   */
  const toggleDarkMode = () => {
    const newSettings = {
      ...settings,
      appearance: {
        ...settings.appearance,
        darkMode: !settings.appearance.darkMode,
      },
    };
    saveSettings(newSettings);

    // Apply dark mode to document
    if (newSettings.appearance.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  /**
   * Handle delete account
   */
  const handleDeleteAccount = async () => {
    console.log('[Settings] Delete account requested');
    setShowDeleteConfirm(false);

    try {
      // Call delete account API
      await apiClient.deleteCurrentUser();

      // Clear auth and redirect to login
      clearAuth();
      router.push('/login');
    } catch (error) {
      console.error('[Settings] Failed to delete account:', error);
      // Still logout even if API call fails
      handleLogout();
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        </div>

        {/* Notifications Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Notifications
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Enable notifications */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Enable Notifications</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive notifications for messages and calls
                </p>
              </div>
              <button
                onClick={toggleNotifications}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification sound */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Notification Sound</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Play sound for notifications
                </p>
              </div>
              <button
                onClick={toggleNotificationSound}
                disabled={!settings.notifications.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.notifications.sound && settings.notifications.enabled
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                } ${!settings.notifications.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.notifications.sound && settings.notifications.enabled
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Privacy Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Privacy</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Searchable */}
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-medium">Allow Others to Find Me</Label>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Let other users find you by email, phone, or username
                </p>
              </div>
              <button
                onClick={toggleSearchable}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.privacy.searchable
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.privacy.searchable ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Appearance Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Appearance
              </h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Dark mode */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {settings.appearance.darkMode ? (
                  <Moon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                ) : (
                  <Sun className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                )}
                <div>
                  <Label className="text-base font-medium">Dark Mode</Label>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use dark theme for the app
                  </p>
                </div>
              </div>
              <button
                onClick={toggleDarkMode}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.appearance.darkMode
                    ? 'bg-blue-600'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.appearance.darkMode ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Account</h2>
            </div>
          </div>
          <div className="p-6 space-y-4">
            {/* Logout */}
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full justify-start"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>

            {/* Delete account */}
            {!showDeleteConfirm ? (
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                variant="outline"
                className="w-full justify-start text-red-600 dark:text-red-400 border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
                <p className="text-sm text-red-800 dark:text-red-200 font-medium">
                  Are you sure you want to delete your account?
                </p>
                <p className="text-xs text-red-700 dark:text-red-300">
                  This action cannot be undone. All your data will be permanently deleted.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={handleDeleteAccount}
                    variant="destructive"
                    size="sm"
                    className="flex-1"
                  >
                    Yes, Delete
                  </Button>
                  <Button
                    onClick={() => setShowDeleteConfirm(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

