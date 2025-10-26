/**
 * LiveKit Call Screen Component
 *
 * Displays active LiveKit call UI with participants.
 * Shows local and remote video streams, control panel, and participant list.
 *
 * @module components/calls/livekit-call-screen
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, SwitchCamera, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RemoteParticipant, Track } from 'livekit-client';

/**
 * LiveKit call screen props
 */
export interface LiveKitCallScreenProps {
  /** Local participant info */
  localParticipant: {
    name: string;
    identity: string;
    videoTrack?: MediaStreamTrack | null;
    audioTrack?: MediaStreamTrack | null;
  };
  /** Remote participants */
  remoteParticipants: RemoteParticipant[];
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
  /** Callback to switch camera */
  onSwitchCamera: () => void;
}

/**
 * LiveKit Call Screen Component
 *
 * Shows active LiveKit call with participant videos and controls.
 * Supports 1-on-1 and group calls via LiveKit SFU.
 *
 * @param props - Component props
 * @returns LiveKit call screen component
 *
 * @example
 * ```tsx
 * <LiveKitCallScreen
 *   localParticipant={localParticipant}
 *   remoteParticipants={remoteParticipants}
 *   isMuted={isMuted}
 *   isVideoEnabled={isVideoEnabled}
 *   onEnd={handleEnd}
 *   onToggleMute={toggleMute}
 *   onToggleVideo={toggleVideo}
 *   onSwitchCamera={switchCamera}
 * />
 * ```
 */
export function LiveKitCallScreen({
  localParticipant,
  remoteParticipants,
  isMuted,
  isVideoEnabled,
  onEnd,
  onToggleMute,
  onToggleVideo,
  onSwitchCamera,
}: LiveKitCallScreenProps) {
  const [showControls, setShowControls] = useState(true);
  const [callDuration, setCallDuration] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callStartTimeRef = useRef<number>(Date.now());

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());

  /**
   * Update call duration every second
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const duration = Math.floor((Date.now() - callStartTimeRef.current) / 1000);
      setCallDuration(duration);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Format call duration (MM:SS)
   */
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  /**
   * Auto-hide controls after 3 seconds
   */
  useEffect(() => {
    if (showControls) {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }

      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }

    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
    };
  }, [showControls]);

  /**
   * Handle screen tap to show/hide controls
   */
  const handleScreenTap = () => {
    setShowControls(true);
  };

  /**
   * Attach local video track
   */
  useEffect(() => {
    if (localVideoRef.current && localParticipant.videoTrack) {
      const stream = new MediaStream([localParticipant.videoTrack]);
      localVideoRef.current.srcObject = stream;
    }
  }, [localParticipant.videoTrack]);

  /**
   * Attach remote video tracks
   */
  useEffect(() => {
    remoteParticipants.forEach((participant) => {
      const videoElement = remoteVideoRefs.current.get(participant.identity);
      if (!videoElement) return;

      const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
      if (videoTrack) {
        const mediaTrack = videoTrack.mediaStreamTrack;
        if (mediaTrack) {
          const stream = new MediaStream([mediaTrack]);
          videoElement.srcObject = stream;
        }
      }
    });
  }, [remoteParticipants]);

  // Get first remote participant (for 1-on-1 calls)
  const remoteParticipant = remoteParticipants[0];

  return (
    <div className="fixed inset-0 z-50 bg-black" onClick={handleScreenTap}>
      {/* Remote video (fullscreen) */}
      <div className="absolute inset-0">
        {remoteParticipant ? (
          <video
            ref={(el) => {
              if (el) remoteVideoRefs.current.set(remoteParticipant.identity, el);
            }}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
            <div className="text-center">
              <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-white text-lg">Waiting for participants...</p>
            </div>
          </div>
        )}
      </div>

      {/* Local video (PiP) */}
      {isVideoEnabled && (
        <div className="absolute top-4 right-4 w-32 h-48 rounded-lg overflow-hidden shadow-lg border-2 border-white/20">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
            style={{ transform: 'scaleX(-1)' }}
          />
        </div>
      )}

      {/* Call info (top) */}
      <div
        className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-between text-white">
          <div>
            <h2 className="text-lg font-semibold">
              {remoteParticipant ? remoteParticipant.name || remoteParticipant.identity : 'Quick Call'}
            </h2>
            <p className="text-sm text-gray-300">{formatDuration(callDuration)}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm">Connected</span>
          </div>
        </div>
      </div>

      {/* Control panel (bottom) */}
      <div
        className={`absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex items-center justify-center gap-4">
          {/* Mute button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            size="icon"
            className={`w-14 h-14 rounded-full ${
              isMuted
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
          </Button>

          {/* Video button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onToggleVideo();
            }}
            size="icon"
            className={`w-14 h-14 rounded-full ${
              !isVideoEnabled
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            {isVideoEnabled ? <Video className="h-6 w-6" /> : <VideoOff className="h-6 w-6" />}
          </Button>

          {/* End call button */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onEnd();
            }}
            size="icon"
            className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700"
          >
            <PhoneOff className="h-6 w-6" />
          </Button>

          {/* Switch camera button (mobile) */}
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSwitchCamera();
            }}
            size="icon"
            className="w-14 h-14 rounded-full bg-gray-700 hover:bg-gray-600"
          >
            <SwitchCamera className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </div>
  );
}

