/**
 * Chat List Component
 *
 * Displays list of all chats for the authenticated user.
 * Features:
 * - Fetches chats from API on mount
 * - Real-time updates via Socket.io
 * - Sorted by most recent message
 * - Loading and error states
 * - Empty state
 *
 * @module components/chats/chat-list
 */

'use client';

import { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { MessageCircle, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatListItem } from './chat-list-item';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatsStore } from '@/store/chats-store';
import { useSocket } from '@/hooks/use-socket';

/**
 * Chat list component
 *
 * Shows list of all chats with real-time updates.
 *
 * @returns Chat list component
 */
export function ChatList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const chats = useChatsStore((state) => state.chats);
  const isLoading = useChatsStore((state) => state.isLoading);
  const error = useChatsStore((state) => state.error);
  const setChats = useChatsStore((state) => state.setChats);
  const setLoading = useChatsStore((state) => state.setLoading);
  const setError = useChatsStore((state) => state.setError);
  const updateLastMessage = useChatsStore((state) => state.updateLastMessage);
  const incrementUnreadCount = useChatsStore(
    (state) => state.incrementUnreadCount
  );
  const markAsRead = useChatsStore((state) => state.markAsRead);
  const getSortedChats = useChatsStore((state) => state.getSortedChats);

  const { on, off } = useSocket();

  /**
   * Create API client instance (memoized to prevent infinite loops)
   */
  const apiClient = useMemo(() => {
    const client = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: (accessToken, refreshToken) => {
        if (user) {
          setAuth(user, { accessToken, refreshToken });
        }
      },
      onAuthError: () => {
        clearAuth();
        router.push('/login');
      },
    });

    // Set tokens if available
    if (tokens) {
      client.setTokens(tokens.accessToken, tokens.refreshToken);
    }

    return client;
  }, [user, tokens, setAuth, clearAuth, router]);

  /**
   * Load chats from API
   */
  useEffect(() => {
    const loadChats = async () => {
      // If we already have chats in store, don't fetch again
      if (chats.length > 0) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await apiClient.getChats();

        // Convert API response to store format
        const formattedChats = response.chats.map((c) => ({
          id: c.id,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          lastMessage: c.lastMessage,
          lastMessageAt: c.lastMessageAt ? new Date(c.lastMessageAt) : null,
          lastMessageBy: c.lastMessageBy,
          unreadCount: c.unreadCount,
          participant: {
            id: c.participant.id,
            email: c.participant.email,
            username: c.participant.username,
            displayName: c.participant.displayName,
            avatarUrl: c.participant.avatarUrl,
            isOnline: c.participant.isOnline,
            lastSeenAt: new Date(c.participant.lastSeenAt),
          },
        }));

        setChats(formattedChats);
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Failed to load chats. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadChats();
  }, [apiClient, chats.length, setChats, setError, setLoading]);

  /**
   * Listen to Socket.io events for real-time updates
   */
  useEffect(() => {
    /**
     * Handle incoming message
     */
    const handleMessageReceived = (data: {
      from: string;
      chatId: string;
      message: string;
      timestamp: string;
    }) => {
      // Update last message and increment unread count
      updateLastMessage(data.chatId, data.message, data.from);
      incrementUnreadCount(data.chatId);
    };

    /**
     * Handle chat read event
     */
    const handleChatRead = (data: { chatId: string }) => {
      markAsRead(data.chatId);
    };

    // Subscribe to events
    on('message-received', handleMessageReceived);
    on('chat-read', handleChatRead);

    // Cleanup on unmount
    return () => {
      off('message-received', handleMessageReceived);
      off('chat-read', handleChatRead);
    };
  }, [on, off, updateLastMessage, incrementUnreadCount, markAsRead]);

  /**
   * Handle chat click
   */
  const handleChatClick = (chatId: string) => {
    router.push(`/chats/${chatId}`);
  };

  /**
   * Get sorted chats
   */
  const sortedChats = getSortedChats();

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /**
   * Error state
   */
  if (error) {
    return (
      <div className="p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  /**
   * Empty state
   */
  if (sortedChats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/20 mb-6">
            <MessageCircle className="h-10 w-10 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No chats yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Start a conversation by selecting a contact from your contacts list.
          </p>
        </div>
      </div>
    );
  }

  /**
   * Chat list
   */
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-800">
      {sortedChats.map((chat) => (
        <ChatListItem key={chat.id} chat={chat} onClick={handleChatClick} />
      ))}
    </div>
  );
}

