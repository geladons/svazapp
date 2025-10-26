import WebTorrent from 'webtorrent';
import SimplePeer from 'simple-peer';
import { createHash } from 'crypto';

/**
 * WebTorrent P2P Signaling Manager
 *
 * Uses WebTorrent DHT (Distributed Hash Table) for peer discovery
 * and signaling in Emergency Mode when servers are unavailable.
 *
 * How it works:
 * 1. Create deterministic "info hash" from user IDs (sorted)
 * 2. Join torrent swarm using this info hash
 * 3. Exchange WebRTC SDP offers/answers via torrent wire protocol
 * 4. Establish direct P2P connection using SimplePeer
 */

/**
 * WebTorrent Wire Protocol Extension
 * Extended type for WebTorrent wire with signaling support
 */
interface WebTorrentWire {
  on(event: 'extended', callback: (ext: string, buf: Buffer) => void): void;
  extended(ext: string, buf: Buffer): void;
}

/**
 * WebTorrent Torrent with Wire Support
 * Extended type for WebTorrent torrent with wires array
 */
interface WebTorrentTorrentWithWires extends WebTorrent.Torrent {
  wires: WebTorrentWire[];
  on(event: 'wire', callback: (wire: WebTorrentWire) => void): void;
}

export type SignalingMessage =
  | { type: 'offer'; sdp: string; callerId: string }
  | { type: 'answer'; sdp: string; callerId: string }
  | { type: 'ice-candidate'; candidate: RTCIceCandidateInit; callerId: string };

export interface WebTorrentSignalingOptions {
  userId: string;
  peerId: string;
  onSignal?: (message: SignalingMessage) => void;
  onPeerConnected?: (peerId: string) => void;
  onPeerDisconnected?: (peerId: string) => void;
  onError?: (error: Error) => void;
}

/**
 * WebTorrent Signaling Manager
 *
 * Manages P2P signaling using WebTorrent DHT for peer discovery.
 */
export class WebTorrentSignalingManager {
  private client: WebTorrent.Instance | null = null;
  private torrent: WebTorrentTorrentWithWires | null = null;
  private options: WebTorrentSignalingOptions;
  private peers: Map<string, SimplePeer.Instance> = new Map();

  constructor(options: WebTorrentSignalingOptions) {
    this.options = options;
  }

  /**
   * Initialize WebTorrent client
   */
  async init(): Promise<void> {
    if (this.client) {
      console.warn('[WebTorrentSignaling] Client already initialized');
      return;
    }

    console.log('[WebTorrentSignaling] Initializing WebTorrent client...');

    try {
      // Create WebTorrent client
      this.client = new WebTorrent();

      this.client.on('error', (err) => {
        console.error('[WebTorrentSignaling] Client error:', err);
        const error = typeof err === 'string' ? new Error(err) : err;
        this.options.onError?.(error);
      });

      console.log('[WebTorrentSignaling] WebTorrent client initialized');
    } catch (error) {
      console.error('[WebTorrentSignaling] Failed to initialize client:', error);
      throw error;
    }
  }

  /**
   * Join signaling swarm for a specific peer
   *
   * Creates a deterministic info hash from user IDs to ensure
   * both peers join the same swarm.
   *
   * @param peerId - ID of the peer to connect to
   */
  async joinSwarm(peerId: string): Promise<void> {
    if (!this.client) {
      throw new Error('WebTorrent client not initialized');
    }

    // Create deterministic info hash from user IDs (sorted)
    const infoHash = this.createInfoHash(this.options.userId, peerId);

    console.log(
      `[WebTorrentSignaling] Joining swarm for peer ${peerId} (infoHash: ${infoHash})`
    );

    try {
      // Create or join torrent swarm
      // We use a magnet link with the info hash
      const magnetURI = `magnet:?xt=urn:btih:${infoHash}`;

      this.torrent = this.client.add(magnetURI, {
        announce: [
          // Public WebTorrent trackers
          'wss://tracker.openwebtorrent.com',
          'wss://tracker.btorrent.xyz',
          'wss://tracker.webtorrent.dev',
        ],
      });

      this.torrent.on('wire', (wire: WebTorrentWire) => {
        console.log('[WebTorrentSignaling] New wire connection');

        // Listen for signaling messages on the wire
        wire.on('extended', (ext: string, buf: Buffer) => {
          if (ext === 'signaling') {
            try {
              const message = JSON.parse(buf.toString()) as SignalingMessage;
              console.log('[WebTorrentSignaling] Received signaling message:', message);
              this.options.onSignal?.(message);
            } catch (error) {
              console.error('[WebTorrentSignaling] Failed to parse signaling message:', error);
            }
          }
        });
      });

      this.torrent.on('error', (err: string | Error) => {
        console.error('[WebTorrentSignaling] Torrent error:', err);
        const error = typeof err === 'string' ? new Error(err) : err;
        this.options.onError?.(error);
      });

      console.log('[WebTorrentSignaling] Joined swarm successfully');
    } catch (error) {
      console.error('[WebTorrentSignaling] Failed to join swarm:', error);
      throw error;
    }
  }

