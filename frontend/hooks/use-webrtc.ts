/**
 * useWebRTC Hook
 *
 * React hook for WebRTC peer-to-peer connection management.
 * Handles RTCPeerConnection setup, media streams, ICE candidates, and signaling.
 *
 * Features:
 * - RTCPeerConnection lifecycle management
 * - getUserMedia for camera/microphone access
 * - ICE candidate exchange via Socket.io
 * - STUN/TURN server configuration
 * - Connection state tracking
 * - Media stream management
 * - Error handling
 *
 * @module hooks/use-webrtc
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './use-socket';
import { useAuthStore } from '@/store/auth-store';

/**
 * WebRTC connection state
 */
export type WebRTCConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';

/**
 * Media constraints for getUserMedia
 */
export interface MediaConstraints {
  audio: boolean;
  video: boolean | MediaTrackConstraints;
}

/**
 * WebRTC hook return type
 */
export interface UseWebRTCReturn {
  // Connection state
  connectionState: WebRTCConnectionState;
  isConnected: boolean;

  // Media streams
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;

  // Media controls
  isMuted: boolean;
  isVideoEnabled: boolean;
  isSpeakerEnabled: boolean;

  // Actions
  startCall: (
    remoteUserId: string,
    constraints?: MediaConstraints
  ) => Promise<void>;
  answerCall: (
    remoteUserId: string,
    offer: RTCSessionDescriptionInit,
    constraints?: MediaConstraints
  ) => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => void;
  toggleSpeaker: () => void;
  switchCamera: () => Promise<void>;
}

/**
 * Default media constraints
 */
const DEFAULT_CONSTRAINTS: MediaConstraints = {
  audio: true,
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user',
  },
};

/**
 * Get ICE servers configuration from environment
 */
function getIceServers(): RTCIceServer[] {
  const stunUrl = process.env.NEXT_PUBLIC_STUN_URL;
  const turnUrl = process.env.NEXT_PUBLIC_TURN_URL;

  const iceServers: RTCIceServer[] = [];

  // Add STUN server
  if (stunUrl) {
    iceServers.push({ urls: stunUrl });
  }

  // Add TURN server
  if (turnUrl) {
    // In production, TURN credentials should be fetched from API
    // For now, we use environment variables
    iceServers.push({
      urls: turnUrl,
      username: 'svazuser', // This should come from API in production
      credential: 'change_this_secure_coturn_password', // This should come from API in production
    });
  }

  // Fallback to public STUN servers if no custom servers configured
  if (iceServers.length === 0) {
    iceServers.push(
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    );
  }

  return iceServers;
}

