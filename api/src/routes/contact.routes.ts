/**
 * Contact Routes
 *
 * Handles contact management operations.
 * All routes require authentication.
 *
 * @module routes/contact.routes
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContactService } from '../services/contact.service.js';
import { JWTPayload } from '../services/auth.service.js';
import { ContactStatus } from '@prisma/client';

/**
 * Create contact request schema
 */
const createContactSchema = z.object({
  contactId: z.string().min(1, 'Contact ID is required'),
});

/**
 * Contact Routes
 *
 * @param fastify - Fastify instance
 */
export default async function contactRoutes(fastify: FastifyInstance) {
  const contactService = new ContactService(fastify.prisma);

  /**
   * POST /api/contacts
   *
   * Send a contact request to another user
   *
   * @header Authorization - Bearer token
   * @body contactId - ID of the user to add as contact
   *
   * @returns Created contact with PENDING status
   */
  fastify.post<{
    Body: z.infer<typeof createContactSchema>;
  }>(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;

        // Validate request body
        const data = createContactSchema.parse(request.body);

        // Create contact request
        const contact = await contactService.createContactRequest(
          user.userId,
          data.contactId
        );

        fastify.log.info(
          `Contact request created: ${user.username} -> ${data.contactId}`
        );

        return reply.code(201).send(contact);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: error.errors[0].message,
            details: error.errors,
          });
        }

        if (error instanceof Error) {
          // Handle specific business logic errors
          if (
            error.message === 'Cannot add yourself as a contact' ||
            error.message === 'Contact user not found' ||
            error.message === 'Contact relationship already exists'
          ) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Create contact error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to create contact request',
        });
      }
    }
  );

  /**
   * GET /api/contacts
   *
   * Get all contacts for the current user
   *
   * @header Authorization - Bearer token
   * @query status - Optional status filter (PENDING, ACCEPTED, BLOCKED)
   *
   * @returns Array of contacts with user information
   */
  fastify.get<{
    Querystring: {
      status?: ContactStatus;
    };
  }>(
    '/',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { status } = request.query;

        // Validate status if provided
        if (
          status &&
          !['PENDING', 'ACCEPTED', 'BLOCKED'].includes(status)
        ) {
          return reply.code(400).send({
            error: 'Validation Error',
            message: 'Invalid status value',
          });
        }

        // Get contacts
        const contacts = await contactService.getContacts(user.userId, status);

        fastify.log.debug(
          `User ${user.username} retrieved ${contacts.length} contacts (status: ${status || 'all'})`
        );

        return reply.code(200).send({
          contacts,
          count: contacts.length,
        });
      } catch (error) {
        fastify.log.error({ error }, 'Get contacts error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to retrieve contacts',
        });
      }
    }
  );

  /**
   * PATCH /api/contacts/:id/accept
   *
   * Accept a contact request
   *
   * @header Authorization - Bearer token
   * @param id - Contact ID
   *
   * @returns Updated contact with ACCEPTED status
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/accept',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { id } = request.params;

        // Accept contact
        const contact = await contactService.acceptContact(id, user.userId);

        fastify.log.info(
          `Contact accepted: ${user.username} accepted contact ${id}`
        );

        return reply.code(200).send(contact);
      } catch (error) {
        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message === 'Contact not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: error.message,
            });
          }

          if (
            error.message === 'Not authorized to accept this contact' ||
            error.message === 'Contact is not in pending status'
          ) {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Accept contact error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to accept contact',
        });
      }
    }
  );

  /**
   * PATCH /api/contacts/:id/reject
   *
   * Reject a contact request
   *
   * @header Authorization - Bearer token
   * @param id - Contact ID
   *
   * @returns Success message
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/reject',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { id } = request.params;

        // Reject contact
        await contactService.rejectContact(id, user.userId);

        fastify.log.info(
          `Contact rejected: ${user.username} rejected contact ${id}`
        );

        return reply.code(200).send({
          message: 'Contact request rejected',
        });
      } catch (error) {
        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message === 'Contact not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: error.message,
            });
          }

          if (error.message === 'Not authorized to reject this contact') {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Reject contact error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to reject contact',
        });
      }
    }
  );

  /**
   * PATCH /api/contacts/:id/block
   *
   * Block a contact
   *
   * @header Authorization - Bearer token
   * @param id - Contact ID
   *
   * @returns Updated contact with BLOCKED status
   */
  fastify.patch<{
    Params: { id: string };
  }>(
    '/:id/block',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user as JWTPayload;
        const { id } = request.params;

        // Block contact
        const contact = await contactService.blockContact(id, user.userId);

        fastify.log.info(
          `Contact blocked: ${user.username} blocked contact ${id}`
        );

        return reply.code(200).send(contact);
      } catch (error) {
        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message === 'Contact not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: error.message,
            });
          }

          if (error.message === 'Not authorized to block this contact') {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Block contact error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to block contact',
        });
      }
    }
  );

  /**
   * DELETE /api/contacts/:id
   *
   * Delete a contact
   *
   * @header Authorization - Bearer token
   * @param id - Contact ID
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

        // Delete contact
        await contactService.deleteContact(id, user.userId);

        fastify.log.info(
          `Contact deleted: ${user.username} deleted contact ${id}`
        );

        return reply.code(200).send({
          message: 'Contact deleted successfully',
        });
      } catch (error) {
        if (error instanceof Error) {
          // Handle specific business logic errors
          if (error.message === 'Contact not found') {
            return reply.code(404).send({
              error: 'Not Found',
              message: error.message,
            });
          }

          if (error.message === 'Not authorized to delete this contact') {
            return reply.code(400).send({
              error: 'Bad Request',
              message: error.message,
            });
          }
        }

        fastify.log.error({ error }, 'Delete contact error');
        return reply.code(500).send({
          error: 'Internal Server Error',
          message: 'Failed to delete contact',
        });
      }
    }
  );
}

