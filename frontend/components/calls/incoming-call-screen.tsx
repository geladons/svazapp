/**
 * Incoming Call Screen Component
 *
 * Displays the incoming call UI when receiving a call.
 * Shows caller info, ringtone, and accept/reject buttons.
 * Requests notification permission if not granted.
 *
 * @module components/calls/incoming-call-screen
 */

'use client';

import { useEffect, useState } from 'react';
import { Phone, PhoneOff, Video, Mic } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserInitials } from '@/lib/utils';

/**
 * Incoming call screen props
 */
export interface IncomingCallScreenProps {
  /** Caller information */
  contact: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  /** Call type */
  callType: 'AUDIO' | 'VIDEO';
  /** Callback when call is accepted */
  onAccept: () => void;
  /** Callback when call is rejected */
  onReject: () => void;
}

/**
 * Incoming Call Screen Component
 *
 * Shows the incoming call UI with caller info and action buttons.
 * Plays ringtone and shows notification if PWA is in background.
 *
 * @param props - Component props
 * @returns Incoming call screen component
 *
 * @example
 * ```tsx
 * <IncomingCallScreen
 *   contact={contact}
 *   callType="VIDEO"
 *   onAccept={handleAccept}
 *   onReject={handleReject}
 * />
 * ```
 */
export function IncomingCallScreen({
  contact,
  callType,
  onAccept,
  onReject,
}: IncomingCallScreenProps) {
  const [isRinging, setIsRinging] = useState(true);

  /**
   * Request notification permission
   */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        console.log('[IncomingCall] Notification permission:', permission);
      });
    }
  }, []);

  /**
   * Show notification if PWA is in background
   */
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'granted') {
      // Check if document is hidden (PWA in background)
      if (document.hidden) {
        const notification = new Notification('Incoming Call', {
          body: `${contact.displayName} is calling...`,
          icon: contact.avatarUrl || '/icon-192x192.png',
          tag: 'incoming-call',
          requireInteraction: true,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Close notification when call ends
        return () => {
          notification.close();
        };
      }
    }
    return undefined;
  }, [contact]);

  /**
   * Play ringtone
   * Note: In production, you should add an actual ringtone audio file
   */
  useEffect(() => {
    // Create audio context for ringtone
    // For now, we'll use the browser's default notification sound
    // In production, add a custom ringtone file

    let audioContext: AudioContext | null = null;
    let oscillator: OscillatorNode | null = null;
    let gainNode: GainNode | null = null;

    if (isRinging && typeof window !== 'undefined' && 'AudioContext' in window) {
      try {
        audioContext = new AudioContext();
        oscillator = audioContext.createOscillator();
        gainNode = audioContext.createGain();

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.frequency.value = 440; // A4 note
        gainNode.gain.value = 0.1; // Low volume

        oscillator.start();

        // Stop after 3 seconds and repeat
        const interval = setInterval(() => {
          if (oscillator && audioContext) {
            oscillator.stop();
            oscillator = audioContext.createOscillator();
            gainNode = audioContext.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.frequency.value = 440;
            gainNode.gain.value = 0.1;
            oscillator.start();
          }
        }, 3000);

        return () => {
          clearInterval(interval);
          if (oscillator) oscillator.stop();
          if (audioContext) audioContext.close();
        };
      } catch (error) {
        console.error('[IncomingCall] Error playing ringtone:', error);
      }
    }
    return undefined;
  }, [isRinging]);

  /**
   * Handle accept
   */
  const handleAccept = () => {
    setIsRinging(false);
    onAccept();
  };

  /**
   * Handle reject
   */
  const handleReject = () => {
    setIsRinging(false);
    onReject();
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex flex-col items-center justify-center">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)] animate-pulse" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-white px-8">
        {/* Call type indicator */}
        <div className="mb-8 flex items-center gap-2 text-blue-200">
          {callType === 'VIDEO' ? (
            <>
              <Video className="h-5 w-5" />
              <span className="text-sm font-medium">Video Call</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span className="text-sm font-medium">Audio Call</span>
            </>
          )}
        </div>

        {/* Caller avatar */}
        <div className="relative mb-8">
          <Avatar className="w-40 h-40 ring-8 ring-white/20 ring-offset-4 ring-offset-blue-900">
            <AvatarImage src={contact.avatarUrl || undefined} alt={contact.displayName} />
            <AvatarFallback className="text-5xl bg-blue-600">
              {getUserInitials(contact.displayName)}
            </AvatarFallback>
          </Avatar>
          {/* Pulsing ring animation */}
          {isRinging && (
            <div className="absolute inset-0 -m-2">
              <div className="w-full h-full rounded-full border-4 border-white/30 animate-ping" />
            </div>
          )}
        </div>

        {/* Caller name */}
        <h2 className="text-4xl font-bold mb-2">{contact.displayName}</h2>
        <p className="text-xl text-blue-200 mb-4">@{contact.username}</p>

        {/* Status */}
        <div className="flex items-center gap-2 mb-16">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          <p className="text-lg text-blue-100">Incoming call...</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-8">
          {/* Reject button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleReject}
              size="lg"
              variant="destructive"
              className="rounded-full w-20 h-20 p-0 bg-red-600 hover:bg-red-700 shadow-lg"
              title="Reject call"
            >
              <PhoneOff className="h-10 w-10" />
            </Button>
            <span className="text-sm text-blue-200">Decline</span>
          </div>

          {/* Accept button */}
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={handleAccept}
              size="lg"
              className="rounded-full w-20 h-20 p-0 bg-green-600 hover:bg-green-700 shadow-lg"
              title="Accept call"
            >
              <Phone className="h-10 w-10" />
            </Button>
            <span className="text-sm text-blue-200">Accept</span>
          </div>
        </div>
      </div>

      {/* Swipe hint for mobile */}
      <div className="absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm text-blue-300/60">
          Swipe up to accept • Swipe down to decline
        </p>
      </div>
    </div>
  );
}

