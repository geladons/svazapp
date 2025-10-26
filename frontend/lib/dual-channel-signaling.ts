/**
 * Dual-Channel Signaling Manager
 *
 * Manages both Socket.io and WebTorrent signaling channels.
 * Automatically selects the appropriate channel based on mode.
 * Handles asymmetric communication (Normal ↔ Emergency).
 */

import type { Socket } from 'socket.io-client';
import type { WebTorrentSignalingManager } from './webtorrent-signaling';

export type SignalingChannel = 'socket' | 'webtorrent';
export type CallMode = 'NORMAL' | 'EMERGENCY' | 'ASYMMETRIC';

export interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate' | 'call-end';
  callerId: string;
  receiverId: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
  channel: SignalingChannel;
}

export interface DualChannelSignalingOptions {
  userId: string;
  mode: 'Normal' | 'Emergency';
  socket: Socket | null;
  webTorrentManager: WebTorrentSignalingManager | null;
  onSignal: (message: SignalingMessage) => void;
  onError: (error: Error) => void;
}

/**
 * Dual-Channel Signaling Manager
 *
 * Manages signaling across Socket.io and WebTorrent channels.
 */
export class DualChannelSignalingManager {
  private options: DualChannelSignalingOptions;
  private activeChannel: SignalingChannel;

  constructor(options: DualChannelSignalingOptions) {
    this.options = options;
    this.activeChannel = this.determineChannel();
  }

  /**
   * Determine which channel to use based on mode
   */
  private determineChannel(): SignalingChannel {
    if (this.options.mode === 'Normal' && this.options.socket?.connected) {
      return 'socket';
    }
    return 'webtorrent';
  }

  /**
   * Send signaling message
   *
   * @param message - Signaling message to send
   */
  async sendSignal(message: Omit<SignalingMessage, 'channel'>): Promise<void> {
    const channel = this.determineChannel();
    const fullMessage: SignalingMessage = { ...message, channel };

    console.log(`[DualChannelSignaling] Sending signal via ${channel}:`, fullMessage);

    try {
      if (channel === 'socket' && this.options.socket?.connected) {
        await this.sendViaSocket(fullMessage);
      } else if (channel === 'webtorrent' && this.options.webTorrentManager) {
        await this.sendViaWebTorrent(fullMessage);
      } else {
        throw new Error(`No available channel for signaling (mode: ${this.options.mode})`);
      }
    } catch (error) {
      console.error('[DualChannelSignaling] Failed to send signal:', error);
      
      // Try fallback channel
      const fallbackChannel = channel === 'socket' ? 'webtorrent' : 'socket';
      console.log(`[DualChannelSignaling] Trying fallback channel: ${fallbackChannel}`);
      
      try {
        if (fallbackChannel === 'socket' && this.options.socket?.connected) {
          await this.sendViaSocket({ ...fullMessage, channel: fallbackChannel });
        } else if (fallbackChannel === 'webtorrent' && this.options.webTorrentManager) {
          await this.sendViaWebTorrent({ ...fullMessage, channel: fallbackChannel });
        }
      } catch (fallbackError) {
        console.error('[DualChannelSignaling] Fallback also failed:', fallbackError);
        this.options.onError(
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
  }

  /**
   * Send signal via Socket.io
   */
  private async sendViaSocket(message: SignalingMessage): Promise<void> {
    if (!this.options.socket?.connected) {
      throw new Error('Socket.io not connected');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket.io signal timeout'));
      }, 5000);

      this.options.socket!.emit('call-signal', message, (response: { success: boolean; error?: string }) => {
        clearTimeout(timeout);
        if (response.success) {
          resolve();
        } else {
          reject(new Error(response.error || 'Socket.io signal failed'));
        }
      });
    });
  }