  /**
   * Send signaling message to peer
   *
   * @param message - Signaling message to send
   */
  async sendSignal(message: SignalingMessage): Promise<void> {
    if (!this.torrent) {
      throw new Error('Not connected to swarm');
    }

    console.log('[WebTorrentSignaling] Sending signaling message:', message);

    try {
      // Send message to all wires in the swarm
      this.torrent.wires.forEach((wire: WebTorrentWire) => {
        wire.extended('signaling', Buffer.from(JSON.stringify(message)));
      });
    } catch (error) {
      console.error('[WebTorrentSignaling] Failed to send signaling message:', error);
      throw error;
    }
  }

  /**
   * Leave swarm and disconnect
   */
  async leaveSwarm(): Promise<void> {
    if (this.torrent) {
      console.log('[WebTorrentSignaling] Leaving swarm...');

      try {
        await new Promise<void>((resolve, reject) => {
          this.torrent!.destroy((err?: Error) => {
            if (err) {
              console.error('[WebTorrentSignaling] Error destroying torrent:', err);
              reject(err);
            } else {
              console.log('[WebTorrentSignaling] Left swarm successfully');
              this.torrent = null;
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('[WebTorrentSignaling] Failed to leave swarm:', error);
        throw error;
      }
    }
  }

  /**
   * Destroy WebTorrent client and clean up
   */
  async destroy(): Promise<void> {
    console.log('[WebTorrentSignaling] Destroying client...');

    // Destroy all peers
    this.peers.forEach((peer) => {
      peer.destroy();
    });
    this.peers.clear();

    // Leave swarm
    await this.leaveSwarm();

    // Destroy client
    if (this.client) {
      try {
        await new Promise<void>((resolve, reject) => {
          this.client!.destroy((err) => {
            if (err) {
              console.error('[WebTorrentSignaling] Error destroying client:', err);
              reject(err);
            } else {
              console.log('[WebTorrentSignaling] Client destroyed successfully');
              this.client = null;
              resolve();
            }
          });
        });
      } catch (error) {
        console.error('[WebTorrentSignaling] Failed to destroy client:', error);
        throw error;
      }
    }
  }

  /**
   * Create deterministic info hash from two user IDs
   *
   * This ensures both peers generate the same info hash
   * and join the same swarm.
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Info hash (40-character hex string)
   */
  private createInfoHash(userId1: string, userId2: string): string {
    // Sort user IDs to ensure deterministic hash
    const sortedIds = [userId1, userId2].sort();
    const combined = sortedIds.join(':');

    // Create SHA-1 hash (required for BitTorrent info hash)
    const hash = createHash('sha1');
    hash.update(combined);

    return hash.digest('hex');
  }

  /**
   * Get number of connected peers in swarm
   */
  getPeerCount(): number {
    return this.torrent?.wires.length ?? 0;
  }

  /**
   * Check if connected to swarm
   */
  isConnected(): boolean {
    return this.torrent !== null && this.torrent.wires.length > 0;
  }
}

/**
 * Singleton instance
 */
let signalingManager: WebTorrentSignalingManager | null = null;

/**
 * Get or create WebTorrent signaling manager instance
 *
 * @param options - Signaling options
 * @returns Signaling manager instance
 */
export function getWebTorrentSignalingManager(
  options: WebTorrentSignalingOptions
): WebTorrentSignalingManager {
  if (!signalingManager) {
    signalingManager = new WebTorrentSignalingManager(options);
  }
  return signalingManager;
}

/**
 * Destroy singleton instance
 */
export async function destroyWebTorrentSignalingManager(): Promise<void> {
  if (signalingManager) {
    await signalingManager.destroy();
    signalingManager = null;
  }
}

