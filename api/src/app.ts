import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

// Plugins
import dbPlugin from './plugins/db.plugin.js';
import authPlugin from './plugins/auth.plugin.js';
import socketPlugin from './plugins/socket.plugin.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import livekitRoutes from './routes/livekit.routes.js';
import contactRoutes from './routes/contact.routes.js';
import messageRoutes from './routes/message.routes.js';
import callRoutes from './routes/call.routes.js';

/**
 * Build and configure the Fastify application
 * @returns Configured Fastify instance
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport:
        process.env.NODE_ENV === 'development'
          ? {
              target: 'pino-pretty',
              options: {
                translateTime: 'HH:MM:ss Z',
                ignore: 'pid,hostname',
              },
            }
          : undefined,
    },
  });

  // Register CORS
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  });

  // Register rate limiting
  await app.register(rateLimit, {
    max: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
    timeWindow: process.env.RATE_LIMIT_WINDOW || '15m',
  });

  // Register plugins
  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(socketPlugin);

  // Health check endpoint
  app.get('/api/health', async () => {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'connected',
    };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'svaz.app API',
      version: '1.0.0',
      status: 'running',
    };
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(userRoutes, { prefix: '/api/users' });
  await app.register(livekitRoutes, { prefix: '/api/livekit' });
  await app.register(contactRoutes, { prefix: '/api/contacts' });
  await app.register(messageRoutes, { prefix: '/api/chats' });
  await app.register(callRoutes, { prefix: '/api/calls' });

  return app;
}

