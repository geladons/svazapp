/**
 * Message Input Component
 *
 * Input field for composing and sending messages.
 * Features:
 * - Textarea with auto-resize
 * - Send button
 * - Typing indicators (emit typing-start/stop)
 * - Send message via Socket.io
 * - Save to Dexie.js
 *
 * @module components/chats/message-input
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useSocket } from '@/hooks/use-socket';
import { useMessagesStore } from '@/store/messages-store';
import { useAuthStore } from '@/store/auth-store';
import { useChatsStore } from '@/store/chats-store';
import type { Message } from '@/store/messages-store';

interface MessageInputProps {
  chatId: string;
  participantId: string;
}

/**
 * Message input component
 *
 * Handles message composition and sending.
 *
 * @param props - Component props
 * @returns Message input component
 */
export function MessageInput({ chatId, participantId }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const user = useAuthStore((state) => state.user);
  const { emit } = useSocket();
  const addMessage = useMessagesStore((state) => state.addMessage);
  const updateLastMessage = useChatsStore((state) => state.updateLastMessage);

  /**
   * Handle typing indicator
   */
  useEffect(() => {
    if (message.trim().length > 0 && !isTyping) {
      // Start typing
      setIsTyping(true);
      emit('typing-start', { to: participantId, chatId });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        setIsTyping(false);
        emit('typing-stop', { to: participantId, chatId });
      }
    }, 2000);

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, isTyping, emit, participantId, chatId]);

  /**
   * Handle send message
   */
  const handleSend = async () => {
    if (!message.trim() || !user) return;

    const trimmedMessage = message.trim();
    const messageId = `${user.id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const timestamp = new Date();

    // Create message object
    const newMessage: Message = {
      id: messageId,
      senderId: user.id,
      receiverId: participantId,
      content: trimmedMessage,
      type: 'TEXT',
      status: 'SENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
      localOnly: false,
    };

    try {
      // Save to Dexie.js
      await addMessage(newMessage);

      // Send via Socket.io
      emit('message-send', {
        to: participantId,
        chatId,
        message: trimmedMessage,
        timestamp: timestamp.toISOString(),
      });

      // Update chat's last message in chats-store
      updateLastMessage(chatId, trimmedMessage, user.id);

      // Update message status to SENT
      // (In real app, this would be done when server confirms receipt)
      setTimeout(() => {
        useMessagesStore.getState().updateMessageStatus(messageId, 'SENT');
      }, 100);

      // Clear input
      setMessage('');

      // Stop typing indicator
      if (isTyping) {
        setIsTyping(false);
        emit('typing-stop', { to: participantId, chatId });
      }

      // Focus textarea
      textareaRef.current?.focus();
    } catch (error) {
      console.error('Failed to send message:', error);
      // Update message status to FAILED
      useMessagesStore.getState().updateMessageStatus(messageId, 'FAILED');
    }
  };

  /**
   * Handle Enter key press
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900">
      <div className="flex items-end gap-2">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          className="min-h-[44px] max-h-[120px] resize-none"
          rows={1}
        />
        <Button
          onClick={handleSend}
          disabled={!message.trim()}
          size="icon"
          className="h-11 w-11 flex-shrink-0"
        >
          <Send className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}

