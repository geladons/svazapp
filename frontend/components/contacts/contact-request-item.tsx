'use client';

import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import type { Contact } from '@/store/contacts-store';

/**
 * Props for ContactRequestItem component
 */
interface ContactRequestItemProps {
  /**
   * Contact request data
   */
  contact: Contact;

  /**
   * Callback when "Accept" button is clicked
   */
  onAccept: (contactId: string) => Promise<void>;

  /**
   * Callback when "Reject" button is clicked
   */
  onReject: (contactId: string) => Promise<void>;
}

/**
 * Get user initials for avatar fallback
 */
function getUserInitials(username: string, displayName: string | null): string {
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
 * Contact request item component
 * Displays a single contact request with Accept/Reject buttons
 */
export function ContactRequestItem({
  contact,
  onAccept,
  onReject,
}: ContactRequestItemProps) {
  const [isAccepting, setIsAccepting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Handle accept button click
   */
  const handleAccept = async () => {
    setError(null);
    setIsAccepting(true);

    try {
      await onAccept(contact.id);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Failed to accept contact request');
      }
    } finally {
      setIsAccepting(false);
    }
  };

  /**
   * Handle reject button click
   */
  const handleReject = async () => {
    setError(null);
    setIsRejecting(true);

    try {
      await onReject(contact.id);
    } catch (err) {
      if (err && typeof err === 'object' && 'message' in err) {
        setError((err as { message: string }).message);
      } else {
        setError('Failed to reject contact request');
      }
    } finally {
      setIsRejecting(false);
    }
  };

  const isLoading = isAccepting || isRejecting;

  return (
    <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      {/* Avatar */}
      <Avatar className="h-12 w-12">
        <AvatarImage
          src={contact.contact.avatarUrl || undefined}
          alt={contact.contact.username}
        />
        <AvatarFallback className="bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400">
          {getUserInitials(
            contact.contact.username,
            contact.contact.displayName
          )}
        </AvatarFallback>
      </Avatar>

      {/* User Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 dark:text-white truncate">
          {contact.contact.displayName || contact.contact.username}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
          @{contact.contact.username}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 truncate">
          {contact.contact.email}
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          size="sm"
          onClick={handleAccept}
          disabled={isLoading}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          {isAccepting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Accepting...
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" />
              Accept
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="destructive"
          onClick={handleReject}
          disabled={isLoading}
        >
          {isRejecting ? (
            <>
              <span className="animate-spin mr-2">⏳</span>
              Rejecting...
            </>
          ) : (
            <>
              <X className="h-4 w-4 mr-2" />
              Reject
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

