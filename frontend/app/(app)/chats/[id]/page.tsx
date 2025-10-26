/**
 * Chat Page (Dynamic Route)
 *
 * Displays a single chat conversation.
 * Route: /chats/[id]
 *
 * @module app/(app)/chats/[id]/page
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWindow } from '@/components/chats/chat-window';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useChatsStore } from '@/store/chats-store';
import type { Chat } from '@/store/chats-store';

/**
 * Chat page component
 *
 * Loads chat metadata and displays chat window.
 *
 * @returns Chat page component
 */
export default function ChatPage() {
  const router = useRouter();
  const params = useParams();
  const chatId = params.id as string;

  const [chat, setChat] = useState<Chat | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const chats = useChatsStore((state) => state.chats);

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
   * Load chat metadata
   */
  useEffect(() => {
    const loadChat = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // First, try to find chat in store
        const existingChat = chats.find((c) => c.id === chatId);

        if (existingChat) {
          setChat(existingChat);
          setIsLoading(false);
          return;
        }

        // If not in store, fetch from API
        const response = await apiClient.getChats();
        const foundChat = response.chats.find((c) => c.id === chatId);

        if (foundChat) {
          // Convert API response to Chat format
          const formattedChat: Chat = {
            id: foundChat.id,
            createdAt: new Date(foundChat.createdAt),
            updatedAt: new Date(foundChat.updatedAt),
            lastMessage: foundChat.lastMessage,
            lastMessageAt: foundChat.lastMessageAt
              ? new Date(foundChat.lastMessageAt)
              : null,
            lastMessageBy: foundChat.lastMessageBy,
            unreadCount: foundChat.unreadCount,
            participant: {
              id: foundChat.participant.id,
              email: foundChat.participant.email,
              username: foundChat.participant.username,
              displayName: foundChat.participant.displayName,
              avatarUrl: foundChat.participant.avatarUrl,
              isOnline: foundChat.participant.isOnline,
              lastSeenAt: new Date(foundChat.participant.lastSeenAt),
            },
          };

          setChat(formattedChat);
        } else {
          setError('Chat not found');
        }
      } catch (err) {
        console.error('Failed to load chat:', err);
        setError('Failed to load chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    loadChat();
  }, [chatId, chats, apiClient]);

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        {/* Header skeleton */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Messages skeleton */}
        <div className="flex-1 p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
            >
              <Skeleton className="h-16 w-2/3 rounded-2xl" />
            </div>
          ))}
        </div>

        {/* Input skeleton */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4">
          <Skeleton className="h-11 w-full rounded-md" />
        </div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (error || !chat) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/chats')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">Chat</h1>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <Alert variant="destructive" className="max-w-md">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error || 'Chat not found'}
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  /**
   * Chat window
   */
  return <ChatWindow chat={chat} />;
}

