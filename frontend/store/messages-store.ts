/**
 * Messages Store
 *
 * Zustand store for managing messages in the current chat.
 * Integrates with Dexie.js for offline storage.
 *
 * @module store/messages-store
 */

import { create } from 'zustand';
import { db } from '@/lib/db';

/**
 * Message interface (matches DBMessage)
 */
export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  localOnly?: boolean;
}

/**
 * Messages state interface
 */
export interface MessagesState {
  /**
   * Messages for current chat
   */
  messages: Message[];

  /**
   * Current chat ID
   */
  currentChatId: string | null;

  /**
   * Whether messages are being loaded
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Load messages for a chat from Dexie.js
   */
  loadMessages: (userId: string, participantId: string) => Promise<void>;

  /**
   * Add a new message (save to Dexie.js)
   */
  addMessage: (message: Message) => Promise<void>;

  /**
   * Update message status
   */
  updateMessageStatus: (
    messageId: string,
    status: Message['status']
  ) => Promise<void>;

  /**
   * Clear messages (when leaving chat)
   */
  clearMessages: () => void;

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Set error state
   */
  setError: (error: string | null) => void;
}

/**
 * Messages store
 *
 * Manages messages for the current chat with Dexie.js integration.
 */
export const useMessagesStore = create<MessagesState>((set) => ({
  messages: [],
  currentChatId: null,
  isLoading: false,
  error: null,

  loadMessages: async (userId: string, participantId: string) => {
    set({ isLoading: true, error: null });

    try {
      // Load messages from Dexie.js where:
      // (senderId = userId AND receiverId = participantId) OR
      // (senderId = participantId AND receiverId = userId)
      const messages = await db.messages
        .where('[senderId+receiverId]')
        .equals([userId, participantId])
        .or('[senderId+receiverId]')
        .equals([participantId, userId])
        .sortBy('createdAt');

      set({
        messages,
        currentChatId: `${userId}-${participantId}`,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load messages from Dexie.js:', error);
      set({
        error: 'Failed to load messages',
        isLoading: false,
      });
    }
  },

  addMessage: async (message: Message) => {
    try {
      // Save to Dexie.js
      await db.messages.add(message);

      // Add to state
      set((state) => ({
        messages: [...state.messages, message],
      }));
    } catch (error) {
      console.error('Failed to save message to Dexie.js:', error);
      throw error;
    }
  },

  updateMessageStatus: async (
    messageId: string,
    status: Message['status']
  ) => {
    try {
      // Update in Dexie.js
      await db.messages.update(messageId, {
        status,
        updatedAt: new Date(),
      });

      // Update in state
      set((state) => ({
        messages: state.messages.map((msg) =>
          msg.id === messageId
            ? { ...msg, status, updatedAt: new Date() }
            : msg
        ),
      }));
    } catch (error) {
      console.error('Failed to update message status in Dexie.js:', error);
    }
  },

  clearMessages: () => {
    set({
      messages: [],
      currentChatId: null,
      error: null,
    });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));

