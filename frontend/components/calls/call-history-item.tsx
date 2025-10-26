/**
 * Call History Item Component
 *
 * Displays a single call history entry with caller info,
 * call type, direction, and timestamp.
 *
 * @module components/calls/call-history-item
 */

'use client';

import { Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, Video, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserInitials, formatRelativeTime } from '@/lib/utils';

/**
 * Call history item props
 */
export interface CallHistoryItemProps {
  /** Call record */
  call: {
    id: string;
    type: 'AUDIO' | 'VIDEO';
    status: 'RINGING' | 'ANSWERED' | 'ENDED' | 'MISSED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
    direction: 'INCOMING' | 'OUTGOING';
    duration: number | null;
    createdAt: Date;
    otherUser: {
      id: string;
      displayName: string;
      username: string;
      avatarUrl?: string | null;
    };
  };
  /** Callback when call-back button is clicked */
  onCallBack: (userId: string) => void;
}

/**
 * Get call icon based on status and direction
 */
function getCallIcon(
  status: string,
  direction: 'INCOMING' | 'OUTGOING'
): { icon: React.ReactNode; color: string } {
  if (status === 'MISSED') {
    return {
      icon: <PhoneMissed className="h-5 w-5" />,
      color: 'text-red-600 dark:text-red-400',
    };
  }

  if (direction === 'INCOMING') {
    return {
      icon: <PhoneIncoming className="h-5 w-5" />,
      color: 'text-green-600 dark:text-green-400',
    };
  }

  return {
    icon: <PhoneOutgoing className="h-5 w-5" />,
    color: 'text-blue-600 dark:text-blue-400',
  };
}

/**
 * Format call duration
 */
function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === 0) {
    return 'Not answered';
  }

  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (mins === 0) {
    return `${secs}s`;
  }

  return `${mins}m ${secs}s`;
}

/**
 * Call History Item Component
 *
 * Shows a single call history entry with call details and call-back button.
 *
 * @param props - Component props
 * @returns Call history item component
 *
 * @example
 * ```tsx
 * <CallHistoryItem
 *   call={call}
 *   onCallBack={handleCallBack}
 * />
 * ```
 */
export function CallHistoryItem({ call, onCallBack }: CallHistoryItemProps) {
  const { icon, color } = getCallIcon(call.status, call.direction);
  const isMissed = call.status === 'MISSED';

  return (
    <div
      className={`flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
        isMissed ? 'bg-red-50/50 dark:bg-red-900/10' : ''
      }`}
    >
      {/* Avatar */}
      <Avatar className="w-12 h-12">
        <AvatarImage
          src={call.otherUser.avatarUrl || undefined}
          alt={call.otherUser.displayName}
        />
        <AvatarFallback className="bg-blue-600 text-white">
          {getUserInitials(call.otherUser.displayName)}
        </AvatarFallback>
      </Avatar>

      {/* Call info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3
            className={`font-semibold truncate ${
              isMissed
                ? 'text-red-900 dark:text-red-100'
                : 'text-gray-900 dark:text-white'
            }`}
          >
            {call.otherUser.displayName}
          </h3>
          {isMissed && (
            <span className="text-xs font-medium text-red-600 dark:text-red-400">
              Missed
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          {/* Call type icon */}
          <div className={color}>
            {call.type === 'VIDEO' ? (
              <Video className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </div>
          {/* Call direction icon */}
          <div className={color}>{icon}</div>
          {/* Duration */}
          <span>{formatDuration(call.duration)}</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          {/* Timestamp */}
          <span>{formatRelativeTime(call.createdAt)}</span>
        </div>
      </div>

      {/* Call-back button */}
      <Button
        onClick={() => onCallBack(call.otherUser.id)}
        size="icon"
        variant="ghost"
        className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
        title="Call back"
      >
        <Phone className="h-5 w-5" />
      </Button>
    </div>
  );
}

