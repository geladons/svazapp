/**
 * User Routes
 *
 * Handles user profile operations (read, update).
 * All routes require authentication.
 *
 * @module routes/user.routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { UserService, SearchType } from '../services/user.service.js';
import { JWTPayload } from '../services/auth.service.js';

/**
 * Update user request schema
 */
const updateUserSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  phone: z.string().max(20).optional(),
});

/**
 * User Routes
 *
 * @param fastify - Fastify instance
 */
export default async function userRoutes(fastify: FastifyInstance) {
  const userService = new UserService(fastify.prisma);

  /**
   * GET /api/users/me
   *
   * Get current user's profile
   *
   * @header Authorization - Bearer token
   * @returns Current user object
   */
  fastify.get(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        // Fetch user from database
        const userProfile = await userService.findById(user.userId);

        if (!userProfile) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        // Update last active timestamp
        await userService.updateLastActive(user.userId);

        return reply.code(200).send(userProfile);
      } catch (error) {
        fastify.log.error({ error }, 'Get current user error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch user profile',
        });
      }
    }
  );

  /**
   * PATCH /api/users/me
   *
   * Update current user's profile
   *
   * @header Authorization - Bearer token
   * @body displayName - Optional display name
   * @body avatarUrl - Optional avatar URL
   * @body bio - Optional bio
   * @body phone - Optional phone number
   *
   * @returns Updated user object
   */
  fastify.patch<{
    Body: z.infer<typeof updateUserSchema>;
  }>(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        // Validate request body
        const data = updateUserSchema.parse(request.body);

        // Update user
        const updatedUser = await userService.updateUser(user.userId, data);

        fastify.log.info(`User updated: ${user.username} (${user.userId})`);

        return reply.code(200).send(updatedUser);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'Update user error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to update user profile',
        });
      }
    }
  );

  /**
   * GET /api/users/search
   *
   * Search for users by email, phone, or username
   *
   * @header Authorization - Bearer token
   * @query q - Search query
   * @query type - Search type (email, phone, username, all)
   * @query limit - Maximum number of results (default: 20, max: 50)
   * @query offset - Offset for pagination (default: 0)
   *
   * @returns Array of matching users
   */
  fastify.get<{
    Querystring: {
      q: string;
      type?: SearchType;
      limit?: string;
      offset?: string;
    };
  }>(
    '/search',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { q, type = 'all', limit = '20', offset = '0' } = request.query;

        // Validate query parameter
        if (!q || q.trim().length === 0) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Search query (q) is required',
          });
        }

        // Validate search type
        const validTypes: SearchType[] = ['email', 'phone', 'username', 'all'];
        if (!validTypes.includes(type)) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid search type. Must be: email, phone, username, or all',
          });
        }

        // Parse and validate pagination parameters
        const parsedLimit = Math.min(parseInt(limit, 10) || 20, 50);
        const parsedOffset = Math.max(parseInt(offset, 10) || 0, 0);

        // Search users
        const users = await userService.searchUsers({
          query: q.trim(),
          type,
          currentUserId: user.userId,
          limit: parsedLimit,
          offset: parsedOffset,
        });

        fastify.log.debug(
          `User search: ${user.username} searched for "${q}" (type: ${type}, found: ${users.length})`
        );

        return reply.code(200).send({
          results: users,
          count: users.length,
          limit: parsedLimit,
          offset: parsedOffset,
        });
      } catch (error) {
        fastify.log.error({ error }, 'User search error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to search users',
        });
      }
    }
  );

  /**
   * GET /api/users/:id
   *
   * Get user profile by ID
   *
   * @header Authorization - Bearer token
   * @param id - User ID
   * @returns User object
   */
  fastify.get<{
    Params: { id: string };
  }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const { id } = request.params;

        // Fetch user from database
        const userProfile = await userService.findById(id);

        if (!userProfile) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        return reply.code(200).send(userProfile);
      } catch (error) {
        fastify.log.error({ error }, 'Get user by ID error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch user profile',
        });
      }
    }
  );

  /**
   * DELETE /api/users/me
   *
   * Delete current user's account
   * This will cascade delete all related data (contacts, calls, etc.)
   *
   * @header Authorization - Bearer token
   * @returns Success message
   */
  fastify.delete(
    '/me',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        // Delete user account (cascades to all related data)
        await userService.deleteUser(user.userId);

        fastify.log.info(`User account deleted: ${user.username} (${user.userId})`);

        return reply.code(200).send({
          message: 'Account deleted successfully',
        });
      } catch (error) {
        fastify.log.error({ error }, 'Delete user account error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete account',
        });
      }
    }
  );
}

