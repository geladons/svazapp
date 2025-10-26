/**
 * LiveKit Hook
 *
 * Manages LiveKit Room connection and state for group/guest calls.
 * Handles participant events, media tracks, and connection lifecycle.
 *
 * @module hooks/use-livekit
 */

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Room,
  RoomEvent,
  LocalParticipant,
  RemoteParticipant,
  Track,
  VideoPresets,
  RoomOptions,
} from 'livekit-client';

/**
 * Media constraints for LiveKit
 */
export interface LiveKitMediaConstraints {
  audio?: boolean;
  video?: boolean | MediaTrackConstraints;
}

/**
 * LiveKit hook return type
 */
export interface UseLiveKitReturn {
  /** LiveKit room instance */
  room: Room | null;
  /** Whether connected to room */
  isConnected: boolean;
  /** Local participant */
  localParticipant: LocalParticipant | null;
  /** Remote participants */
  remoteParticipants: RemoteParticipant[];
  /** Whether microphone is muted */
  isMuted: boolean;
  /** Whether video is enabled */
  isVideoEnabled: boolean;
  /** Connection state */
  connectionState: 'idle' | 'connecting' | 'connected' | 'disconnected';
  /** Connect to LiveKit room */
  connect: (url: string, token: string, constraints?: LiveKitMediaConstraints) => Promise<void>;
  /** Disconnect from room */
  disconnect: () => void;
  /** Toggle microphone mute */
  toggleMute: () => Promise<void>;
  /** Toggle video on/off */
  toggleVideo: () => Promise<void>;
  /** Switch camera (front/back) */
  switchCamera: () => Promise<void>;
}

/**
 * LiveKit Hook
 *
 * Manages LiveKit Room connection for group and guest calls.
 * Provides connection management, participant tracking, and media controls.
 *
 * @returns LiveKit hook interface
 *
 * @example
 * ```tsx
 * const {
 *   room,
 *   isConnected,
 *   remoteParticipants,
 *   connect,
 *   disconnect,
 *   toggleMute,
 *   toggleVideo,
 * } = useLiveKit();
 *
 * // Connect to room
 * await connect('wss://livekit.example.com', 'token');
 *
 * // Disconnect
 * disconnect();
 * ```
 */
export function useLiveKit(): UseLiveKitReturn {
  const [room, setRoom] = useState<Room | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [localParticipant, setLocalParticipant] = useState<LocalParticipant | null>(null);
  const [remoteParticipants, setRemoteParticipants] = useState<RemoteParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [connectionState, setConnectionState] = useState<'idle' | 'connecting' | 'connected' | 'disconnected'>('idle');

  const roomRef = useRef<Room | null>(null);

  /**
   * Update remote participants list
   */
  const updateRemoteParticipants = useCallback((currentRoom: Room) => {
    const participants = Array.from(currentRoom.remoteParticipants.values());
    setRemoteParticipants(participants);
  }, []);

  /**
   * Connect to LiveKit room
   */
  const connect = useCallback(
    async (url: string, token: string, _constraints: LiveKitMediaConstraints = { audio: true, video: true }) => {
      try {
        setConnectionState('connecting');

        // Create room instance
        const roomOptions: RoomOptions = {
          adaptiveStream: true,
          dynacast: true,
          videoCaptureDefaults: {
            resolution: VideoPresets.h720.resolution,
          },
        };

        const newRoom = new Room(roomOptions);
        roomRef.current = newRoom;

        // Set up event listeners
        newRoom
          .on(RoomEvent.Connected, () => {
            console.log('[LiveKit] Connected to room');
            setIsConnected(true);
            setConnectionState('connected');
            setLocalParticipant(newRoom.localParticipant);
            updateRemoteParticipants(newRoom);
          })
          .on(RoomEvent.Disconnected, () => {
            console.log('[LiveKit] Disconnected from room');
            setIsConnected(false);
            setConnectionState('disconnected');
            setLocalParticipant(null);
            setRemoteParticipants([]);
          })
          .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
            console.log('[LiveKit] Participant connected:', participant.identity);
            updateRemoteParticipants(newRoom);
          })
          .on(RoomEvent.ParticipantDisconnected, (participant: RemoteParticipant) => {
            console.log('[LiveKit] Participant disconnected:', participant.identity);
            updateRemoteParticipants(newRoom);
          })
          .on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
            console.log('[LiveKit] Track subscribed:', track.kind, 'from', participant.identity);
            updateRemoteParticipants(newRoom);
          })
          .on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
            console.log('[LiveKit] Track unsubscribed:', track.kind, 'from', participant.identity);
            updateRemoteParticipants(newRoom);
          });

        // Connect to room
        await newRoom.connect(url, token);

        // Enable local tracks
        await newRoom.localParticipant.enableCameraAndMicrophone();

        setRoom(newRoom);
        setIsVideoEnabled(true);
        setIsMuted(false);

        console.log('[LiveKit] Successfully connected and enabled media');
      } catch (error) {
        console.error('[LiveKit] Connection error:', error);
        setConnectionState('disconnected');
        throw error;
      }
    },
    [updateRemoteParticipants]
  );

  /**
   * Disconnect from room
   */
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      console.log('[LiveKit] Disconnecting from room');
      roomRef.current.disconnect();
      roomRef.current = null;
      setRoom(null);
      setIsConnected(false);
      setConnectionState('idle');
      setLocalParticipant(null);
      setRemoteParticipants([]);
    }
  }, []);

  /**
   * Toggle microphone mute
   */
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;

    const enabled = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(enabled);
    setIsMuted(!enabled);
    console.log('[LiveKit] Microphone', enabled ? 'unmuted' : 'muted');
  }, [isMuted]);

  /**
   * Toggle video on/off
   */
  const toggleVideo = useCallback(async () => {
    if (!roomRef.current) return;

    const enabled = !isVideoEnabled;
    await roomRef.current.localParticipant.setCameraEnabled(enabled);
    setIsVideoEnabled(enabled);
    console.log('[LiveKit] Video', enabled ? 'enabled' : 'disabled');
  }, [isVideoEnabled]);

  /**
   * Switch camera (front/back)
   */
  const switchCamera = useCallback(async () => {
    if (!roomRef.current) return;

    try {
      const videoTrack = roomRef.current.localParticipant.getTrackPublication(Track.Source.Camera);
      if (videoTrack?.track) {
        // @ts-ignore - switchCamera exists but not in types
        await videoTrack.track.switchCamera();
        console.log('[LiveKit] Camera switched');
      }
    } catch (error) {
      console.error('[LiveKit] Failed to switch camera:', error);
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (roomRef.current) {
        console.log('[LiveKit] Cleaning up room on unmount');
        roomRef.current.disconnect();
        roomRef.current = null;
      }
    };
  }, []);

  return {
    room,
    isConnected,
    localParticipant,
    remoteParticipants,
    isMuted,
    isVideoEnabled,
    connectionState,
    connect,
    disconnect,
    toggleMute,
    toggleVideo,
    switchCamera,
  };
}

