/**
 * useSocket Hook
 *
 * React hook for Socket.io integration.
 * Manages Socket.io connection lifecycle based on app mode and authentication status.
 *
 * Features:
 * - Auto-connect in Normal mode when authenticated
 * - Auto-disconnect in Emergency mode
 * - Auto-disconnect when user logs out
 * - Reconnection handling
 * - Event subscription/unsubscription
 *
 * @module hooks/use-socket
 */

import { useEffect, useCallback, useState } from 'react';
import { socketManager } from '@/lib/socket-manager';
import { useAppStore } from '@/store/app-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Socket event callback type
 */
type SocketEventCallback = (...args: unknown[]) => void;

/**
 * useSocket hook return type
 */
interface UseSocketReturn {
  /**
   * Whether Socket.io is connected
   */
  isConnected: boolean;

  /**
   * Emit event to server
   */
  emit: (event: string, data?: unknown) => void;

  /**
   * Subscribe to event
   */
  on: (event: string, callback: SocketEventCallback) => void;

  /**
   * Unsubscribe from event
   */
  off: (event: string, callback: SocketEventCallback) => void;
}

/**
 * useSocket Hook
 *
 * Manages Socket.io connection based on app mode and authentication.
 *
 * @returns Socket.io connection utilities
 *
 * @example
 * ```tsx
 * function ChatComponent() {
 *   const { isConnected, emit, on, off } = useSocket();
 *
 *   useEffect(() => {
 *     const handleMessage = (data) => {
 *       console.log('Message received:', data);
 *     };
 *
 *     on('message-received', handleMessage);
 *
 *     return () => {
 *       off('message-received', handleMessage);
 *     };
 *   }, [on, off]);
 *
 *   const sendMessage = () => {
 *     emit('message-send', { to: 'userId', message: 'Hello' });
 *   };
 *
 *   return <div>{isConnected ? 'Connected' : 'Disconnected'}</div>;
 * }
 * ```
 */
export function useSocket(): UseSocketReturn {
  const mode = useAppStore((state) => state.mode);
  const setSocketConnected = useAppStore((state) => state.setSocketConnected);
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const [isConnected, setIsConnected] = useState(
    socketManager.getConnectionStatus()
  );

  /**
   * Handle connection status changes
   */
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setSocketConnected(true);
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setSocketConnected(false);
    };

    // Subscribe to connection events
    socketManager.on('connect', handleConnect);
    socketManager.on('disconnect', handleDisconnect);

    return () => {
      socketManager.off('connect', handleConnect);
      socketManager.off('disconnect', handleDisconnect);
    };
  }, [setSocketConnected]);

  /**
   * Manage connection based on mode and authentication
   */
  useEffect(() => {
    // Only connect in Normal mode when authenticated
    if (mode === 'Normal' && isAuthenticated && tokens?.accessToken && user?.id) {
      socketManager.connect(tokens.accessToken, user.id);
    } else {
      // Disconnect in Emergency mode or when not authenticated
      socketManager.disconnect();
    }

    // Cleanup on unmount
    return () => {
      // Don't disconnect on unmount - let the socket persist
      // It will be disconnected when mode changes or user logs out
    };
  }, [mode, isAuthenticated, tokens?.accessToken, user?.id]);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data?: unknown) => {
    socketManager.emit(event, data);
  }, []);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: string, callback: SocketEventCallback) => {
    socketManager.on(event, callback);
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: string, callback: SocketEventCallback) => {
    socketManager.off(event, callback);
  }, []);

  return {
    isConnected,
    emit,
    on,
    off,
  };
}

