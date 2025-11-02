/**
 * Push Notifications Hook
 *
 * Handles requesting push notification permissions and managing subscriptions
 * using the Web Push API and Service Worker.
 *
 * @module hooks/use-push-notifications
 */

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { createApiClient } from '@/lib/api-client';
import type {
 PushSubscriptionData
} from '@/lib/api-types';

/**
 * Hook for managing push notifications
 */
export function usePushNotifications() {
  const { user, tokens } = useAuthStore();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Check if push notifications are supported
 useEffect(() => {
    const checkSupport = () => {
      const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
      setIsSupported(supported);
      
      if (supported && 'Notification' in window) {
        setPermission(Notification.permission);
      }
    };

    checkSupport();
  }, []);

  // Check if user is already subscribed
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user || !tokens || permission !== 'granted') {
        setIsSubscribed(false);
        return;
      }

      try {
        // Try to get the current subscription from the service worker
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
      } catch (err) {
        console.error('[Push Notifications] Error checking subscription:', err);
        setIsSubscribed(false);
      }
    };

    checkSubscription();
  }, [user, tokens, permission]);

  /**
   * Get the VAPID public key from the server
   */
  const getVapidKey = async (): Promise<string> => {
    if (!user || !tokens) {
      throw new Error('User not authenticated');
    }

    const apiClient = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: () => {},
      onAuthError: () => {},
    });

    apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

    const response = await apiClient.getVapidKey();
    return response.publicKey;
  };

  /**
    * Convert base64 string to ArrayBuffer for VAPID key
    */
   const base64ToUint8Array = (base64: string): ArrayBuffer => {
     const padding = '='.repeat((4 - (base64.length % 4)) % 4);
     const base64Padded = (base64 + padding)
       .replace(/-/g, '+')
       .replace(/_/g, '/');
 
     const rawData = atob(base64Padded);
     const outputArray = new Uint8Array(rawData.length);
 
     for (let i = 0; i < rawData.length; ++i) {
       outputArray[i] = rawData.charCodeAt(i);
     }
 
     return outputArray.buffer;
   };

 /**
   * Subscribe to push notifications
   */
  const subscribeToPush = async (): Promise<PushSubscriptionData> => {
    if (!user || !tokens) {
      throw new Error('User not authenticated');
    }

    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;

    // Get VAPID public key from the server
    const vapidKey = await getVapidKey();

    // Subscribe to push notifications
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(vapidKey),
    });

    return subscription.toJSON() as PushSubscriptionData;
  };

  /**
   * Send subscription to the server
   */
  const sendSubscriptionToServer = async (subscription: PushSubscriptionData) => {
    if (!user || !tokens) {
      throw new Error('User not authenticated');
    }

    const apiClient = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: () => {},
      onAuthError: () => {},
    });

    apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

    await apiClient.subscribeToPush({
      subscription,
    });
  };

  /**
   * Unsubscribe from push notifications
   */
  const unsubscribeFromPush = async (): Promise<boolean> => {
    if (!user || !tokens) {
      throw new Error('User not authenticated');
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      return false;
    }

    // Unsubscribe from push notifications
    await subscription.unsubscribe();

    // Remove subscription from the server
    const apiClient = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: () => {},
      onAuthError: () => {},
    });

    apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

    await apiClient.unsubscribeFromPush({
      endpoint: subscription.endpoint,
    });

    return true;
 };

  /**
   * Request permission for push notifications
   */
  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult);

      if (permissionResult === 'granted') {
        // Subscribe to push notifications
        const subscription = await subscribeToPush();
        
        // Send subscription to server
        await sendSubscriptionToServer(subscription);
        
        setIsSubscribed(true);
        return true;
      } else {
        console.log('[Push Notifications] Permission denied by user');
        setIsSubscribed(false);
        return false;
      }
    } catch (err) {
      console.error('[Push Notifications] Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Failed to subscribe to push notifications');
      setIsSubscribed(false);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

 /**
   * Toggle push notification subscription
   */
  const toggleSubscription = async (): Promise<boolean> => {
    if (permission === 'granted' && isSubscribed) {
      // Unsubscribe
      const result = await unsubscribeFromPush();
      setIsSubscribed(!result); // Set to false if successful, true if failed
      return !result;
    } else if (permission === 'granted' && !isSubscribed) {
      // Subscribe
      return await requestPermission();
    } else if (permission !== 'granted') {
      // Request permission first
      return await requestPermission();
    }

    return false;
  };

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    requestPermission,
    toggleSubscription,
  };
}