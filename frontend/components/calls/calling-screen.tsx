/**
 * Calling Screen Component
 *
 * Displays the calling UI when initiating a call.
 * Shows caller info, local video preview, and cancel button.
 * Handles call timeout (30 seconds).
 *
 * @module components/calls/calling-screen
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Video, VideoOff } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserInitials } from '@/lib/utils';

/**
 * Calling screen props
 */
export interface CallingScreenProps {
  /** Contact being called */
  contact: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  /** Local media stream */
  localStream: MediaStream | null;
  /** Whether video is enabled */
  isVideoEnabled: boolean;
  /** Callback when call is cancelled */
  onCancel: () => void;
  /** Callback when call times out */
  onTimeout: () => void;
  /** Call timeout in seconds (default: 30) */
  timeout?: number;
}

/**
 * Calling Screen Component
 *
 * Shows the calling UI with local video preview and cancel button.
 * Automatically times out after specified duration.
 *
 * @param props - Component props
 * @returns Calling screen component
 *
 * @example
 * ```tsx
 * <CallingScreen
 *   contact={contact}
 *   localStream={localStream}
 *   isVideoEnabled={isVideoEnabled}
 *   onCancel={handleCancel}
 *   onTimeout={handleTimeout}
 * />
 * ```
 */
export function CallingScreen({
  contact,
  localStream,
  isVideoEnabled,
  onCancel,
  onTimeout,
  timeout = 30,
}: CallingScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [timeLeft, setTimeLeft] = useState(timeout);

  /**
   * Setup local video stream
   */
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  /**
   * Handle call timeout
   */
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onTimeout]);

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center">
      {/* Local video preview (background) */}
      <div className="absolute inset-0">
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900" />
        )}
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-white">
        {/* Contact avatar */}
        <Avatar className="w-32 h-32 mb-6 ring-4 ring-white/20">
          <AvatarImage src={contact.avatarUrl || undefined} alt={contact.displayName} />
          <AvatarFallback className="text-4xl bg-blue-600">
            {getUserInitials(contact.displayName)}
          </AvatarFallback>
        </Avatar>

        {/* Contact name */}
        <h2 className="text-3xl font-bold mb-2">{contact.displayName}</h2>
        <p className="text-lg text-gray-300 mb-2">@{contact.username}</p>

        {/* Status */}
        <div className="flex items-center gap-2 mb-8">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
          <p className="text-lg text-gray-300">Calling...</p>
        </div>

        {/* Timeout indicator */}
        <p className="text-sm text-gray-400 mb-12">
          {timeLeft > 0 ? `Timing out in ${timeLeft}s` : 'Call timed out'}
        </p>

        {/* Cancel button */}
        <Button
          onClick={onCancel}
          size="lg"
          variant="destructive"
          className="rounded-full w-16 h-16 p-0"
          title="Cancel call"
        >
          <X className="h-8 w-8" />
        </Button>
      </div>

      {/* Video status indicator */}
      <div className="absolute bottom-8 left-8 flex items-center gap-2 text-white">
        {isVideoEnabled ? (
          <>
            <Video className="h-5 w-5" />
            <span className="text-sm">Video on</span>
          </>
        ) : (
          <>
            <VideoOff className="h-5 w-5" />
            <span className="text-sm">Video off</span>
          </>
        )}
      </div>
    </div>
  );
}

