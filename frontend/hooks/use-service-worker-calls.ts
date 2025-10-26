/**
 * React Hook for Service Worker P2P Call Handling
 *
 * Registers the custom P2P Service Worker and provides methods
 * to send signaling messages and check for pending calls.
 */

import { useEffect, useState, useCallback } from 'react';
import type { SignalingMessage } from '../lib/webtorrent-signaling';

/**
 * Pending call data structure
 */
export interface PendingCall {
  id: string;
  callerId: string;
  callerName: string;
  type: 'AUDIO' | 'VIDEO';
  offer: string;
  timestamp: string;
}

export interface UseServiceWorkerCallsReturn {
  isRegistered: boolean;
  isSupported: boolean;
  error: Error | null;
  sendSignalingMessage: (message: SignalingMessage) => Promise<void>;
  getPendingCalls: () => Promise<PendingCall[]>;
  clearPendingCalls: () => Promise<void>;
}

/**
 * Hook for Service Worker P2P call handling
 *
 * @returns Service Worker state and methods
 */
export function useServiceWorkerCalls(): UseServiceWorkerCallsReturn {
  const [isRegistered, setIsRegistered] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  // Check if Service Worker is supported
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const supported = 'serviceWorker' in navigator;
    setIsSupported(supported);

    if (!supported) {
      setError(new Error('Service Worker is not supported in this browser'));
    }
  }, []);

  // Register Service Worker
  useEffect(() => {
    if (!isSupported || typeof window === 'undefined') {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        console.log('[useServiceWorkerCalls] Registering P2P Service Worker...');

        const reg = await navigator.serviceWorker.register('/p2p-sw.js', {
          scope: '/',
        });

        console.log('[useServiceWorkerCalls] P2P Service Worker registered:', reg);

        setRegistration(reg);
        setIsRegistered(true);

        // Listen for messages from Service Worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          console.log('[useServiceWorkerCalls] Message from SW:', event.data);

          if (event.data && event.data.type === 'accept-call') {
            // Handle call acceptance from notification
            // This will be handled by the call UI component
            window.dispatchEvent(
              new CustomEvent('sw-accept-call', {
                detail: {
                  callId: event.data.callId,
                  callerId: event.data.callerId,
                },
              })
            );
          }
        });
      } catch (err) {
        console.error('[useServiceWorkerCalls] Failed to register Service Worker:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    registerServiceWorker();
  }, [isSupported]);

  /**
   * Send signaling message to Service Worker
   *
   * @param message - WebTorrent signaling message
   */
  const sendSignalingMessage = useCallback(
    async (message: SignalingMessage): Promise<void> => {
      if (!registration || !registration.active) {
        console.warn('[useServiceWorkerCalls] Service Worker not active, cannot send message');
        return;
      }

      console.log('[useServiceWorkerCalls] Sending signaling message to SW:', message);

      registration.active.postMessage({
        type: 'p2p-signaling',
        message,
      });
    },
    [registration]
  );

  /**
   * Get all pending calls from IndexedDB
   *
   * @returns Promise resolving to array of pending calls
   */
  const getPendingCalls = useCallback(async (): Promise<PendingCall[]> => {
    const db = await openPendingCallsDB();
    const tx = db.transaction('pendingCalls', 'readonly');
    const store = tx.objectStore('pendingCalls');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }, []);

  /**
   * Clear all pending calls from IndexedDB
   */
  const clearPendingCalls = useCallback(async (): Promise<void> => {
    const db = await openPendingCallsDB();
    const tx = db.transaction('pendingCalls', 'readwrite');
    const store = tx.objectStore('pendingCalls');

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }, []);

  return {
    isRegistered,
    isSupported,
    error,
    sendSignalingMessage,
    getPendingCalls,
    clearPendingCalls,
  };
}

/**
 * Open IndexedDB for pending calls
 *
 * @returns Promise resolving to IDBDatabase
 */
function openPendingCallsDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('svazapp-pending-calls', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('pendingCalls')) {
        const store = db.createObjectStore('pendingCalls', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

