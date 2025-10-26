/**
 * Chat List Item Component
 *
 * Displays a single chat in the chat list with:
 * - Participant avatar and online status
 * - Display name
 * - Last message preview
 * - Timestamp
 * - Unread count badge
 *
 * @module components/chats/chat-list-item
 */

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatLastSeen, getUserInitials } from '@/lib/utils';
import type { Chat } from '@/store/chats-store';

interface ChatListItemProps {
  chat: Chat;
  onClick: (chatId: string) => void;
}

/**
 * Chat list item component
 *
 * Displays a single chat with participant info, last message, and unread count.
 *
 * @param props - Component props
 * @returns Chat list item component
 */
export function ChatListItem({ chat, onClick }: ChatListItemProps) {
  const displayName =
    chat.participant.displayName || chat.participant.username;
  const initials = getUserInitials(displayName);

  /**
   * Truncate last message to 50 characters
   */
  const truncatedMessage = chat.lastMessage
    ? chat.lastMessage.length > 50
      ? `${chat.lastMessage.substring(0, 50)}...`
      : chat.lastMessage
    : 'No messages yet';

  /**
   * Format timestamp
   */
  const timestamp = chat.lastMessageAt
    ? formatLastSeen(chat.lastMessageAt)
    : '';

  return (
    <div
      className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer"
      onClick={() => onClick(chat.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick(chat.id);
        }
      }}
    >
      {/* Avatar with online status */}
      <div className="relative flex-shrink-0">
        <Avatar className="h-12 w-12">
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

      {/* Chat info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
            {displayName}
          </h3>
          {timestamp && (
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
              {timestamp}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <p
            className={`text-sm truncate ${
              chat.unreadCount > 0
                ? 'font-semibold text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}
          >
            {truncatedMessage}
          </p>
          {chat.unreadCount > 0 && (
            <div className="flex-shrink-0 ml-2">
              <div className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-blue-600 text-white text-xs font-semibold rounded-full">
                {chat.unreadCount > 99 ? '99+' : chat.unreadCount}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

