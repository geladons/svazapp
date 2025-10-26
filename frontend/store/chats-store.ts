/**
 * Chats Store
 *
 * Zustand store for managing chat state.
 * Stores chat list with last message, unread count, and participant info.
 *
 * @module store/chats-store
 */

import { create } from 'zustand';

/**
 * Chat participant interface
 */
export interface ChatParticipant {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: Date;
}

/**
 * Chat interface
 */
export interface Chat {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  lastMessage: string | null;
  lastMessageAt: Date | null;
  lastMessageBy: string | null;
  unreadCount: number;
  participant: ChatParticipant;
}

/**
 * Chats state interface
 */
export interface ChatsState {
  /**
   * List of chats
   */
  chats: Chat[];

  /**
   * Whether chats are being loaded
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Set chats list
   */
  setChats: (chats: Chat[]) => void;

  /**
   * Add or update a chat
   */
  addOrUpdateChat: (chat: Chat) => void;

  /**
   * Update chat's last message
   */
  updateLastMessage: (
    chatId: string,
    lastMessage: string,
    lastMessageBy: string
  ) => void;

  /**
   * Increment unread count for a chat
   */
  incrementUnreadCount: (chatId: string) => void;

  /**
   * Mark chat as read (reset unread count)
   */
  markAsRead: (chatId: string) => void;

  /**
   * Delete chat
   */
  deleteChat: (chatId: string) => void;

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Set error state
   */
  setError: (error: string | null) => void;

  /**
   * Clear all chats
   */
  clearChats: () => void;

  /**
   * Get chats sorted by lastMessageAt DESC
   */
  getSortedChats: () => Chat[];
}

/**
 * Chats store
 *
 * Manages chat list state with real-time updates.
 */
export const useChatsStore = create<ChatsState>((set, get) => ({
  chats: [],
  isLoading: false,
  error: null,

  setChats: (chats: Chat[]) => {
    set({ chats, error: null });
  },

  addOrUpdateChat: (chat: Chat) => {
    set((state) => {
      const existingIndex = state.chats.findIndex((c) => c.id === chat.id);

      if (existingIndex >= 0) {
        // Update existing chat
        const updatedChats = [...state.chats];
        updatedChats[existingIndex] = chat;
        return { chats: updatedChats };
      } else {
        // Add new chat
        return { chats: [...state.chats, chat] };
      }
    });
  },

  updateLastMessage: (
    chatId: string,
    lastMessage: string,
    lastMessageBy: string
  ) => {
    set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            lastMessage,
            lastMessageBy,
            lastMessageAt: new Date(),
          };
        }
        return chat;
      });
      return { chats: updatedChats };
    });
  },

  incrementUnreadCount: (chatId: string) => {
    set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            unreadCount: chat.unreadCount + 1,
          };
        }
        return chat;
      });
      return { chats: updatedChats };
    });
  },

  markAsRead: (chatId: string) => {
    set((state) => {
      const updatedChats = state.chats.map((chat) => {
        if (chat.id === chatId) {
          return {
            ...chat,
            unreadCount: 0,
          };
        }
        return chat;
      });
      return { chats: updatedChats };
    });
  },

  deleteChat: (chatId: string) => {
    set((state) => ({
      chats: state.chats.filter((chat) => chat.id !== chatId),
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearChats: () => {
    set({ chats: [], error: null });
  },

  getSortedChats: () => {
    const { chats } = get();
    return [...chats].sort((a, b) => {
      // Sort by lastMessageAt DESC (most recent first)
      if (!a.lastMessageAt && !b.lastMessageAt) return 0;
      if (!a.lastMessageAt) return 1;
      if (!b.lastMessageAt) return -1;
      return b.lastMessageAt.getTime() - a.lastMessageAt.getTime();
    });
  },
}));

