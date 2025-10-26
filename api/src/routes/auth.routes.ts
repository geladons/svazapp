/**
 * Authentication Routes
 *
 * Handles user registration, login, and token refresh.
 * All routes are public (no authentication required).
 *
 * @module routes/auth.routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';

/**
 * Register request schema
 */
const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      'Username can only contain letters, numbers, underscores, and hyphens'
    ),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(100, 'Password must be at most 100 characters'),
  displayName: z.string().min(1).max(100).optional(),
});

/**
 * Login request schema
 */
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Refresh token request schema
 */
const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * Authentication Routes
 *
 * @param fastify - Fastify instance
 */
export default async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService(fastify);
  const userService = new UserService(fastify.prisma);

  /**
   * POST /api/auth/register
   *
   * Register a new user account
   *
   * @body email - User email address
   * @body username - Unique username
   * @body password - User password (will be hashed)
   * @body displayName - Optional display name
   *
   * @returns User object and authentication tokens
   */
  fastify.post<{
    Body: z.infer<typeof registerSchema>;
  }>(
    '/register',
    async (request, reply) => {
      try {
        // Validate request body
        const data = registerSchema.parse(request.body);

        // Check if email already exists
        const emailExists = await userService.emailExists(data.email);
        if (emailExists) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Email already in use',
          });
        }

        // Check if username already exists
        const usernameExists = await userService.usernameExists(data.username);
        if (usernameExists) {
          return reply.code(409).send({
            error: 'Conflict',
            message: 'Username already taken',
          });
        }

        // Hash password
        const passwordHash = await authService.hashPassword(data.password);

        // Create user
        const user = await userService.createUser({
          email: data.email,
          username: data.username,
          passwordHash,
          displayName: data.displayName,
        });

        // Generate tokens
        const tokens = authService.generateTokenPair({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        fastify.log.info(`User registered: ${user.username} (${user.id})`);

        return reply.code(201).send({
          user,
          ...tokens,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Registration error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to register user',
        });
      }
    }
  );

  /**
   * POST /api/auth/login
   *
   * Login with email/username and password
   *
   * @body identifier - Email or username
   * @body password - User password
   *
   * @returns User object and authentication tokens
   */
  fastify.post<{
    Body: z.infer<typeof loginSchema>;
  }>(
    '/login',
    async (request, reply) => {
      try {
        // Validate request body
        const data = loginSchema.parse(request.body);

        // Find user by email or username
        const user = await userService.findByEmailOrUsername(data.identifier);
        if (!user) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid credentials',
          });
        }

        // Verify password
        const isValidPassword = await authService.verifyPassword(
          data.password,
          user.passwordHash
        );
        if (!isValidPassword) {
          return reply.code(401).send({
            error: 'Unauthorized',
            message: 'Invalid credentials',
          });
        }

        // Update online status
        await userService.updateOnlineStatus(user.id, true);

        // Generate tokens
        const tokens = authService.generateTokenPair({
          userId: user.id,
          email: user.email,
          username: user.username,
        });

        // Remove password hash from response
        const { passwordHash: _passwordHash, ...safeUser } = user;

        fastify.log.info(`User logged in: ${user.username} (${user.id})`);

        return reply.code(200).send({
          user: safeUser,
          ...tokens,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Login error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to login',
        });
      }
    }
  );

  /**
   * POST /api/auth/refresh
   *
   * Refresh access token using refresh token
   *
   * @body refreshToken - Valid refresh token
   *
   * @returns New access token and refresh token
   */
  fastify.post<{
    Body: z.infer<typeof refreshSchema>;
  }>(
    '/refresh',
    async (request, reply) => {
      try {
        // Validate request body
        const data = refreshSchema.parse(request.body);

        // Verify refresh token
        const payload = await authService.verifyToken(data.refreshToken);

        // Generate new tokens
        const tokens = authService.generateTokenPair({
          userId: payload.userId,
          email: payload.email,
          username: payload.username,
        });

        fastify.log.debug(`Token refreshed for user: ${payload.userId}`);

        return reply.code(200).send(tokens);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        fastify.log.warn({ error }, 'Token refresh failed');
        return reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or expired refresh token',
        });
      }
    }
  );
}

