/**
 * Message Service
 *
 * Handles chat metadata management for real-time messaging.
 * Note: Actual messages are NOT stored on server - they live in Dexie.js on client.
 * This service only manages chat metadata: last message preview, unread counts, etc.
 *
 * @module services/message.service
 */

import { PrismaClient, Chat } from '@prisma/client';

/**
 * Chat with participant information
 */
export interface ChatWithParticipants extends Chat {
  participant: {
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
 * Message Service
 *
 * Provides methods for managing chat metadata.
 * Does NOT store actual messages (they live in Dexie.js on client).
 */
export class MessageService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get or create chat between two users
   *
   * Creates a chat metadata record if it doesn't exist.
   * Ensures userId1 < userId2 for consistent ordering.
   *
   * @param userId1 - First user ID
   * @param userId2 - Second user ID
   * @returns Chat metadata
   */
  async getOrCreateChat(userId1: string, userId2: string): Promise<Chat> {
    // Ensure consistent ordering (userId1 < userId2)
    const [user1, user2] =
      userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

    // Try to find existing chat
    let chat = await this.prisma.chat.findUnique({
      where: {
        userId1_userId2: {
          userId1: user1,
          userId2: user2,
        },
      },
    });

    // Create if doesn't exist
    if (!chat) {
      chat = await this.prisma.chat.create({
        data: {
          userId1: user1,
          userId2: user2,
        },
      });
    }

    return chat;
  }

  /**
   * Get all chats for a user
   *
   * Returns chats sorted by last message timestamp (most recent first).
   * Includes participant information for each chat.
   *
   * @param userId - User ID
   * @returns Array of chats with participant info
   */
  async getUserChats(userId: string): Promise<ChatWithParticipants[]> {
    // Find all chats where user is participant
    const chats = await this.prisma.chat.findMany({
      where: {
        OR: [{ userId1: userId }, { userId2: userId }],
      },
      include: {
        user1: {
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
        user2: {
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
        lastMessageAt: 'desc',
      },
    });

    // Transform to include only the other participant
    return chats.map((chat) => {
      const participant = chat.userId1 === userId ? chat.user2 : chat.user1;
      const unreadCount =
        chat.userId1 === userId
          ? chat.unreadCountUser1
          : chat.unreadCountUser2;

      return {
        id: chat.id,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
        userId1: chat.userId1,
        userId2: chat.userId2,
        lastMessage: chat.lastMessage,
        lastMessageAt: chat.lastMessageAt,
        lastMessageBy: chat.lastMessageBy,
        unreadCountUser1: unreadCount, // Return only current user's unread count
        unreadCountUser2: 0, // Don't expose other user's unread count
        participant,
      };
    });
  }

  /**
   * Update chat metadata after message sent
   *
   * Updates last message preview and timestamp.
   * Increments unread count for recipient.
   *
   * @param chatId - Chat ID
   * @param lastMessage - Preview text of message
   * @param lastMessageBy - User ID who sent the message
   * @returns Updated chat
   */
  async updateChatMetadata(
    chatId: string,
    lastMessage: string,
    lastMessageBy: string
  ): Promise<Chat> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Determine which user is the recipient
    const recipientIsUser1 = chat.userId1 !== lastMessageBy;

    // Update chat metadata and increment recipient's unread count
    return await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessage,
        lastMessageAt: new Date(),
        lastMessageBy,
        // Increment unread count for recipient only
        ...(recipientIsUser1
          ? { unreadCountUser1: { increment: 1 } }
          : { unreadCountUser2: { increment: 1 } }),
      },
    });
  }

  /**
   * Mark chat as read
   *
   * Resets unread count to 0 for the specified user.
   *
   * @param chatId - Chat ID
   * @param userId - User ID who is marking as read
   * @returns Updated chat
   */
  async markChatAsRead(chatId: string, userId: string): Promise<Chat> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Verify user is participant
    if (chat.userId1 !== userId && chat.userId2 !== userId) {
      throw new Error('User is not a participant in this chat');
    }

    // Determine which unread count to reset
    const isUser1 = chat.userId1 === userId;

    return await this.prisma.chat.update({
      where: { id: chatId },
      data: {
        ...(isUser1
          ? { unreadCountUser1: 0 }
          : { unreadCountUser2: 0 }),
      },
    });
  }

  /**
   * Get chat by ID
   *
   * @param chatId - Chat ID
   * @returns Chat or null if not found
   */
  async getChatById(chatId: string): Promise<Chat | null> {
    return await this.prisma.chat.findUnique({
      where: { id: chatId },
    });
  }

  /**
   * Delete chat
   *
   * Deletes chat metadata. Does NOT delete messages (they're in Dexie.js).
   *
   * @param chatId - Chat ID
   * @param userId - User ID requesting deletion (must be participant)
   */
  async deleteChat(chatId: string, userId: string): Promise<void> {
    const chat = await this.prisma.chat.findUnique({
      where: { id: chatId },
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Verify user is participant
    if (chat.userId1 !== userId && chat.userId2 !== userId) {
      throw new Error('User is not a participant in this chat');
    }

    await this.prisma.chat.delete({
      where: { id: chatId },
    });
  }
}

