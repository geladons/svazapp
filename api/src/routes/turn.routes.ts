import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TurnService } from '../services/turn.service.js';

/**
 * TURN credentials routes
 *
 * Provides endpoints for obtaining temporary TURN server credentials
 * for WebRTC connections.
 */
export default async function turnRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/turn-credentials
   *
   * Generate temporary TURN server credentials for WebRTC
   *
   * @returns {object} TURN credentials with time-limited username and credential
   *
   * @example
   * Response:
   * {
   *   "urls": ["turn:example.com:3478", "turn:example.com:3478?transport=tcp"],
   *   "username": "1698765432:svazuser",
   *   "credential": "base64-encoded-hmac",
   *   "ttl": 3600
   * }
   */
  fastify.get(
    '/turn-credentials',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get temporary TURN server credentials',
        tags: ['webrtc'],
        response: {
          200: {
            type: 'object',
            properties: {
              urls: {
                type: 'array',
                items: { type: 'string' },
                description: 'TURN server URLs',
              },
              username: {
                type: 'string',
                description: 'Time-limited username',
              },
              credential: {
                type: 'string',
                description: 'HMAC-SHA1 credential',
              },
              ttl: {
                type: 'number',
                description: 'Credential time-to-live in seconds',
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get TURN configuration from environment
        const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
        const turnUser = process.env.COTURN_USER || 'svazuser';
        const turnPassword = process.env.COTURN_PASSWORD;

        // Validate TURN configuration
        if (!turnUrl || !turnPassword) {
          return reply.status(500).send({
            error: 'TURN server not configured',
            message: 'TURN_URL or COTURN_PASSWORD environment variables are missing',
          });
        }

        // Create TurnService instance
        const turnService = new TurnService(turnUrl, turnUser, turnPassword);

        // Generate temporary credentials
        const credentials = turnService.generateCredentials();

        return reply.send(credentials);
      } catch (error) {
        fastify.log.error('Error generating TURN credentials:', error);
        return reply.status(500).send({
          error: 'Failed to generate TURN credentials',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );

  /**
   * GET /api/ice-servers
   *
   * Get complete ICE servers configuration (STUN + TURN)
   *
   * @returns {object} Complete ICE servers configuration
   *
   * @example
   * Response:
   * {
   *   "iceServers": [
   *     { "urls": "stun:example.com:3478" },
   *     {
   *       "urls": ["turn:example.com:3478", "turn:example.com:3478?transport=tcp"],
   *       "username": "1698765432:svazuser",
   *       "credential": "base64-encoded-hmac"
   *     }
   *   ]
   * }
   */
  fastify.get(
    '/ice-servers',
    {
      onRequest: [fastify.authenticate],
      schema: {
        description: 'Get complete ICE servers configuration',
        tags: ['webrtc'],
        response: {
          200: {
            type: 'object',
            properties: {
              iceServers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    urls: {
                      oneOf: [
                        { type: 'string' },
                        { type: 'array', items: { type: 'string' } },
                      ],
                    },
                    username: { type: 'string' },
                    credential: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        // Get TURN configuration from environment
        const stunUrl = process.env.NEXT_PUBLIC_STUN_URL;
        const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;
        const turnUser = process.env.COTURN_USER || 'svazuser';
        const turnPassword = process.env.COTURN_PASSWORD;

        const iceServers: Array<{
          urls: string | string[];
          username?: string;
          credential?: string;
        }> = [];

        // Add STUN server
        if (stunUrl) {
          iceServers.push({ urls: stunUrl });
        }

        // Add TURN server with temporary credentials
        if (turnUrl && turnPassword) {
          const turnService = new TurnService(turnUrl, turnUser, turnPassword);
          const turnCredentials = turnService.generateCredentials();

          iceServers.push({
            urls: turnCredentials.urls,
            username: turnCredentials.username,
            credential: turnCredentials.credential,
          });
        }

        // Fallback to public STUN servers if no custom servers configured
        if (iceServers.length === 0) {
          iceServers.push(
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:stun1.l.google.com:19302' }
          );
        }

        return reply.send({ iceServers });
      } catch (error) {
        fastify.log.error('Error generating ICE servers configuration:', error);
        return reply.status(500).send({
          error: 'Failed to generate ICE servers configuration',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  );
}

