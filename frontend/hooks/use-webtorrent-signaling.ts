import { useEffect, useRef, useState } from 'react';
import {
  getWebTorrentSignalingManager,
  destroyWebTorrentSignalingManager,
  type SignalingMessage,
  type WebTorrentSignalingOptions,
} from '@/lib/webtorrent-signaling';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { useServiceWorkerCalls } from './use-service-worker-calls';

/**
 * Hook for WebTorrent P2P signaling
 *
 * Automatically initializes WebTorrent client when in Emergency mode
 * and provides methods for signaling.
 *
 * @param peerId - ID of the peer to connect to (optional)
 * @returns Signaling manager and state
 */
export function useWebTorrentSignaling(peerId?: string) {
  const mode = useAppStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);

  const [isInitialized, setIsInitialized] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [peerCount, setPeerCount] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<ReturnType<typeof getWebTorrentSignalingManager> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Service Worker for background call handling
  const { sendSignalingMessage: sendToServiceWorker } = useServiceWorkerCalls();

  /**
   * Initialize WebTorrent client
   */
  useEffect(() => {
    // Only initialize in Emergency mode and when user is authenticated
    if (mode !== 'Emergency' || !user) {
      return;
    }

    const initManager = async () => {
      try {
        console.log('[useWebTorrentSignaling] Initializing WebTorrent signaling...');

        const options: WebTorrentSignalingOptions = {
          userId: user.id,
          peerId: peerId || '',
          onSignal: (message: SignalingMessage) => {
            console.log('[useWebTorrentSignaling] Received signal:', message);

            // Forward incoming call offers to Service Worker for background handling
            if (message.type === 'offer') {
              sendToServiceWorker(message).catch((err) => {
                console.error('[useWebTorrentSignaling] Failed to send to Service Worker:', err);
              });
            }

            // Signal will be handled by the component using this hook
          },
          onPeerConnected: (connectedPeerId: string) => {
            console.log('[useWebTorrentSignaling] Peer connected:', connectedPeerId);
            setIsConnected(true);
          },
          onPeerDisconnected: (disconnectedPeerId: string) => {
            console.log('[useWebTorrentSignaling] Peer disconnected:', disconnectedPeerId);
            setIsConnected(false);
          },
          onError: (err: Error) => {
            console.error('[useWebTorrentSignaling] Error:', err);
            setError(err);
          },
        };

        const manager = getWebTorrentSignalingManager(options);
        managerRef.current = manager;

        await manager.init();
        setIsInitialized(true);
        setError(null);

        console.log('[useWebTorrentSignaling] WebTorrent signaling initialized');

        // Start polling for peer count
        intervalRef.current = setInterval(() => {
          if (managerRef.current) {
            const count = managerRef.current.getPeerCount();
            setPeerCount(count);
            setIsConnected(managerRef.current.isConnected());
          }
        }, 1000);
      } catch (err) {
        console.error('[useWebTorrentSignaling] Failed to initialize:', err);
        setError(err as Error);
      }
    };

    initManager();

    // Cleanup on unmount or mode change
    return () => {
      console.log('[useWebTorrentSignaling] Cleaning up...');

      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      destroyWebTorrentSignalingManager().catch((err) => {
        console.error('[useWebTorrentSignaling] Failed to destroy manager:', err);
      });

      managerRef.current = null;
      setIsInitialized(false);
      setIsConnected(false);
      setPeerCount(0);
    };
  }, [mode, user, peerId]);

  /**
   * Join swarm for a specific peer
   */
  const joinSwarm = async (targetPeerId: string) => {
    if (!managerRef.current) {
      throw new Error('WebTorrent signaling not initialized');
    }

    try {
      await managerRef.current.joinSwarm(targetPeerId);
    } catch (err) {
      console.error('[useWebTorrentSignaling] Failed to join swarm:', err);
      setError(err as Error);
      throw err;
    }
  };

  /**
   * Send signaling message
   */
  const sendSignal = async (message: SignalingMessage) => {
    if (!managerRef.current) {
      throw new Error('WebTorrent signaling not initialized');
    }

    try {
      await managerRef.current.sendSignal(message);
    } catch (err) {
      console.error('[useWebTorrentSignaling] Failed to send signal:', err);
      setError(err as Error);
      throw err;
    }
  };

  /**
   * Leave swarm
   */
  const leaveSwarm = async () => {
    if (!managerRef.current) {
      return;
    }

    try {
      await managerRef.current.leaveSwarm();
      setIsConnected(false);
      setPeerCount(0);
    } catch (err) {
      console.error('[useWebTorrentSignaling] Failed to leave swarm:', err);
      setError(err as Error);
      throw err;
    }
  };

  return {
    // State
    isInitialized,
    isConnected,
    peerCount,
    error,

    // Methods
    joinSwarm,
    sendSignal,
    leaveSwarm,

    // Manager instance (for advanced usage)
    manager: managerRef.current,
  };
}

