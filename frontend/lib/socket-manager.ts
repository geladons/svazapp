/**
 * Socket.io Client Manager
 *
 * Singleton class that manages Socket.io connection for real-time communication.
 * Handles connection lifecycle, authentication, event management, and reconnection logic.
 *
 * Only connects in Normal mode. Disconnects in Emergency mode.
 *
 * @module lib/socket-manager
 */

import { io, Socket } from 'socket.io-client';

/**
 * Socket event callback type
 */
type SocketEventCallback = (...args: unknown[]) => void;

/**
 * Socket Manager
 *
 * Singleton class for managing Socket.io connection.
 */
export class SocketManager {
  private static instance: SocketManager | null = null;
  private socket: Socket | null = null;
  private isConnected: boolean = false;
  private listeners: Map<string, Set<SocketEventCallback>> = new Map();
  private currentToken: string | null = null;

  /**
   * Private constructor (singleton pattern)
   */
  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): SocketManager {
    if (!SocketManager.instance) {
      SocketManager.instance = new SocketManager();
    }
    return SocketManager.instance;
  }

  /**
   * Connect to Socket.io server
   *
   * @param token - JWT access token for authentication
   * @param userId - User ID to join room
   */
  public connect(token: string, userId: string): void {
    // Don't reconnect if already connected with same token
    if (this.socket && this.isConnected && this.currentToken === token) {
      return;
    }

    // Disconnect existing connection if any
    if (this.socket) {
      this.disconnect();
    }

    this.currentToken = token;

    // Determine Socket.io URL
    // If NEXT_PUBLIC_SOCKET_URL is set and not empty, use it
    // Otherwise, use current window location (works with any IP/domain)
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL && process.env.NEXT_PUBLIC_SOCKET_URL.trim() !== ''
        ? process.env.NEXT_PUBLIC_SOCKET_URL
        : typeof window !== 'undefined'
        ? `${window.location.protocol}//${window.location.host}`
        : 'http://localhost:80';

    // Create Socket.io connection
    this.socket = io(socketUrl, {
      auth: {
        token,
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
    });

    // Setup event handlers
    this.setupEventHandlers(userId);
  }

  /**
   * Setup Socket.io event handlers
   */
  private setupEventHandlers(userId: string): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('[Socket.io] Connected');
      this.isConnected = true;

      // Join user's room
      if (this.socket) {
        this.socket.emit('join', userId);
      }

      // Emit to all listeners
      this.emitToListeners('connect');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[Socket.io] Disconnected:', reason);
      this.isConnected = false;
      this.emitToListeners('disconnect', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('[Socket.io] Connection error:', error);
      this.isConnected = false;
      this.emitToListeners('connect_error', error);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('[Socket.io] Reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.emitToListeners('reconnect', attemptNumber);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('[Socket.io] Reconnection error:', error);
      this.emitToListeners('reconnect_error', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('[Socket.io] Reconnection failed');
      this.isConnected = false;
      this.emitToListeners('reconnect_failed');
    });

    // Message events
    this.socket.on('message-received', (data) => {
      this.emitToListeners('message-received', data);
    });

    // Typing events
    this.socket.on('typing-start', (data) => {
      this.emitToListeners('typing-start', data);
    });

    this.socket.on('typing-stop', (data) => {
      this.emitToListeners('typing-stop', data);
    });

    // Chat read event
    this.socket.on('chat-read', (data) => {
      this.emitToListeners('chat-read', data);
    });

    // Call events
    this.socket.on('call-incoming', (data) => {
      this.emitToListeners('call-incoming', data);
    });

    this.socket.on('call-accepted', (data) => {
      this.emitToListeners('call-accepted', data);
    });

    this.socket.on('call-rejected', (data) => {
      this.emitToListeners('call-rejected', data);
    });

    this.socket.on('call-ended', (data) => {
      this.emitToListeners('call-ended', data);
    });

    // WebRTC signaling events
    this.socket.on('signal-offer', (data) => {
      this.emitToListeners('signal-offer', data);
    });

    this.socket.on('signal-answer', (data) => {
      this.emitToListeners('signal-answer', data);
    });

    this.socket.on('signal-ice-candidate', (data) => {
      this.emitToListeners('signal-ice-candidate', data);
    });
  }

  /**
   * Emit event to all registered listeners
   */
  private emitToListeners(event: string, ...args: unknown[]): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`[Socket.io] Error in listener for ${event}:`, error);
        }
      });
    }
  }

  /**
   * Disconnect from Socket.io server
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.currentToken = null;
      console.log('[Socket.io] Disconnected manually');
    }
  }

  /**
   * Emit event to server
   *
   * @param event - Event name
   * @param data - Event data
   */
  public emit(event: string, data?: unknown): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn(
        `[Socket.io] Cannot emit ${event}: not connected`
      );
    }
  }

  /**
   * Subscribe to event
   *
   * @param event - Event name
   * @param callback - Event callback
   */
  public on(event: string, callback: SocketEventCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  /**
   * Unsubscribe from event
   *
   * @param event - Event name
   * @param callback - Event callback
   */
  public off(event: string, callback: SocketEventCallback): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Get socket instance (for advanced usage)
   */
  public getSocket(): Socket | null {
    return this.socket;
  }
}

/**
 * Get Socket Manager singleton instance
 */
export const socketManager = SocketManager.getInstance();

