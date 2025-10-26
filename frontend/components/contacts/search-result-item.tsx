'use client';

import { useState } from 'react';
import { UserPlus, Check } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ApiUser } from '@/lib/api-types';

/**
 * Props for SearchResultItem component
 */
interface SearchResultItemProps {
  /**
   * User data from search results
   */
  user: ApiUser;

  /**
   * Callback when "Add Contact" button is clicked
   */
  onAddContact: (userId: string) => Promise<void>;

  /**
   * Whether this user is already in contacts
   */
  isAlreadyContact: boolean;

  /**
   * Whether the current user is this user (self)
   */
  isSelf: boolean;
}

/**
 * Get user initials for avatar fallback
 */
function getUserInitials(username: string, displayName: string): string {
  if (displayName && displayName.trim().length > 0) {
    const parts = displayName.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
  }
  return username.substring(0, 2).toUpperCase();
}

/**
 * Search result item component
 * Displays a single user from search results with "Add Contact" button
 */
export function SearchResultItem({
  user,
  onAddContact,
  isAlreadyContact,
  isSelf,
}: SearchResultItemProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle add contact button click
   */
  const handleAddContact = async () => {
    setError(null);
    setIsAdding(true);

    try {
      await onAddContact(user.id);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Failed to add contact');
      }
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
      {/* Avatar */}
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.avatarUrl || undefined} alt={user.username} />
        <AvatarFallback className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
          {getUserInitials(user.username, user.displayName)}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-gray-900 dark:text-white truncate">
            {user.displayName || user.username}
          </p>
          {isSelf && (
            <Badge variant="secondary" className="text-xs">
              You
            </Badge>
          )}
          {isAlreadyContact && (
            <Badge variant="secondary" className="text-xs">
              <Check className="h-3 w-3 mr-1" />
              Contact
            </Badge>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          @{user.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
          {user.email}
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>

      {/* Add Contact Button */}
      {!isSelf && !isAlreadyContact && (
        <Button
          size="sm"
          onClick={handleAddContact}
          disabled={isAdding}
          className="shrink-0"
        >
          {isAdding ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Adding...
            </>
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-2" />
              Add
            </>
          )}
        </Button>
      )}
    </div>
  );
}

