/**
 * LiveKit Routes
 *
 * Handles LiveKit token generation for group video calls.
 * All routes require authentication.
 *
 * @module routes/livekit.routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LiveKitService } from '../services/livekit.service.js';
import { JWTPayload } from '../services/auth.service.js';
import { UserService } from '../services/user.service.js';

/**
 * Token request schema
 */
const tokenRequestSchema = z.object({
  roomName: z.string().min(1, 'Room name is required'),
  metadata: z.string().optional(),
});

/**
 * Guest token query schema
 */
const guestTokenQuerySchema = z.object({
  roomName: z.string().min(1, 'Room name is required'),
  guestName: z.string().min(1, 'Guest name is required'),
});

/**
 * LiveKit Routes
 *
 * @param fastify - Fastify instance
 */
export default async function livekitRoutes(fastify: FastifyInstance) {
  const livekitService = new LiveKitService();
  const userService = new UserService(fastify.prisma);

  /**
   * POST /api/livekit/token
   *
   * Generate a LiveKit access token for authenticated user
   *
   * @header Authorization - Bearer token
   * @body roomName - Room name to join
   * @body metadata - Optional metadata (JSON string)
   *
   * @returns LiveKit token and server URL
   */
  fastify.post<{
    Body: z.infer<typeof tokenRequestSchema>;
  }>(
    '/token',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        // Validate request body
        const data = tokenRequestSchema.parse(request.body);

        // Get user profile for display name
        const userProfile = await userService.findById(user.userId);
        if (!userProfile) {
          return reply.code(404).send({
            error: 'Not Found',
            message: 'User not found',
          });
        }

        // Generate LiveKit token
        const token = await livekitService.generateToken({
          roomName: data.roomName,
          participantName: userProfile.displayName || userProfile.username,
          participantIdentity: user.userId,
          metadata: data.metadata,
        });

        fastify.log.info(
          `LiveKit token generated for user ${user.username} (${user.userId}) in room ${data.roomName}`
        );

        return reply.code(200).send({
          token,
          url: livekitService.getLiveKitUrl(),
          roomName: data.roomName,
        });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        fastify.log.error({ error }, 'LiveKit token generation error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to generate LiveKit token',
        });
      }
    }
  );

  /**
   * GET /api/livekit/guest-token
   *
   * Generate a LiveKit access token for guest user (no authentication required)
   *
   * @query roomName - Room name to join
   * @query guestName - Guest's display name
   *
   * @returns LiveKit token and server URL
   */
  fastify.get<{
    Querystring: z.infer<typeof guestTokenQuerySchema>;
  }>('/guest-token', async (request, reply) => {
    try {
      // Validate query parameters
      const data = guestTokenQuerySchema.parse(request.query);

      // Generate guest LiveKit token
      const token = await livekitService.generateGuestToken(
        data.roomName,
        data.guestName
      );

      fastify.log.info(
        `Guest LiveKit token generated for ${data.guestName} in room ${data.roomName}`
      );

      return reply.code(200).send({
        token,
        url: livekitService.getLiveKitUrl(),
        roomName: data.roomName,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation Error',
          message: error.errors[0].message,
          details: error.errors,
        });
      }

      fastify.log.error({ error }, 'Guest LiveKit token generation error');
      return reply.code(500).send({
        error: 'Internal Server Error',
        message: 'Failed to generate guest LiveKit token',
      });
    }
  });
}

