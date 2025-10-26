/**
 * React Hook for Dual-Channel Signaling
 *
 * Manages both Socket.io and WebTorrent signaling channels.
 * Automatically switches between channels based on mode.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  getDualChannelSignalingManager,
  type SignalingMessage,
  type SignalingChannel,
  type CallMode,
  DualChannelSignalingManager,
} from '@/lib/dual-channel-signaling';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';
import { socketManager } from '@/lib/socket-manager';
import { useWebTorrentSignaling } from './use-webtorrent-signaling';

export interface UseDualChannelSignalingReturn {
  isReady: boolean;
  activeChannel: SignalingChannel | null;
  sendSignal: (message: Omit<SignalingMessage, 'channel'>) => Promise<void>;
  onSignal: (callback: (message: SignalingMessage) => void) => void;
  error: Error | null;
}

/**
 * Hook for dual-channel signaling
 *
 * @param peerId - ID of the peer to connect to (optional, for WebTorrent)
 * @returns Dual-channel signaling state and methods
 */
export function useDualChannelSignaling(peerId?: string): UseDualChannelSignalingReturn {
  const mode = useAppStore((state) => state.mode);
  const user = useAuthStore((state) => state.user);

  const [isReady, setIsReady] = useState(false);
  const [activeChannel, setActiveChannel] = useState<SignalingChannel | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const managerRef = useRef<DualChannelSignalingManager | null>(null);
  const signalCallbackRef = useRef<((message: SignalingMessage) => void) | null>(null);

  // Initialize WebTorrent (only in Emergency mode)
  const webTorrent = useWebTorrentSignaling(peerId);

  /**
   * Initialize dual-channel signaling manager
   */
  useEffect(() => {
    if (!user) {
      return;
    }

    const initManager = async () => {
      try {
        console.log('[useDualChannelSignaling] Initializing dual-channel signaling...');

        const socket = socketManager.getSocket();

        const manager = getDualChannelSignalingManager({
          userId: user.id,
          mode,
          socket: socket || null,
          webTorrentManager: webTorrent.manager || null,
          onSignal: (message: SignalingMessage) => {
            console.log('[useDualChannelSignaling] Received signal:', message);
            if (signalCallbackRef.current) {
              signalCallbackRef.current(message);
            }
          },
          onError: (err: Error) => {
            console.error('[useDualChannelSignaling] Error:', err);
            setError(err);
          },
        });

        managerRef.current = manager;
        manager.startListening();

        setActiveChannel(manager.getActiveChannel());
        setIsReady(true);
        setError(null);

        console.log('[useDualChannelSignaling] Dual-channel signaling initialized');
      } catch (err) {
        console.error('[useDualChannelSignaling] Failed to initialize:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    initManager();

    return () => {
      if (managerRef.current) {
        managerRef.current.stopListening();
      }
    };
  }, [user, mode, webTorrent.manager]);

  /**
   * Update manager when mode changes
   */
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateMode(mode);
      setActiveChannel(managerRef.current.getActiveChannel());
      console.log(`[useDualChannelSignaling] Active channel: ${managerRef.current.getActiveChannel()}`);
    }
  }, [mode]);

  /**
   * Update manager when socket connection status changes
   */
  useEffect(() => {
    if (managerRef.current) {
      const socket = socketManager.getSocket();
      managerRef.current.updateSocket(socket || null);
      setActiveChannel(managerRef.current.getActiveChannel());
    }
  }, [mode]); // Re-run when mode changes (socket connects/disconnects based on mode)

  /**
   * Update manager when WebTorrent manager changes
   */
  useEffect(() => {
    if (managerRef.current) {
      managerRef.current.updateWebTorrentManager(webTorrent.manager || null);
      setActiveChannel(managerRef.current.getActiveChannel());
    }
  }, [webTorrent.manager]);

  /**
   * Send signaling message
   */
  const sendSignal = useCallback(
    async (message: Omit<SignalingMessage, 'channel'>): Promise<void> => {
      if (!managerRef.current) {
        throw new Error('Dual-channel signaling manager not initialized');
      }

      await managerRef.current.sendSignal(message);
    },
    []
  );

  /**
   * Register callback for incoming signals
   */
  const onSignal = useCallback((callback: (message: SignalingMessage) => void) => {
    signalCallbackRef.current = callback;
  }, []);

  return {
    isReady,
    activeChannel,
    sendSignal,
    onSignal,
    error,
  };
}

/**
 * Determine call mode based on local and remote channels
 *
 * @param localChannel - Channel used by local user
 * @param remoteChannel - Channel used by remote user
 * @returns Call mode
 */
export function determineCallMode(
  localChannel: SignalingChannel,
  remoteChannel: SignalingChannel
): CallMode {
  return DualChannelSignalingManager.determineCallMode(localChannel, remoteChannel);
}

