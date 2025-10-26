/**
 * Active Call Screen Component
 *
 * Displays the active call UI during an ongoing call.
 * Shows remote video (fullscreen), local video (PiP, draggable),
 * and control panel with call controls.
 *
 * @module components/calls/active-call-screen
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  PhoneOff,
  Volume2,
  VolumeX,
  SwitchCamera,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { getUserInitials } from '@/lib/utils';

/**
 * Active call screen props
 */
export interface ActiveCallScreenProps {
  /** Contact in call */
  contact: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl?: string | null;
  };
  /** Local media stream */
  localStream: MediaStream | null;
  /** Remote media stream */
  remoteStream: MediaStream | null;
  /** Whether microphone is muted */
  isMuted: boolean;
  /** Whether video is enabled */
  isVideoEnabled: boolean;
  /** Callback when call is ended */
  onEnd: () => void;
  /** Callback to toggle mute */
  onToggleMute: () => void;
  /** Callback to toggle video */
  onToggleVideo: () => void;
  /** Callback to toggle speaker */
  onToggleSpeaker: () => void;
  /** Callback to switch camera */
  onSwitchCamera: () => void;
}

/**
 * Active Call Screen Component
 *
 * Shows the active call UI with video streams and controls.
 * Controls auto-hide after 3 seconds of inactivity.
 *
 * @param props - Component props
 * @returns Active call screen component
 *
 * @example
 * ```tsx
 * <ActiveCallScreen
 *   contact={contact}
 *   localStream={localStream}
 *   remoteStream={remoteStream}
 *   isMuted={isMuted}
 *   isVideoEnabled={isVideoEnabled}
 *   onEnd={handleEnd}
 *   onToggleMute={toggleMute}
 *   onToggleVideo={toggleVideo}
 *   onToggleSpeaker={toggleSpeaker}
 *   onSwitchCamera={switchCamera}
 * />
 * ```
 */
export function ActiveCallScreen({
  contact,
  localStream,
  remoteStream,
  isMuted,
  isVideoEnabled,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onToggleSpeaker,
  onSwitchCamera,
}: ActiveCallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const [showControls, setShowControls] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const [localVideoPosition, _setLocalVideoPosition] = useState({ x: 20, y: 20 });
  const [_isDragging, _setIsDragging] = useState(false);

  const hideControlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Setup local video stream
   */
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  /**
   * Setup remote video stream
   */
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  /**
   * Auto-hide controls after 3 seconds
   */
  useEffect(() => {
    const resetHideTimer = () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }

      setShowControls(true);

      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    };

    resetHideTimer();

    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handle screen tap to show/hide controls
   */
  const handleScreenTap = () => {
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }

    setShowControls((prev) => !prev);

    if (!showControls) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  };

  /**
   * Track call duration
   */
  useEffect(() => {
    const interval = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Format call duration
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Handle speaker toggle
   */
  const handleToggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
    onToggleSpeaker();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black"
      onClick={handleScreenTap}
    >
      {/* Remote video (fullscreen) */}
      <div className="absolute inset-0">
        {remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Avatar className="w-32 h-32 mx-auto mb-4">
                <AvatarImage src={contact.avatarUrl || undefined} alt={contact.displayName} />
                <AvatarFallback className="text-4xl bg-blue-600">
                  {getUserInitials(contact.displayName)}
                </AvatarFallback>
              </Avatar>
              <p className="text-white text-lg">Connecting...</p>
            </div>
          </div>
        )}
      </div>

      {/* Local video (PiP, draggable) */}
      <div
        className="absolute w-32 h-48 rounded-lg overflow-hidden shadow-2xl border-2 border-white/20 cursor-move"
        style={{
          top: `${localVideoPosition.y}px`,
          right: `${localVideoPosition.x}px`,
        }}
      >
        {isVideoEnabled && localStream ? (
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
          />
        ) : (
          <div className="w-full h-full bg-gray-800 flex items-center justify-center">
            <VideoOff className="h-8 w-8 text-gray-400" />
          </div>
        )}
      </div>

      {/* Top bar (contact info and duration) */}
      <div
        className={`absolute top-0 left-0 right-0 p-6 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-xl font-semibold">{contact.displayName}</h2>
            <p className="text-sm text-gray-300">@{contact.username}</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-mono">{formatDuration(callDuration)}</p>
            <div className="flex items-center gap-1 justify-end mt-1">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <span className="text-xs text-gray-300">Connected</span>
            </div>
          </div>
        </div>
      </div>

      {/* Control panel */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            size="lg"
            variant={isMuted ? 'destructive' : 'secondary'}
            className="rounded-full w-16 h-16 p-0"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVideo();
            }}
            size="lg"
            variant={isVideoEnabled ? 'secondary' : 'destructive'}
            className="rounded-full w-16 h-16 p-0"
            title={isVideoEnabled ? 'Turn off video' : 'Turn on video'}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* End call button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            size="lg"
            variant="destructive"
            className="rounded-full w-20 h-20 p-0 bg-red-600 hover:bg-red-700"
            title="End call"
          >
            <PhoneOff className="h-8 w-8" />
          </Button>

          {/* Speaker button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              handleToggleSpeaker();
            }}
            size="lg"
            variant={isSpeakerOn ? 'secondary' : 'destructive'}
            className="rounded-full w-16 h-16 p-0"
            title={isSpeakerOn ? 'Turn off speaker' : 'Turn on speaker'}
          >
            {isSpeakerOn ? <Volume2 className="h-6 w-6" /> : <VolumeX className="h-6 w-6" />}
          </Button>

          {/* Switch camera button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchCamera();
            }}
            size="lg"
            variant="secondary"
            className="rounded-full w-16 h-16 p-0"
            title="Switch camera"
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>
        </div>
      </div>

      {/* CSS for mirror effect on local video */}
      <style jsx>{`
        .mirror {
          transform: scaleX(-1);
        }
      `}</style>
    </div>
  );
}

