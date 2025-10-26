/**
 * Quick Call Button Component
 *
 * Provides "Quick Call" feature for creating guest call rooms.
 * Generates room, gets LiveKit token, and shows shareable link.
 *
 * @module components/calls/quick-call-button
 */

'use client';

import { useState } from 'react';
import { Video, Copy, Check, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Track } from 'livekit-client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth-store';
import { useQuickCallStore } from '@/store/quick-call-store';
import { useLiveKit } from '@/hooks/use-livekit';
import { LiveKitCallScreen } from './livekit-call-screen';

/**
 * Quick Call Button Component
 *
 * Creates a quick call room and provides shareable link for guests.
 * Integrates with LiveKit for SFU-based video calls.
 *
 * @returns Quick call button component
 *
 * @example
 * ```tsx
 * <QuickCallButton />
 * ```
 */
export function QuickCallButton() {
  const { user, tokens } = useAuthStore();
  const { activeQuickCall, setActiveQuickCall, clearQuickCall } = useQuickCallStore();
  const {
    isConnected,
    localParticipant,
    remoteParticipants,
    isMuted,
    isVideoEnabled,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
    switchCamera,
  } = useLiveKit();

  const [showDialog, setShowDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  /**
   * Generate room ID
   */
  const generateRoomId = (): string => {
    const timestamp = Date.now();
    const userId = user?.id.substring(0, 8) || 'user';
    return `quick-call-${userId}-${timestamp}`;
  };

  /**
   * Start quick call
   */
  const handleStartQuickCall = async () => {
    console.log('[QuickCall] Starting quick call...');

    if (!user || !tokens) {
      const errorMsg = 'You must be logged in to start a quick call';
      console.error('[QuickCall]', errorMsg);
      setError(errorMsg);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Generate room ID
      const roomId = generateRoomId();
      const roomName = roomId;
      console.log('[QuickCall] Generated room ID:', roomId);

      // Get LiveKit token
      const apiUrl = `${process.env.NEXT_PUBLIC_API_URL}/livekit/token`;
      console.log('[QuickCall] Requesting token from:', apiUrl);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokens.accessToken}`,
        },
        body: JSON.stringify({ roomName }),
      });

      console.log('[QuickCall] Token response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[QuickCall] Token request failed:', errorData);
        throw new Error(errorData.message || `Failed to get LiveKit token (${response.status})`);
      }

      const data = await response.json();
      console.log('[QuickCall] Received token, connecting to LiveKit...');

      // Save quick call info
      setActiveQuickCall({
        roomId,
        roomName,
        token: data.token,
        url: data.url,
        isHost: true,
      });

      // Connect to LiveKit room
      await connect(data.url, data.token);
      console.log('[QuickCall] Successfully connected to LiveKit room');

      // Show dialog with share link
      setShowDialog(true);
    } catch (err) {
      console.error('[QuickCall] Error starting quick call:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to start quick call. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy share link to clipboard
   */
  const handleCopyLink = async () => {
    if (!activeQuickCall) return;

    const shareLink = `${window.location.origin}/guest/${activeQuickCall.roomId}`;

    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('[QuickCall] Failed to copy link:', err);
    }
  };

  /**
   * End quick call
   */
  const handleEndCall = () => {
    disconnect();
    clearQuickCall();
    setShowDialog(false);
    setCopied(false);
  };

  /**
   * Close dialog (cancel before connecting)
   */
  const handleCloseDialog = () => {
    if (isConnected) {
      handleEndCall();
    } else {
      setShowDialog(false);
      clearQuickCall();
    }
  };

  // If in active call, show call screen
  if (isConnected && activeQuickCall && localParticipant) {
    return (
      <LiveKitCallScreen
        localParticipant={{
          name: user?.displayName || user?.username || 'You',
          identity: user?.id || 'local',
          videoTrack: localParticipant.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack,
          audioTrack: localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack,
        }}
        remoteParticipants={remoteParticipants}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        onEnd={handleEndCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
      />
    );
  }

  return (
    <>
      <Button
        onClick={handleStartQuickCall}
        disabled={isLoading}
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 transition-all duration-300 hover:scale-105 hover:shadow-lg active:scale-95"
      >
        <Video className="h-5 w-5 mr-2" />
        {isLoading ? 'Starting...' : 'Quick Call'}
      </Button>

      {/* Error display */}
      {error && !showDialog && (
        <div className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md animate-in fade-in slide-in-from-top-2 duration-300">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Share link dialog */}
      <Dialog open={showDialog} onOpenChange={handleCloseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Quick Call Ready
            </DialogTitle>
            <DialogDescription>
              Share this link with anyone to start a video call
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Share link */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={
                  activeQuickCall
                    ? `${window.location.origin}/guest/${activeQuickCall.roomId}`
                    : ''
                }
                className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-800"
              />
              <Button
                onClick={handleCopyLink}
                size="icon"
                variant="outline"
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Status */}
            <div className="flex items-center justify-center gap-2 py-4">
              {remoteParticipants.length > 0 ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Guest joined!
                  </span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Waiting for guest to join...
                  </span>
                </>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
                <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                onClick={handleEndCall}
                variant="destructive"
                className="flex-1"
              >
                <X className="h-4 w-4 mr-2" />
                End Call
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

