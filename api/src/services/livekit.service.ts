/**
 * LiveKit Service
 *
 * Handles LiveKit token generation for group video calls.
 * Uses livekit-server-sdk to create secure access tokens.
 *
 * @module services/livekit.service
 */

import { AccessToken } from 'livekit-server-sdk';

/**
 * LiveKit token options
 */
export interface LiveKitTokenOptions {
  roomName: string;
  participantName: string;
  participantIdentity: string;
  metadata?: string;
}

/**
 * LiveKit Service
 *
 * Provides methods for generating LiveKit access tokens.
 * Tokens are required for clients to join LiveKit rooms.
 */
export class LiveKitService {
  private readonly apiKey: string;
  private readonly apiSecret: string;
  private readonly livekitPublicUrl: string;

  constructor() {
    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.LIVEKIT_URL;
    const livekitPublicUrl = process.env.LIVEKIT_PUBLIC_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      throw new Error(
        'LiveKit credentials not configured. Please set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and LIVEKIT_URL environment variables.'
      );
    }

    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    // Use public URL if provided, otherwise fall back to internal URL
    // Public URL should be browser-accessible (e.g., ws://192.168.1.241/livekit or wss://svaz.app/livekit)
    this.livekitPublicUrl = livekitPublicUrl || livekitUrl;
  }

  /**
   * Generate a LiveKit access token
   *
   * @param options - Token generation options
   * @returns Signed JWT token for LiveKit access
   *
   * @example
   * ```typescript
   * const token = livekitService.generateToken({
   *   roomName: 'room-123',
   *   participantName: 'John Doe',
   *   participantIdentity: 'user-456'
   * });
   * ```
   */
  async generateToken(options: LiveKitTokenOptions): Promise<string> {
    // Create access token
    const token = new AccessToken(this.apiKey, this.apiSecret, {
      identity: options.participantIdentity,
      name: options.participantName,
      metadata: options.metadata,
    });

    // Grant permissions for the room
    token.addGrant({
      roomJoin: true,
      room: options.roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Generate and return JWT
    return await token.toJwt();
  }

  /**
   * Generate a guest token (for users without accounts)
   *
   * @param roomName - Room name to join
   * @param guestName - Guest's display name
   * @returns Signed JWT token for LiveKit access
   *
   * @example
   * ```typescript
   * const token = livekitService.generateGuestToken('room-123', 'Guest User');
   * ```
   */
  async generateGuestToken(roomName: string, guestName: string): Promise<string> {
    // Generate a unique guest identity
    const guestIdentity = `guest-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    return await this.generateToken({
      roomName,
      participantName: guestName,
      participantIdentity: guestIdentity,
      metadata: JSON.stringify({ isGuest: true }),
    });
  }

  /**
   * Get LiveKit server URL (public, browser-accessible)
   *
   * Returns the public LiveKit URL that browsers can connect to.
   * This should be the URL accessible from the client (e.g., through Caddy proxy).
   *
   * @returns LiveKit WebSocket URL (public)
   *
   * @example
   * ```typescript
   * const url = livekitService.getLiveKitUrl();
   * // Returns: 'ws://192.168.1.241/livekit' or 'wss://svaz.app/livekit'
   * ```
   */
  getLiveKitUrl(): string {
    return this.livekitPublicUrl;
  }
}