/**
 * useWebRTC Hook
 *
 * Manages WebRTC peer-to-peer connection for 1-on-1 calls.
 *
 * @returns WebRTC connection utilities
 *
 * @example
 * ```tsx
 * function CallComponent() {
 *   const {
 *     connectionState,
 *     localStream,
 *     remoteStream,
 *     startCall,
 *     endCall,
 *     toggleMute,
 *   } = useWebRTC();
 *
 *   const handleCall = async () => {
 *     await startCall('remote-user-id');
 *   };
 *
 *   return (
 *     <div>
 *       <video ref={localVideoRef} srcObject={localStream} autoPlay muted />
 *       <video ref={remoteVideoRef} srcObject={remoteStream} autoPlay />
 *       <button onClick={handleCall}>Call</button>
 *       <button onClick={endCall}>End</button>
 *       <button onClick={toggleMute}>Mute</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useWebRTC(): UseWebRTCReturn {
  const { emit, on, off } = useSocket();
  const user = useAuthStore((state) => state.user);

  // Refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const remoteUserIdRef = useRef<string | null>(null);

  // State
  const [connectionState, setConnectionState] =
    useState<WebRTCConnectionState>('idle');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isSpeakerEnabled, setIsSpeakerEnabled] = useState(true);

  /**
   * Create RTCPeerConnection
   */
  const createPeerConnection = useCallback(() => {
    const iceServers = getIceServers();

    const pc = new RTCPeerConnection({
      iceServers,
      iceCandidatePoolSize: 10,
    });

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && remoteUserIdRef.current) {
        emit('signal-ice-candidate', {
          to: remoteUserIdRef.current,
          candidate: event.candidate,
        });
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log('[WebRTC] Connection state:', pc.connectionState);

      switch (pc.connectionState) {
        case 'connecting':
          setConnectionState('connecting');
          break;
        case 'connected':
          setConnectionState('connected');
          break;
        case 'disconnected':
          setConnectionState('disconnected');
          break;
        case 'failed':
          setConnectionState('failed');
          endCall();
          break;
        case 'closed':
          setConnectionState('idle');
          break;
      }
    };

    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[WebRTC] Remote track received:', event.track.kind);
      const [stream] = event.streams;
      setRemoteStream(stream);
    };

    // Handle ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }, [emit]);

  /**
   * Get user media (camera and microphone)
   */
  const getUserMedia = useCallback(
    async (constraints: MediaConstraints = DEFAULT_CONSTRAINTS) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        setLocalStream(stream);
        return stream;
      } catch (error) {
        console.error('[WebRTC] Error getting user media:', error);
        throw new Error('Failed to access camera/microphone');
      }
    },
    []
  );

  /**
   * Start a call (caller side)
   */
  const startCall = useCallback(
    async (
      remoteUserId: string,
      constraints: MediaConstraints = DEFAULT_CONSTRAINTS
    ) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setConnectionState('connecting');
        remoteUserIdRef.current = remoteUserId;

        // Get local media stream
        const stream = await getUserMedia(constraints);

        // Create peer connection
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Create and send offer
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        emit('signal-offer', {
          to: remoteUserId,
          offer: pc.localDescription,
        });

        console.log('[WebRTC] Call started, offer sent to:', remoteUserId);
      } catch (error) {
        console.error('[WebRTC] Error starting call:', error);
        setConnectionState('failed');
        endCall();
        throw error;
      }
    },
    [user, getUserMedia, createPeerConnection, emit]
  );

  /**
   * Answer a call (receiver side)
   */
  const answerCall = useCallback(
    async (
      remoteUserId: string,
      offer: RTCSessionDescriptionInit,
      constraints: MediaConstraints = DEFAULT_CONSTRAINTS
    ) => {
      if (!user) {
        throw new Error('User not authenticated');
      }

      try {
        setConnectionState('connecting');
        remoteUserIdRef.current = remoteUserId;

        // Get local media stream
        const stream = await getUserMedia(constraints);

        // Create peer connection
        const pc = createPeerConnection();
        peerConnectionRef.current = pc;

        // Add local tracks to peer connection
        stream.getTracks().forEach((track) => {
          pc.addTrack(track, stream);
        });

        // Set remote description (offer)
        await pc.setRemoteDescription(new RTCSessionDescription(offer));

        // Create and send answer
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        emit('signal-answer', {
          to: remoteUserId,
          answer: pc.localDescription,
        });

        console.log('[WebRTC] Call answered, answer sent to:', remoteUserId);
      } catch (error) {
        console.error('[WebRTC] Error answering call:', error);
        setConnectionState('failed');
        endCall();
        throw error;
      }
    },
    [user, getUserMedia, createPeerConnection, emit]
  );

  /**
   * End the call
   */
  const endCall = useCallback(() => {
    console.log('[WebRTC] Ending call');

    // Stop local stream
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Reset state
    setRemoteStream(null);
    setConnectionState('idle');
    remoteUserIdRef.current = null;
    setIsMuted(false);
    setIsVideoEnabled(true);
  }, [localStream]);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  /**
   * Toggle video
   */
  const toggleVideo = useCallback(() => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoEnabled(videoTrack.enabled);
      }
    }
  }, [localStream]);

  /**
   * Toggle speaker (placeholder - actual implementation depends on platform)
   */
  const toggleSpeaker = useCallback(() => {
    // Note: Speaker toggle is platform-specific and may require native APIs
    // For web, this is typically handled by the browser
    setIsSpeakerEnabled((prev) => !prev);
    console.log('[WebRTC] Speaker toggle not fully implemented for web');
  }, []);

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(async () => {
    if (!localStream) return;

    const videoTrack = localStream.getVideoTracks()[0];
    if (!videoTrack) return;

    try {
      // Get current facing mode
      const currentFacingMode = videoTrack.getSettings().facingMode;
      const newFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';

      // Stop current video track
      videoTrack.stop();

      // Get new video stream with switched camera
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode },
        audio: false,
      });

      const newVideoTrack = newStream.getVideoTracks()[0];

      // Replace track in peer connection
      if (peerConnectionRef.current) {
        const sender = peerConnectionRef.current
          .getSenders()
          .find((s) => s.track?.kind === 'video');

        if (sender) {
          await sender.replaceTrack(newVideoTrack);
        }
      }

      // Update local stream
      const updatedStream = new MediaStream([
        newVideoTrack,
        ...localStream.getAudioTracks(),
      ]);
      setLocalStream(updatedStream);

      console.log('[WebRTC] Camera switched to:', newFacingMode);
    } catch (error) {
      console.error('[WebRTC] Error switching camera:', error);
    }
  }, [localStream]);

  /**
   * Handle incoming signaling messages
   */
  useEffect(() => {
    const handleSignalAnswer = async (data: {
      from: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log('[WebRTC] Received answer from:', data.from);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        } catch (error) {
          console.error('[WebRTC] Error setting remote description:', error);
        }
      }
    };

    const handleSignalIceCandidate = async (data: {
      from: string;
      candidate: RTCIceCandidateInit;
    }) => {
      console.log('[WebRTC] Received ICE candidate from:', data.from);

      if (peerConnectionRef.current) {
        try {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        } catch (error) {
          console.error('[WebRTC] Error adding ICE candidate:', error);
        }
      }
    };

    // Subscribe to signaling events
    on('signal-answer', handleSignalAnswer);
    on('signal-ice-candidate', handleSignalIceCandidate);

    return () => {
      off('signal-answer', handleSignalAnswer);
      off('signal-ice-candidate', handleSignalIceCandidate);
    };
  }, [on, off]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      endCall();
    };
  }, [endCall]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    localStream,
    remoteStream,
    isMuted,
    isVideoEnabled,
    isSpeakerEnabled,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
  };
}

