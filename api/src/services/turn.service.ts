import crypto from 'crypto';

/**
 * TURN credentials response interface
 */
export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

/**
 * TurnService
 *
 * Generates temporary TURN server credentials for WebRTC connections.
 * Uses time-limited credentials based on HMAC-SHA1 algorithm as per RFC 5389.
 *
 * @see https://datatracker.ietf.org/doc/html/rfc5389
 */
export class TurnService {
  private readonly turnUrl: string;
  private readonly turnUser: string;
  private readonly turnPassword: string;
  private readonly credentialTtl: number;

  /**
   * Create TurnService instance
   *
   * @param turnUrl - TURN server URL from environment
   * @param turnUser - Static TURN username from environment
   * @param turnPassword - Static TURN password (shared secret) from environment
   * @param credentialTtl - Credential time-to-live in seconds (default: 3600 = 1 hour)
   */
  constructor(
    turnUrl: string,
    turnUser: string,
    turnPassword: string,
    credentialTtl = 3600
  ) {
    this.turnUrl = turnUrl;
    this.turnUser = turnUser;
    this.turnPassword = turnPassword;
    this.credentialTtl = credentialTtl;
  }

  /**
   * Generate temporary TURN credentials
   *
   * Creates time-limited credentials using HMAC-SHA1 algorithm.
   * The username format is: `<timestamp>:<static-username>`
   * The credential is: HMAC-SHA1(username, shared-secret)
   *
   * @returns TurnCredentials object with temporary credentials
   */
  generateCredentials(): TurnCredentials {
    // Calculate expiration timestamp (current time + TTL)
    const expirationTimestamp = Math.floor(Date.now() / 1000) + this.credentialTtl;

    // Create time-limited username: <timestamp>:<username>
    const username = `${expirationTimestamp}:${this.turnUser}`;

    // Generate HMAC-SHA1 credential
    const hmac = crypto.createHmac('sha1', this.turnPassword);
    hmac.update(username);
    const credential = hmac.digest('base64');

    // Parse TURN URL to create both TCP and UDP variants
    const turnUrls = this.parseTurnUrls(this.turnUrl);

    return {
      urls: turnUrls,
      username,
      credential,
      ttl: this.credentialTtl,
    };
  }

  /**
   * Parse TURN URL and create TCP/UDP variants
   *
   * @param turnUrl - Base TURN URL (e.g., "turn:example.com:3478")
   * @returns Array of TURN URLs with different transports
   */
  private parseTurnUrls(turnUrl: string): string[] {
    const urls: string[] = [];

    // Add base URL (defaults to UDP)
    urls.push(turnUrl);

    // Add explicit TCP variant if not already specified
    if (!turnUrl.includes('?transport=')) {
      urls.push(`${turnUrl}?transport=tcp`);
    }

    return urls;
  }

  /**
   * Get STUN server URL
   *
   * STUN uses the same server as TURN but with 'stun:' protocol
   *
   * @returns STUN server URL
   */
  getStunUrl(): string {
    return this.turnUrl.replace('turn:', 'stun:');
  }
}