  /**
   * Send signal via WebTorrent
   */
  private async sendViaWebTorrent(message: SignalingMessage): Promise<void> {
    if (!this.options.webTorrentManager) {
      throw new Error('WebTorrent manager not initialized');
    }

    // WebTorrent only supports offer, answer, and ice-candidate
    // call-end is handled by closing the peer connection directly
    if (message.type === 'call-end') {
      console.log('[DualChannelSignaling] Skipping call-end for WebTorrent (connection will be closed directly)');
      return;
    }

    if (message.type === 'offer' && message.sdp) {
      await this.options.webTorrentManager.sendSignal({
        type: 'offer',
        sdp: message.sdp,
        callerId: message.callerId,
      });
    } else if (message.type === 'answer' && message.sdp) {
      await this.options.webTorrentManager.sendSignal({
        type: 'answer',
        sdp: message.sdp,
        callerId: message.callerId,
      });
    } else if (message.type === 'ice-candidate' && message.candidate) {
      await this.options.webTorrentManager.sendSignal({
        type: 'ice-candidate',
        candidate: message.candidate,
        callerId: message.callerId,
      });
    }
  }

  /**
   * Listen for incoming signals on both channels
   */
  startListening(): void {
    console.log('[DualChannelSignaling] Starting to listen on both channels');

    // Listen on Socket.io
    if (this.options.socket) {
      this.options.socket.on('call-signal', (message: SignalingMessage) => {
        console.log('[DualChannelSignaling] Received signal via Socket.io:', message);
        this.options.onSignal(message);
      });
    }

    // Listen on WebTorrent
    if (this.options.webTorrentManager) {
      // WebTorrent signals are handled via the onSignal callback in WebTorrentSignalingOptions
      // which is already set up in use-webtorrent-signaling.ts
    }
  }

  /**
   * Stop listening for signals
   */
  stopListening(): void {
    console.log('[DualChannelSignaling] Stopping listening on both channels');

    if (this.options.socket) {
      this.options.socket.off('call-signal');
    }

    // WebTorrent cleanup is handled by WebTorrentSignalingManager
  }

  /**
   * Update mode and recalculate active channel
   *
   * @param mode - New mode
   */
  updateMode(mode: 'Normal' | 'Emergency'): void {
    console.log(`[DualChannelSignaling] Mode changed: ${this.options.mode} → ${mode}`);
    this.options.mode = mode;
    this.activeChannel = this.determineChannel();
  }

  /**
   * Update Socket.io instance
   *
   * @param socket - New Socket.io instance
   */
  updateSocket(socket: Socket | null): void {
    this.options.socket = socket;
    this.activeChannel = this.determineChannel();
  }

  /**
   * Update WebTorrent manager
   *
   * @param manager - New WebTorrent manager
   */
  updateWebTorrentManager(manager: WebTorrentSignalingManager | null): void {
    this.options.webTorrentManager = manager;
    this.activeChannel = this.determineChannel();
  }

  /**
   * Get current active channel
   */
  getActiveChannel(): SignalingChannel {
    return this.activeChannel;
  }

  /**
   * Determine call mode based on channels used
   *
   * @param localChannel - Channel used by local user
   * @param remoteChannel - Channel used by remote user
   * @returns Call mode
   */
  static determineCallMode(
    localChannel: SignalingChannel,
    remoteChannel: SignalingChannel
  ): CallMode {
    if (localChannel === 'socket' && remoteChannel === 'socket') {
      return 'NORMAL';
    } else if (localChannel === 'webtorrent' && remoteChannel === 'webtorrent') {
      return 'EMERGENCY';
    } else {
      return 'ASYMMETRIC';
    }
  }
}

/**
 * Singleton instance
 */
let dualChannelSignalingManager: DualChannelSignalingManager | null = null;

/**
 * Get or create dual-channel signaling manager
 *
 * @param options - Signaling options
 * @returns Dual-channel signaling manager
 */
export function getDualChannelSignalingManager(
  options: DualChannelSignalingOptions
): DualChannelSignalingManager {
  if (!dualChannelSignalingManager) {
    dualChannelSignalingManager = new DualChannelSignalingManager(options);
  }
  return dualChannelSignalingManager;
}

/**
 * Destroy dual-channel signaling manager
 */
export function destroyDualChannelSignalingManager(): void {
  if (dualChannelSignalingManager) {
    dualChannelSignalingManager.stopListening();
    dualChannelSignalingManager = null;
  }
}

