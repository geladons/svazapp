/**
 * Message Bubble Component
 *
 * Displays a single message in the chat window.
 * Shows different styles for sent/received messages.
 * Displays message status and timestamp.
 *
 * @module components/chats/message-bubble
 */

'use client';

import { Check, CheckCheck, Clock } from 'lucide-react';
import { formatLastSeen } from '@/lib/utils';
import type { Message } from '@/store/messages-store';

interface MessageBubbleProps {
  message: Message;
  isSent: boolean;
}

/**
 * Message bubble component
 *
 * Displays a single message with status and timestamp.
 *
 * @param props - Component props
 * @returns Message bubble component
 */
export function MessageBubble({ message, isSent }: MessageBubbleProps) {
  /**
   * Get status icon based on message status
   */
  const getStatusIcon = () => {
    if (!isSent) return null;

    switch (message.status) {
      case 'SENDING':
        return <Clock className="h-3 w-3 text-gray-400" />;
      case 'SENT':
        return <Check className="h-3 w-3 text-gray-400" />;
      case 'DELIVERED':
        return <CheckCheck className="h-3 w-3 text-gray-400" />;
      case 'READ':
        return <CheckCheck className="h-3 w-3 text-blue-500" />;
      case 'FAILED':
        return (
          <span className="text-xs text-red-500" title="Failed to send">
            !
          </span>
        );
      default:
        return null;
    }
  };

  /**
   * Format timestamp
   */
  const timestamp = formatLastSeen(message.createdAt);

  return (
    <div
      className={`flex ${isSent ? 'justify-end' : 'justify-start'} mb-4 px-4`}
    >
      <div
        className={`max-w-[70%] ${
          isSent
            ? 'bg-blue-600 text-white rounded-l-2xl rounded-tr-2xl'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-r-2xl rounded-tl-2xl'
        } px-4 py-2 shadow-sm`}
      >
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>

        {/* Timestamp and status */}
        <div
          className={`flex items-center gap-1 mt-1 ${
            isSent ? 'justify-end' : 'justify-start'
          }`}
        >
          <span
            className={`text-xs ${
              isSent ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {timestamp}
          </span>
          {getStatusIcon()}
        </div>
      </div>
    </div>
  );
}

