import 'dotenv/config';
import { buildApp } from './app.js';

/**
 * Start the Fastify server
 */
async function start(): Promise<void> {
  try {
    const app = await buildApp();

    const port = parseInt(process.env.PORT || '8080', 10);
    const host = process.env.HOST || '0.0.0.0';

    await app.listen({ port, host });

    app.log.info(`Server listening on ${host}:${port}`);
    app.log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  process.exit(0);
});

// Start the server
start();

