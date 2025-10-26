/**
 * Contact Service
 *
 * Handles contact management operations including adding, accepting,
 * rejecting, blocking, and deleting contacts.
 *
 * @module services/contact.service
 */

import { PrismaClient, Contact, ContactStatus } from '@prisma/client';

/**
 * Contact with user information
 */
export interface ContactWithUser extends Contact {
  contact: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: Date;
  };
}

/**
 * Contact Service
 *
 * Provides methods for managing user contacts and relationships.
 */
export class ContactService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a contact request
   *
   * Creates a bidirectional contact relationship with PENDING status.
   * The initiator's contact is marked as PENDING (waiting for acceptance).
   * The recipient's contact is also created as PENDING (incoming request).
   * Both records track who initiated the request via the requestedBy field.
   *
   * @param userId - ID of the user sending the request
   * @param contactId - ID of the user to add as contact
   * @returns Created contact
   * @throws Error if users are already contacts or if contactId is invalid
   */
  async createContactRequest(
    userId: string,
    contactId: string
  ): Promise<Contact> {
    // Check if users are the same
    if (userId === contactId) {
      throw new Error('Cannot add yourself as a contact');
    }

    // Check if contact user exists
    const contactUser = await this.prisma.user.findUnique({
      where: { id: contactId },
    });

    if (!contactUser) {
      throw new Error('Contact user not found');
    }

    // Check if contact relationship already exists
    const existingContact = await this.prisma.contact.findFirst({
      where: {
        OR: [
          { userId, contactId },
          { userId: contactId, contactId: userId },
        ],
      },
    });

    if (existingContact) {
      throw new Error('Contact relationship already exists');
    }

    // Create bidirectional contact relationship
    // User -> Contact (outgoing request)
    const contact = await this.prisma.contact.create({
      data: {
        userId,
        contactId,
        requestedBy: userId, // Track who initiated the request
        status: ContactStatus.PENDING,
      },
    });

    // Contact -> User (incoming request)
    await this.prisma.contact.create({
      data: {
        userId: contactId,
        contactId: userId,
        requestedBy: userId, // Same initiator for both records
        status: ContactStatus.PENDING,
      },
    });

    return contact;
  }

  /**
   * Get user's contacts
   *
   * Retrieves all contacts for a user, optionally filtered by status.
   * Includes full user information for each contact.
   *
   * @param userId - ID of the user
   * @param status - Optional status filter (PENDING, ACCEPTED, BLOCKED)
   * @returns Array of contacts with user information
   */
  async getContacts(
    userId: string,
    status?: ContactStatus
  ): Promise<ContactWithUser[]> {
    const contacts = await this.prisma.contact.findMany({
      where: {
        userId,
        ...(status && { status }),
      },
      include: {
        contact: {
          select: {
            id: true,
            email: true,
            username: true,
            displayName: true,
            avatarUrl: true,
            isOnline: true,
            lastSeenAt: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return contacts as ContactWithUser[];
  }

  /**
   * Get contact by ID
   *
   * @param contactId - Contact ID
   * @returns Contact or null if not found
   */
  async getContactById(contactId: string): Promise<Contact | null> {
    return this.prisma.contact.findUnique({
      where: { id: contactId },
    });
  }

  /**
   * Accept a contact request
   *
   * Updates the status of both sides of the contact relationship to ACCEPTED.
   *
   * @param contactId - ID of the contact record
   * @param userId - ID of the user accepting the request
   * @returns Updated contact
   * @throws Error if contact not found or user is not authorized
   */
  async acceptContact(contactId: string, userId: string): Promise<Contact> {
    // Find the contact record
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Verify the user is the owner of this contact record
    if (contact.userId !== userId) {
      throw new Error('Not authorized to accept this contact');
    }

    // Verify the contact is in PENDING status
    if (contact.status !== ContactStatus.PENDING) {
      throw new Error('Contact is not in pending status');
    }

    // Update both sides to ACCEPTED
    const updatedContact = await this.prisma.contact.update({
      where: { id: contactId },
      data: { status: ContactStatus.ACCEPTED },
    });

    // Update the reverse relationship
    await this.prisma.contact.updateMany({
      where: {
        userId: contact.contactId,
        contactId: contact.userId,
      },
      data: { status: ContactStatus.ACCEPTED },
    });

    return updatedContact;
  }

  /**
   * Reject a contact request
   *
   * Deletes both sides of the contact relationship.
   *
   * @param contactId - ID of the contact record
   * @param userId - ID of the user rejecting the request
   * @throws Error if contact not found or user is not authorized
   */
  async rejectContact(contactId: string, userId: string): Promise<void> {
    // Find the contact record
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Verify the user is the owner of this contact record
    if (contact.userId !== userId) {
      throw new Error('Not authorized to reject this contact');
    }

    // Delete both sides of the relationship
    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    await this.prisma.contact.deleteMany({
      where: {
        userId: contact.contactId,
        contactId: contact.userId,
      },
    });
  }

  /**
   * Block a contact
   *
   * Updates the status to BLOCKED for the user's side only.
   *
   * @param contactId - ID of the contact record
   * @param userId - ID of the user blocking the contact
   * @returns Updated contact
   * @throws Error if contact not found or user is not authorized
   */
  async blockContact(contactId: string, userId: string): Promise<Contact> {
    // Find the contact record
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Verify the user is the owner of this contact record
    if (contact.userId !== userId) {
      throw new Error('Not authorized to block this contact');
    }

    // Update to BLOCKED
    const updatedContact = await this.prisma.contact.update({
      where: { id: contactId },
      data: { status: ContactStatus.BLOCKED },
    });

    return updatedContact;
  }

  /**
   * Delete a contact
   *
   * Removes both sides of the contact relationship.
   *
   * @param contactId - ID of the contact record
   * @param userId - ID of the user deleting the contact
   * @throws Error if contact not found or user is not authorized
   */
  async deleteContact(contactId: string, userId: string): Promise<void> {
    // Find the contact record
    const contact = await this.prisma.contact.findUnique({
      where: { id: contactId },
    });

    if (!contact) {
      throw new Error('Contact not found');
    }

    // Verify the user is the owner of this contact record
    if (contact.userId !== userId) {
      throw new Error('Not authorized to delete this contact');
    }

    // Delete both sides of the relationship
    await this.prisma.contact.delete({
      where: { id: contactId },
    });

    await this.prisma.contact.deleteMany({
      where: {
        userId: contact.contactId,
        contactId: contact.userId,
      },
    });
  }

  /**
   * Check if two users are contacts
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns True if users are contacts with ACCEPTED status
   */
  async areContacts(userId1: string, userId2: string): Promise<boolean> {
    const contact = await this.prisma.contact.findFirst({
      where: {
        userId: userId1,
        contactId: userId2,
        status: ContactStatus.ACCEPTED,
      },
    });

    return contact !== null;
  }
}

