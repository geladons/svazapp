'use client';

import { useState } from 'react';
import { MessageCircle, Video, MoreVertical } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatLastSeen, getUserInitials } from '@/lib/utils';
import type { Contact } from '@/store/contacts-store';

interface ContactListItemProps {
  contact: Contact;
  onChat: (contactId: string) => void;
  onCall: (contactId: string) => void;
  onBlock: (contactId: string) => Promise<void>;
}

/**
 * Contact list item component
 * Displays a single accepted contact with online status and action buttons
 */
export function ContactListItem({
  contact,
  onChat,
  onCall,
  onBlock,
}: ContactListItemProps) {
  const [isBlocking, setIsBlocking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName =
    contact.contact.displayName || contact.contact.username;
  const initials = getUserInitials(displayName);

  /**
   * Handle block action
   */
  const handleBlock = async () => {
    setIsBlocking(true);
    setError(null);

    try {
      await onBlock(contact.id);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Failed to block contact. Please try again.');
      }
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Avatar with online status */}
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={contact.contact.avatarUrl || undefined}
            alt={displayName}
          />
          <AvatarFallback className="bg-blue-600 text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        {contact.contact.isOnline && (
          <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
        )}
      </div>

      {/* User info */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onChat(contact.contactId)}
      >
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {displayName}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          @{contact.contact.username}
        </p>
        {!contact.contact.isOnline && (
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Last seen {formatLastSeen(contact.contact.lastSeen)}
          </p>
        )}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            {error}
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onChat(contact.contactId)}
          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          title="Send message"
        >
          <MessageCircle className="h-5 w-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onCall(contact.contactId)}
          className="text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          title="Video call"
        >
          <Video className="h-5 w-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 dark:text-gray-400"
              disabled={isBlocking}
            >
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={handleBlock}
              disabled={isBlocking}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
            >
              {isBlocking ? 'Blocking...' : 'Block Contact'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

