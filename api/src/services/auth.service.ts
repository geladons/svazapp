/**
 * Authentication Service
 *
 * Handles JWT token generation, verification, and password hashing.
 * Uses bcrypt for password hashing and @fastify/jwt for token management.
 *
 * @module services/auth.service
 */

import bcrypt from 'bcrypt';
import { FastifyInstance } from 'fastify';

/**
 * JWT payload structure
 */
export interface JWTPayload {
  userId: string;
  email: string;
  username: string;
}

/**
 * Token pair (access + refresh)
 */
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Authentication Service
 *
 * Provides methods for password hashing, verification, and JWT token management.
 * This service is stateless and does not store any user data.
 */
export class AuthService {
  private readonly saltRounds = 10;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor(private readonly app: FastifyInstance) {
    // Use JWT_EXPIRES_IN from environment or default to 90 days
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '90d';

    // Access token: same as refresh token for long-term sessions
    // This allows users to stay logged in for 90 days without re-authentication
    this.accessTokenExpiry = jwtExpiresIn;
    this.refreshTokenExpiry = jwtExpiresIn;
  }

  /**
   * Hash a plain text password using bcrypt
   *
   * @param password - Plain text password to hash
   * @returns Hashed password
   *
   * @example
   * ```typescript
   * const hashedPassword = await authService.hashPassword('mySecretPassword');
   * ```
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a plain text password against a hashed password
   *
   * @param password - Plain text password to verify
   * @param hashedPassword - Hashed password to compare against
   * @returns True if password matches, false otherwise
   *
   * @example
   * ```typescript
   * const isValid = await authService.verifyPassword('myPassword', user.passwordHash);
   * if (isValid) {
   *   // Password is correct
   * }
   * ```
   */
  async verifyPassword(
    password: string,
    hashedPassword: string
  ): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * Generate an access token (short-lived)
   *
   * @param payload - JWT payload containing user information
   * @returns Signed JWT access token
   *
   * @example
   * ```typescript
   * const accessToken = authService.generateAccessToken({
   *   userId: user.id,
   *   email: user.email,
   *   username: user.username
   * });
   * ```
   */
  generateAccessToken(payload: JWTPayload): string {
    return this.app.jwt.sign(payload, {
      expiresIn: this.accessTokenExpiry,
    });
  }

  /**
   * Generate a refresh token (long-lived)
   *
   * @param payload - JWT payload containing user information
   * @returns Signed JWT refresh token
   *
   * @example
   * ```typescript
   * const refreshToken = authService.generateRefreshToken({
   *   userId: user.id,
   *   email: user.email,
   *   username: user.username
   * });
   * ```
   */
  generateRefreshToken(payload: JWTPayload): string {
    return this.app.jwt.sign(payload, {
      expiresIn: this.refreshTokenExpiry,
    });
  }

  /**
   * Generate both access and refresh tokens
   *
   * @param payload - JWT payload containing user information
   * @returns Object containing both access and refresh tokens
   *
   * @example
   * ```typescript
   * const tokens = authService.generateTokenPair({
   *   userId: user.id,
   *   email: user.email,
   *   username: user.username
   * });
   * // Returns: { accessToken: '...', refreshToken: '...' }
   * ```
   */
  generateTokenPair(payload: JWTPayload): TokenPair {
    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
    };
  }

  /**
   * Verify and decode a JWT token
   *
   * @param token - JWT token to verify
   * @returns Decoded JWT payload
   * @throws Error if token is invalid or expired
   *
   * @example
   * ```typescript
   * try {
   *   const payload = await authService.verifyToken(token);
   *   console.log('User ID:', payload.userId);
   * } catch (error) {
   *   console.error('Invalid token:', error.message);
   * }
   * ```
   */
  async verifyToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = this.app.jwt.verify<JWTPayload>(token);
      return decoded;
    } catch {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from Authorization header
   *
   * @param authHeader - Authorization header value (e.g., "Bearer <token>")
   * @returns Extracted token or null if invalid format
   *
   * @example
   * ```typescript
   * const token = authService.extractTokenFromHeader(request.headers.authorization);
   * if (token) {
   *   const payload = await authService.verifyToken(token);
   * }
   * ```
   */
  extractTokenFromHeader(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

