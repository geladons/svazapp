/**
 * Database Plugin
 *
 * Fastify plugin that initializes Prisma Client and decorates the Fastify instance.
 * Provides database access throughout the application via `fastify.prisma`.
 *
 * @module plugins/db.plugin
 */

import { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { PrismaClient } from '@prisma/client';

/**
 * Extend Fastify instance with Prisma client
 */
declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

/**
 * Database Plugin
 *
 * Initializes Prisma Client and decorates the Fastify instance.
 * Handles graceful shutdown by disconnecting from the database.
 *
 * @example
 * ```typescript
 * // In app.ts
 * await app.register(dbPlugin);
 *
 * // In routes
 * app.get('/users', async (request, reply) => {
 *   const users = await app.prisma.user.findMany();
 *   return users;
 * });
 * ```
 */
const dbPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  // Initialize Prisma Client
  const prisma = new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
  });

  // Test database connection
  try {
    await prisma.$connect();
    fastify.log.info('Database connected successfully');
  } catch (error) {
    fastify.log.error({ error }, 'Failed to connect to database');
    throw error;
  }

  // Decorate Fastify instance with Prisma client
  fastify.decorate('prisma', prisma);

  // Graceful shutdown: disconnect from database
  fastify.addHook('onClose', async (instance) => {
    instance.log.info('Disconnecting from database...');
    await instance.prisma.$disconnect();
    instance.log.info('Database disconnected');
  });
};

/**
 * Export plugin wrapped with fastify-plugin
 * This ensures the plugin is registered in the root scope
 */
export default fp(dbPlugin, {
  name: 'db-plugin',
});

