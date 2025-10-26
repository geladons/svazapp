/**
 * Socket.io Plugin
 *
 * Fastify plugin that initializes Socket.io for real-time communication.
 * Provides WebSocket signaling for 1-on-1 calls and real-time messaging.
 *
 * @module plugins/socket.plugin
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import fastifySocketIO from 'fastify-socket.io';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { MessageService } from '../services/message.service.js';
import {
  SignalOfferPayload,
  SignalAnswerPayload,
  SignalIceCandidatePayload,
} from '../interfaces/webrtc.interfaces.js';

/**
 * Extend Fastify instance with Socket.io server
 */
declare module 'fastify' {
  interface FastifyInstance {
    io: SocketIOServer;
  }
}

/**
 * Socket.io Plugin
 *
 * Initializes Socket.io server and sets up event handlers for signaling.
 * Handles WebRTC signaling for 1-on-1 calls (offer, answer, ICE candidates).
 *
 * @example
 * ```typescript
 * // In app.ts
 * await app.register(socketPlugin);
 *
 * // Socket.io is now available at app.io
 * app.io.on('connection', (socket) => {
 *   console.log('Client connected:', socket.id);
 * });
 * ```
 */
const socketPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Register fastify-socket.io
  await fastify.register(fastifySocketIO, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  // Initialize message service
  const messageService = new MessageService(fastify.prisma);

  // Socket.io connection handler
  fastify.io.on('connection', (socket: Socket) => {
    fastify.log.info(`Socket connected: ${socket.id}`);

    // User joins with their user ID
    socket.on('join', (userId: string) => {
      socket.join(userId);
      fastify.log.debug(`User ${userId} joined room`);
    });

    // WebRTC signaling: offer
    socket.on('signal-offer', (data: SignalOfferPayload) => {
      fastify.log.debug(`Signal offer from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit('signal-offer', {
        from: socket.id,
        offer: data.offer,
      });
    });

    // WebRTC signaling: answer
    socket.on('signal-answer', (data: SignalAnswerPayload) => {
      fastify.log.debug(`Signal answer from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit('signal-answer', {
        from: socket.id,
        answer: data.answer,
      });
    });

    // WebRTC signaling: ICE candidate
    socket.on('signal-ice-candidate', (data: SignalIceCandidatePayload) => {
      fastify.log.debug(`ICE candidate from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit('signal-ice-candidate', {
        from: socket.id,
        candidate: data.candidate,
      });
    });

    // Call initiation
    socket.on('call-initiate', (data: { to: string; callType: string }) => {
      fastify.log.info(`Call initiated from ${socket.id} to ${data.to}`);
      socket.to(data.to).emit('call-incoming', {
        from: socket.id,
        callType: data.callType,
      });
    });

    // Call accepted
    socket.on('call-accept', (data: { to: string }) => {
      fastify.log.info(`Call accepted by ${socket.id}`);
      socket.to(data.to).emit('call-accepted', {
        from: socket.id,
      });
    });

    // Call rejected
    socket.on('call-reject', (data: { to: string }) => {
      fastify.log.info(`Call rejected by ${socket.id}`);
      socket.to(data.to).emit('call-rejected', {
        from: socket.id,
      });
    });

    // Call ended
    socket.on('call-end', (data: { to: string }) => {
      fastify.log.info(`Call ended by ${socket.id}`);
      socket.to(data.to).emit('call-ended', {
        from: socket.id,
      });
    });

    // Call missed (timeout)
    socket.on('call-missed', (data: { callId: string; to: string }) => {
      fastify.log.info(`Call ${data.callId} missed`);
      socket.to(data.to).emit('call-missed', {
        from: socket.id,
        callId: data.callId,
      });
    });

    // Message sent
    socket.on(
      'message-send',
      async (data: {
        to: string;
        chatId: string;
        message: string;
        timestamp: string;
      }) => {
        try {
          fastify.log.debug(
            `Message from ${socket.id} to ${data.to} in chat ${data.chatId}`
          );

          // Get sender's userId from socket (set during 'join' event)
          // For now, we'll use socket.id as a placeholder
          // In production, you should store userId in socket.data during authentication
          const fromUserId = socket.id;

          // Update chat metadata
          await messageService.updateChatMetadata(
            data.chatId,
            data.message.substring(0, 100), // Preview (first 100 chars)
            fromUserId
          );

          // Forward message to recipient
          socket.to(data.to).emit('message-received', {
            from: fromUserId,
            chatId: data.chatId,
            message: data.message,
            timestamp: data.timestamp,
          });
        } catch (error) {
          fastify.log.error({ error }, 'Error handling message-send');
        }
      }
    );

    // Typing started
    socket.on('typing-start', (data: { to: string; chatId: string }) => {
      fastify.log.debug(`Typing started by ${socket.id} in chat ${data.chatId}`);
      socket.to(data.to).emit('typing-start', {
        from: socket.id,
        chatId: data.chatId,
      });
    });

    // Typing stopped
    socket.on('typing-stop', (data: { to: string; chatId: string }) => {
      fastify.log.debug(`Typing stopped by ${socket.id} in chat ${data.chatId}`);
      socket.to(data.to).emit('typing-stop', {
        from: socket.id,
        chatId: data.chatId,
      });
    });

    // Chat read notification
    socket.on('chat-read', async (data: { chatId: string; to: string }) => {
      try {
        fastify.log.debug(`Chat ${data.chatId} marked as read by ${socket.id}`);

        // Notify the other participant that chat was read
        socket.to(data.to).emit('chat-read', {
          from: socket.id,
          chatId: data.chatId,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Error handling chat-read');
      }
    });

    // Disconnect handler
    socket.on('disconnect', () => {
      fastify.log.info(`Socket disconnected: ${socket.id}`);
    });
  });

  fastify.log.info('Socket.io plugin registered');
};

/**
 * Export plugin wrapped with fastify-plugin
 */
export default fp(socketPlugin, {
  name: 'socket-plugin',
  dependencies: ['db-plugin', 'auth-plugin'],
});

