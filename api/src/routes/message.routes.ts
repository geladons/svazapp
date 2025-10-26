/**
 * Message Routes
 *
 * Handles chat metadata operations.
 * Note: Actual messages are NOT stored on server - they're sent via Socket.io
 * and stored in Dexie.js on client. These routes only manage chat metadata.
 *
 * All routes require authentication.
 *
 * @module routes/message.routes
 */

import { FastifyInstance } from 'fastify';
import { MessageService } from '../services/message.service.js';
import { JWTPayload } from '../services/auth.service.js';

/**
 * Message Routes
 *
 * @param fastify - Fastify instance
 */
export default async function messageRoutes(fastify: FastifyInstance) {
  const messageService = new MessageService(fastify.prisma);

  /**
   * GET /api/chats
   *
   * Get all chats for authenticated user
   *
   * @header Authorization - Bearer token
   *
   * @returns Array of chats with participant info, sorted by last message time
   *
   * @example
   * Response:
   * {
   *   "chats": [
   *     {
   *       "id": "chat123",
   *       "createdAt": "2025-10-25T08:00:00.000Z",
   *       "updatedAt": "2025-10-25T09:30:00.000Z",
   *       "lastMessage": "Hey, how are you?",
   *       "lastMessageAt": "2025-10-25T09:30:00.000Z",
   *       "lastMessageBy": "user456",
   *       "unreadCountUser1": 3,
   *       "participant": {
   *         "id": "user456",
   *         "username": "john",
   *         "displayName": "John Doe",
   *         "avatarUrl": null,
   *         "isOnline": true,
   *         "lastSeenAt": "2025-10-25T09:30:00.000Z"
   *       }
   *     }
   *   ]
   * }
   */
  fastify.get(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        const chats = await messageService.getUserChats(user.userId);

        return reply.code(200).send({
          chats,
        });
      } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to fetch chats',
        });
      }
    }
  );

  /**
   * PATCH /api/chats/:id/read
   *
   * Mark chat as read (reset unread count to 0)
   *
   * @header Authorization - Bearer token
   * @param id - Chat ID
   *
   * @returns Updated chat
   *
   * @example
   * Response:
   * {
   *   "chat": {
   *     "id": "chat123",
   *     "unreadCountUser1": 0,
   *     "unreadCountUser2": 5
   *   }
   * }
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/read',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { id } = request.params;

        const chat = await messageService.markChatAsRead(id, user.userId);

        return reply.code(200).send({
          chat,
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Chat not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'Chat not found',
            });
          }
          if (error.message === 'User is not a participant in this chat') {
            return reply.code(403).send({
              error: 'Forbidden',
              message: 'You are not a participant in this chat',
            });
          }
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to mark chat as read',
        });
      }
    }
  );

  /**
   * DELETE /api/chats/:id
   *
   * Delete chat metadata
   * Note: This only deletes server-side metadata. Messages in Dexie.js remain.
   *
   * @header Authorization - Bearer token
   * @param id - Chat ID
   *
   * @returns Success message
   */
  fastify.delete<{
    Params: { id: string };
  }>(
    '/:id',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { id } = request.params;

        await messageService.deleteChat(id, user.userId);

        return reply.code(200).send({
          message: 'Chat deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'Chat not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: 'Chat not found',
            });
          }
          if (error.message === 'User is not a participant in this chat') {
            return reply.code(403).send({
              error: 'Forbidden',
              message: 'You are not a participant in this chat',
            });
          }
        }

        fastify.log.error(error);
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete chat',
        });
      }
    }
  );
}

