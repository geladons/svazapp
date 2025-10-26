/**
 * Call Routes
 *
 * Handles call history operations.
 * Stores call metadata for call history screen.
 *
 * All routes require authentication.
 *
 * @module routes/call.routes
 */

import { FastifyInstance } from 'fastify';
import { CallService } from '../services/call.service.js';
import { JWTPayload } from '../services/auth.service.js';
import { CallType, CallMode } from '@prisma/client';

/**
 * Call Routes
 *
 * @param fastify - Fastify instance
 */
export default async function callRoutes(fastify: FastifyInstance) {
  const callService = new CallService(fastify.prisma);

  /**
   * GET /api/calls
   *
   * Get call history for authenticated user
   *
   * @header Authorization - Bearer token
   * @query filter - Filter: 'all' | 'missed' (default: 'all')
   * @query limit - Max results (default: 50, max: 100)
   *
   * @returns Array of calls with participant info, sorted by most recent
   *
   * @example
   * Request:
   * GET /api/calls?filter=missed&limit=20
   *
   * Response:
   * {
   *   "calls": [
   *     {
   *       "id": "call123",
   *       "createdAt": "2025-10-25T08:00:00.000Z",
   *       "updatedAt": "2025-10-25T08:00:30.000Z",
   *       "callerId": "user123",
   *       "receiverId": "user456",
   *       "type": "VIDEO",
   *       "status": "MISSED",
   *       "direction": "INCOMING",
   *       "mode": "NORMAL",
   *       "startedAt": null,
   *       "endedAt": "2025-10-25T08:00:30.000Z",
   *       "duration": 0,
   *       "participant": {
   *         "id": "user123",
   *         "username": "anna",
   *         "displayName": "Anna Smith",
   *         "avatarUrl": null,
   *         "isOnline": true,
   *         "lastSeenAt": "2025-10-25T08:00:00.000Z"
   *       }
   *     }
   *   ]
   * }
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          properties: {
            filter: {
              type: 'string',
              enum: ['all', 'missed'],
              default: 'all',
            },
            limit: {
              type: 'number',
              default: 50,
              minimum: 1,
              maximum: 100,
            },
          },
        },

      },
    },
    async (request, reply) => {
      const user = request.user as JWTPayload;
      const { filter = 'all', limit = 50 } = request.query as {
        filter?: 'all' | 'missed';
        limit?: number;
      };

      try {
        const calls = await callService.getCallHistory(user.userId, filter, limit);
        return { calls };
      } catch (error) {
        fastify.log.error({ error }, 'Error fetching call history');
        return reply.status(500).send({ error: 'Failed to fetch call history' });
      }
    }
  );

  /**
   * POST /api/calls
   *
   * Create a new call record
   *
   * Used when initiating a call to create a history entry.
   *
   * @header Authorization - Bearer token
   * @body receiverId - ID of user to call
   * @body type - Call type: 'AUDIO' | 'VIDEO' | 'SCREEN'
   * @body mode - Call mode: 'NORMAL' | 'EMERGENCY' | 'ASYMMETRIC' (default: 'NORMAL')
   *
   * @returns Created call record
   *
   * @example
   * Request:
   * POST /api/calls
   * {
   *   "receiverId": "user456",
   *   "type": "VIDEO",
   *   "mode": "NORMAL"
   * }
   *
   * Response:
   * {
   *   "call": {
   *     "id": "call123",
   *     "createdAt": "2025-10-25T08:00:00.000Z",
   *     "callerId": "user123",
   *     "receiverId": "user456",
   *     "type": "VIDEO",
   *     "status": "RINGING",
   *     "mode": "NORMAL"
   *   }
   * }
   */
  fastify.post(
    '/',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: {
          type: 'object',
          required: ['receiverId', 'type'],
          properties: {
            receiverId: {
              type: 'string',
            },
            type: {
              type: 'string',
              enum: ['AUDIO', 'VIDEO', 'SCREEN'],
            },
            mode: {
              type: 'string',
              enum: ['NORMAL', 'EMERGENCY', 'ASYMMETRIC'],
              default: 'NORMAL',
            },
          },
        },

      },
    },
    async (request, reply) => {
      const user = request.user as JWTPayload;
      const { receiverId, type, mode = 'NORMAL' } = request.body as {
        receiverId: string;
        type: CallType;
        mode?: CallMode;
      };

      try {
        const call = await callService.createCall(
          user.userId,
          receiverId,
          type as CallType,
          mode as CallMode
        );
        return reply.status(201).send({ call });
      } catch (error) {
        fastify.log.error({ error }, 'Error creating call record');
        return reply.status(500).send({ error: 'Failed to create call record' });
      }
    }
  );

  /**
   * PATCH /api/calls/:id/end
   *
   * End a call
   *
   * Sets endedAt timestamp and calculates duration.
   *
   * @header Authorization - Bearer token
   * @param id - Call ID
   *
   * @returns Updated call record
   */
  fastify.patch(
    '/:id/end',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const call = await callService.endCall(id);
        return { call };
      } catch (error) {
        fastify.log.error({ error }, 'Error ending call');
        return reply.status(500).send({ error: 'Failed to end call' });
      }
    }
  );

  /**
   * PATCH /api/calls/:id/missed
   *
   * Mark call as missed
   *
   * Used when receiver doesn't answer within timeout.
   *
   * @header Authorization - Bearer token
   * @param id - Call ID
   *
   * @returns Updated call record
   */
  fastify.patch(
    '/:id/missed',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string };

      try {
        const call = await callService.markCallAsMissed(id);
        return { call };
      } catch (error) {
        fastify.log.error({ error }, 'Error marking call as missed');
        return reply.status(500).send({ error: 'Failed to mark call as missed' });
      }
    }
  );
}

