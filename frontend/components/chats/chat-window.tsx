/**
 * Chat Window Component
 *
 * Main chat interface showing messages and input.
 * Features:
 * - Load messages from Dexie.js
 * - Real-time message updates via Socket.io
 * - Auto-scroll to bottom
 * - Typing indicator
 * - Mark chat as read
 *
 * @module components/chats/chat-window
 */

'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageBubble } from './message-bubble';
import { MessageInput } from './message-input';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatsStore } from '@/store/chats-store';
import { useMessagesStore } from '@/store/messages-store';
import { useSocket } from '@/hooks/use-socket';
import { getUserInitials } from '@/lib/utils';
import type { Chat } from '@/store/chats-store';

interface ChatWindowProps {
  chat: Chat;
}

/**
 * Chat window component
 *
 * Displays messages and handles real-time communication.
 *
 * @param props - Component props
 * @returns Chat window component
 */
export function ChatWindow({ chat }: ChatWindowProps) {
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [isTyping, setIsTyping] = useState(false);

  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const markAsRead = useChatsStore((state) => state.markAsRead);

  const messages = useMessagesStore((state) => state.messages);
  const isLoading = useMessagesStore((state) => state.isLoading);
  const loadMessages = useMessagesStore((state) => state.loadMessages);
  const addMessage = useMessagesStore((state) => state.addMessage);
  const clearMessages = useMessagesStore((state) => state.clearMessages);

  const { on, off, emit } = useSocket();

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
   * Load messages on mount
   */
  useEffect(() => {
    if (!user) return;

    loadMessages(user.id, chat.participant.id);

    // Cleanup on unmount
    return () => {
      clearMessages();
    };
  }, [user, chat.participant.id, loadMessages, clearMessages]);

  /**
   * Mark chat as read on mount
   */
  useEffect(() => {
    const markChatAsRead = async () => {
      try {
        await apiClient.markChatAsRead(chat.id);
        markAsRead(chat.id);

        // Emit chat-read event to notify other participant
        emit('chat-read', { chatId: chat.id, to: chat.participant.id });
      } catch (error) {
        console.error('Failed to mark chat as read:', error);
      }
    };

    markChatAsRead();
  }, [chat.id, chat.participant.id, apiClient, markAsRead, emit]);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        '[data-radix-scroll-area-viewport]'
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  /**
   * Listen to Socket.io events
   */
  useEffect(() => {
    if (!user) return;

    /**
     * Handle incoming message
     */
    const handleMessageReceived = async (data: {
      from: string;
      chatId: string;
      message: string;
      timestamp: string;
    }) => {
      // Only handle messages for this chat
      if (data.chatId !== chat.id) return;

      const newMessage = {
        id: `${data.from}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        senderId: data.from,
        receiverId: user.id,
        content: data.message,
        type: 'TEXT' as const,
        status: 'DELIVERED' as const,
        createdAt: new Date(data.timestamp),
        updatedAt: new Date(data.timestamp),
        localOnly: false,
      };

      // Save to Dexie.js and state
      await addMessage(newMessage);

      // Mark as read immediately (since user is viewing the chat)
      emit('chat-read', { chatId: chat.id, to: data.from });
    };

    /**
     * Handle typing start
     */
    const handleTypingStart = (data: { from: string; chatId: string }) => {
      if (data.chatId === chat.id) {
        setIsTyping(true);
      }
    };

    /**
     * Handle typing stop
     */
    const handleTypingStop = (data: { from: string; chatId: string }) => {
      if (data.chatId === chat.id) {
        setIsTyping(false);
      }
    };

    // Subscribe to events
    on('message-received', handleMessageReceived);
    on('typing-start', handleTypingStart);
    on('typing-stop', handleTypingStop);

    // Cleanup on unmount
    return () => {
      off('message-received', handleMessageReceived);
      off('typing-start', handleTypingStart);
      off('typing-stop', handleTypingStop);
    };
  }, [user, chat.id, chat.participant.id, on, off, emit, addMessage]);

  /**
   * Get display name and initials
   */
  const displayName =
    chat.participant.displayName || chat.participant.username;
  const initials = getUserInitials(displayName);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/chats')}
          className="md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="relative flex-shrink-0">
          <Avatar className="h-10 w-10">
            <AvatarImage
              src={chat.participant.avatarUrl || undefined}
              alt={displayName}
            />
            <AvatarFallback className="bg-blue-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          {chat.participant.isOnline && (
            <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </h2>
          {isTyping && (
            <p className="text-sm text-blue-600 dark:text-blue-400">
              typing...
            </p>
          )}
        </div>

        <Button variant="ghost" size="icon">
          <MoreVertical className="h-5 w-5" />
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollAreaRef} className="flex-1">
        {isLoading ? (
          <div className="space-y-4 p-4">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
              >
                <Skeleton className="h-16 w-2/3 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full p-8">
            <p className="text-gray-500 dark:text-gray-400 text-center">
              No messages yet. Start the conversation!
            </p>
          </div>
        ) : (
          <div className="py-4">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                isSent={message.senderId === user?.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <MessageInput chatId={chat.id} participantId={chat.participant.id} />
    </div>
  );
}

