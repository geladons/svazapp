/**
 * Guest Join Page
 *
 * Public page for guests to join quick call rooms.
 * Shows lobby UI with camera preview and name input.
 *
 * @module app/guest/[roomId]/page
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Video, VideoOff, Loader2 } from 'lucide-react';
import { Track } from 'livekit-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuickCallStore } from '@/store/quick-call-store';
import { useLiveKit } from '@/hooks/use-livekit';
import { LiveKitCallScreen } from '@/components/calls/livekit-call-screen';

/**
 * Guest Join Page
 *
 * Allows guests to join quick call rooms without authentication.
 * Shows lobby with camera preview and name input.
 *
 * @returns Guest join page
 */
export default function GuestJoinPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;

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

  const [guestName, setGuestName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  /**
   * Start camera preview
   */
  useEffect(() => {
    const startPreview = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        previewStreamRef.current = stream;

        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
        }

        setShowPreview(true);
      } catch (err) {
        console.error('[GuestJoin] Failed to start camera preview:', err);
        setError('Failed to access camera. Please grant camera permission.');
      }
    };

    startPreview();

    return () => {
      // Stop preview stream on unmount
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }
    };
  }, []);

  /**
   * Join room as guest
   */
  const handleJoinRoom = async () => {
    if (!guestName.trim()) {
      setError('Please enter your name');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Stop preview stream
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((track) => track.stop());
        previewStreamRef.current = null;
      }

      // Get guest LiveKit token
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/livekit/guest-token?roomName=${encodeURIComponent(
          roomId
        )}&guestName=${encodeURIComponent(guestName.trim())}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to get guest token');
      }

      const data = await response.json();

      // Save quick call info
      setActiveQuickCall({
        roomId,
        roomName: data.roomName,
        token: data.token,
        url: data.url,
        isHost: false,
        guestName: guestName.trim(),
      });

      // Connect to LiveKit room
      await connect(data.url, data.token);
    } catch (err) {
      console.error('[GuestJoin] Error joining room:', err);
      setError('Failed to join room. Please check the link and try again.');
      setIsLoading(false);
    }
  };

  /**
   * Leave room
   */
  const handleLeaveRoom = () => {
    disconnect();
    clearQuickCall();
    router.push('/');
  };

  // If connected, show call screen
  if (isConnected && activeQuickCall && localParticipant) {
    return (
      <LiveKitCallScreen
        localParticipant={{
          name: activeQuickCall.guestName || 'Guest',
          identity: 'guest',
          videoTrack: localParticipant.getTrackPublication(Track.Source.Camera)?.track?.mediaStreamTrack,
          audioTrack: localParticipant.getTrackPublication(Track.Source.Microphone)?.track?.mediaStreamTrack,
        }}
        remoteParticipants={remoteParticipants}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        onEnd={handleLeaveRoom}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onSwitchCamera={switchCamera}
      />
    );
  }

  // Lobby UI
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Camera preview */}
        <div className="relative aspect-video bg-gray-900">
          {showPreview ? (
            <video
              ref={videoPreviewRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <VideoOff className="h-16 w-16 text-gray-600" />
            </div>
          )}

          {/* Logo overlay */}
          <div className="absolute top-4 left-4">
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-2 rounded-lg">
              <Video className="h-5 w-5 text-white" />
              <span className="text-white font-semibold">svaz.app</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Join Quick Call
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Enter your name to join the video call
            </p>
          </div>

          {/* Name input */}
          <div className="space-y-2">
            <Label htmlFor="guestName">Your Name</Label>
            <Input
              id="guestName"
              type="text"
              placeholder="Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isLoading) {
                  handleJoinRoom();
                }
              }}
              disabled={isLoading}
              className="text-lg"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Join button */}
          <Button
            onClick={handleJoinRoom}
            disabled={isLoading || !guestName.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-6 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <Video className="h-5 w-5 mr-2" />
                Join Call
              </>
            )}
          </Button>

          {/* Privacy notice */}
          <p className="text-xs text-center text-gray-500 dark:text-gray-400">
            By joining, you agree to share your camera and microphone.
            <br />
            This call is not recorded.
          </p>
        </div>
      </div>
    </div>
  );
}

