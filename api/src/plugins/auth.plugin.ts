/**
 * Authentication Plugin
 *
 * Fastify plugin that initializes JWT authentication and provides
 * authentication decorators and hooks.
 *
 * @module plugins/auth.plugin
 */

import { FastifyInstance, FastifyPluginAsync, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import fastifyJwt from '@fastify/jwt';
import { JWTPayload } from '../services/auth.service.js';

/**
 * Extend @fastify/jwt user type
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JWTPayload;
  }
}

/**
 * Authentication Plugin
 *
 * Registers @fastify/jwt and provides authentication utilities.
 * Adds `request.user` property after successful JWT verification.
 *
 * @example
 * ```typescript
 * // In app.ts
 * await app.register(authPlugin);
 *
 * // In routes (protected)
 * app.get('/protected', {
 *   onRequest: [app.authenticate]
 * }, async (request, reply) => {
 *   return { userId: request.user.userId };
 * });
 * ```
 */
const authPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Get JWT secret from environment
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  // Register @fastify/jwt
  await fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      algorithm: 'HS256',
    },
    verify: {
      algorithms: ['HS256'],
    },
  });

  // Decorate request with authenticate method
  fastify.decorate(
    'authenticate',
    async function (request: FastifyRequest, reply) {
      try {
        // Verify JWT token from Authorization header
        await request.jwtVerify();

        // Token is valid, user payload is now in request.user
        fastify.log.debug(
          `User authenticated: ${(request.user as JWTPayload).userId}`
        );
      } catch (error) {
        // Token is invalid or missing
        fastify.log.warn({ error }, 'Authentication failed');
        reply.code(401).send({
          error: 'Unauthorized',
          message: 'Invalid or missing authentication token',
        });
      }
    }
  );

  fastify.log.info('Authentication plugin registered');
};

/**
 * Extend Fastify instance with authenticate decorator
 */
declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

/**
 * Export plugin wrapped with fastify-plugin
 */
export default fp(authPlugin, {
  name: 'auth-plugin',
  dependencies: ['db-plugin'], // Ensure db plugin is loaded first
});

