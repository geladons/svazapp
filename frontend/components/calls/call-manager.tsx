/**
 * Call Manager Component
 *
 * Global component that manages call state and renders appropriate call UI.
 * Handles incoming calls, outgoing calls, and active calls.
 * Should be placed in the root layout.
 *
 * @module components/calls/call-manager
 */

'use client';

import { useEffect, useCallback } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { useWebRTC } from '@/hooks/use-webrtc';
import { useCallStore } from '@/store/call-store';
import { useAuthStore } from '@/store/auth-store';
import { createApiClient } from '@/lib/api-client';
import { db } from '@/lib/db';
import { CallingScreen } from './calling-screen';
import { IncomingCallScreen } from './incoming-call-screen';
import { ActiveCallScreen } from './active-call-screen';

/**
 * Call Manager Component
 *
 * Manages call lifecycle and renders appropriate UI based on call state.
 *
 * @returns Call manager component
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * <CallManager />
 * ```
 */
export function CallManager() {
  const { emit, on, off } = useSocket();
  const {
    connectionState,
    localStream,
    remoteStream,
    isVideoEnabled,
    isMuted,
    startCall,
    answerCall,
    endCall,
    toggleMute,
    toggleVideo,
    toggleSpeaker,
    switchCamera,
  } = useWebRTC();

  const { activeCall, updateCallStatus, updateCallId, clearCall } = useCallStore();
  const { tokens } = useAuthStore();

  /**
   * Handle outgoing call initiation
   */
  const handleStartCall = useCallback(async () => {
    if (!activeCall || activeCall.direction !== 'OUTGOING') return;

    try {
      // Start WebRTC call
      await startCall(activeCall.remoteUserId);

      // Emit call-initiate event to notify remote user
      emit('call-initiate', {
        to: activeCall.remoteUserId,
        callType: activeCall.type,
      });

      // Create call record in backend
      if (tokens?.accessToken) {
        const apiClient = createApiClient({
          baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
        });
        apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/calls`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokens.accessToken}`,
            },
            body: JSON.stringify({
              receiverId: activeCall.remoteUserId,
              type: activeCall.type,
              mode: 'NORMAL',
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          updateCallId(data.call.id);
        }
      }
    } catch (error) {
      console.error('[CallManager] Error starting call:', error);
      clearCall();
    }
  }, [activeCall, startCall, emit, tokens, updateCallId, clearCall]);

  /**
   * Handle incoming call acceptance
   */
  const handleAcceptCall = useCallback(async () => {
    if (!activeCall || activeCall.direction !== 'INCOMING' || !activeCall.offer) {
      return;
    }

    try {
      // Answer WebRTC call
      await answerCall(activeCall.remoteUserId, activeCall.offer);

      // Emit call-accept event
      emit('call-accept', {
        to: activeCall.remoteUserId,
      });

      // Update status
      updateCallStatus('active');
    } catch (error) {
      console.error('[CallManager] Error accepting call:', error);
      clearCall();
    }
  }, [activeCall, answerCall, emit, updateCallStatus, clearCall]);

  /**
   * Handle call rejection
   */
  const handleRejectCall = useCallback(() => {
    if (!activeCall) return;

    // Emit call-reject event
    emit('call-reject', {
      to: activeCall.remoteUserId,
    });

    // End WebRTC call
    endCall();

    // Clear call state
    clearCall();
  }, [activeCall, emit, endCall, clearCall]);

  /**
   * Handle call end
   */
  const handleEndCall = useCallback(() => {
    if (!activeCall) return;

    // Emit call-end event
    emit('call-end', {
      to: activeCall.remoteUserId,
    });

    // End WebRTC call
    endCall();

    // Update call record in backend
    if (activeCall.id && tokens?.accessToken) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/calls/${activeCall.id}/end`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
        },
      }).catch((error) => {
        console.error('[CallManager] Error ending call record:', error);
      });
    }

    // Clear call state
    clearCall();
  }, [activeCall, emit, endCall, tokens, clearCall]);

  /**
   * Handle call timeout
   */
  const handleCallTimeout = useCallback(() => {
    if (!activeCall) return;

    console.log('[CallManager] Call timed out');

    // Emit call-missed event
    emit('call-missed', {
      to: activeCall.remoteUserId,
    });

    // End call
    handleEndCall();
  }, [activeCall, emit, handleEndCall]);

  /**
   * Start outgoing call when activeCall is set
   */
  useEffect(() => {
    if (activeCall?.direction === 'OUTGOING' && activeCall.status === 'calling') {
      handleStartCall();
    }
  }, [activeCall, handleStartCall]);

  /**
   * Handle incoming call events
   */
  useEffect(() => {
    const handleCallIncoming = async (...args: unknown[]) => {
      // Type guard: validate incoming data structure
      const data = args[0];
      if (
        !data ||
        typeof data !== 'object' ||
        !('from' in data) ||
        !('callType' in data) ||
        typeof (data as { from: unknown }).from !== 'string' ||
        typeof (data as { callType: unknown }).callType !== 'string'
      ) {
        console.error('[CallManager] Invalid call-incoming data:', data);
        return;
      }

      const validatedData = data as { from: string; callType: string };
      console.log('[CallManager] Incoming call from:', validatedData.from);

      // Fetch user info from API or IndexedDB
      let remoteUser: {
        id: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
      } = {
        id: validatedData.from,
        displayName: 'Unknown User',
        username: 'unknown',
        avatarUrl: null,
      };

      try {
        // Try to fetch from IndexedDB first (faster)
        const dbUser = await db.users.get(validatedData.from);
        if (dbUser) {
          remoteUser = {
            id: dbUser.id,
            displayName: dbUser.displayName || dbUser.username,
            username: dbUser.username,
            avatarUrl: dbUser.avatarUrl,
          };
        } else if (tokens?.accessToken) {
          // Fallback to API if not in IndexedDB
          const apiClient = createApiClient({
            baseUrl: '/api',
            onTokenRefresh: () => {},
            onAuthError: () => {},
          });
          apiClient.setTokens(tokens.accessToken, tokens.refreshToken);
          const apiUser = await apiClient.getUserById(validatedData.from);
          remoteUser = {
            id: apiUser.id,
            displayName: apiUser.displayName || apiUser.username,
            username: apiUser.username,
            avatarUrl: apiUser.avatarUrl,
          };
        }
      } catch (error) {
        console.error('[CallManager] Failed to fetch user info:', error);
        // Continue with placeholder data
      }

      // Set incoming call
      useCallStore.setState({
        activeCall: {
          remoteUserId: validatedData.from,
          remoteUserName: remoteUser.displayName,
          remoteUserUsername: remoteUser.username,
          remoteUserAvatar: remoteUser.avatarUrl,
          type: validatedData.callType as 'AUDIO' | 'VIDEO',
          direction: 'INCOMING',
          status: 'ringing',
        },
      });
    };

    const handleCallAccepted = (..._args: unknown[]) => {
      console.log('[CallManager] Call accepted');
      updateCallStatus('active');
    };

    const handleCallRejected = (..._args: unknown[]) => {
      console.log('[CallManager] Call rejected');
      clearCall();
      endCall();
    };

    const handleCallEnded = (..._args: unknown[]) => {
      console.log('[CallManager] Call ended by remote user');
      clearCall();
      endCall();
    };

    // Subscribe to call events
    on('call-incoming', handleCallIncoming);
    on('call-accepted', handleCallAccepted);
    on('call-rejected', handleCallRejected);
    on('call-ended', handleCallEnded);

    return () => {
      off('call-incoming', handleCallIncoming);
      off('call-accepted', handleCallAccepted);
      off('call-rejected', handleCallRejected);
      off('call-ended', handleCallEnded);
    };
  }, [on, off, updateCallStatus, clearCall, endCall, tokens]);

  /**
   * Update call status based on WebRTC connection state
   */
  useEffect(() => {
    if (connectionState === 'connected' && activeCall?.status !== 'active') {
      updateCallStatus('active');
    } else if (connectionState === 'failed' || connectionState === 'disconnected') {
      if (activeCall) {
        handleEndCall();
      }
    }
  }, [connectionState, activeCall, updateCallStatus, handleEndCall]);

  // Render appropriate UI based on call state
  if (!activeCall) {
    return null;
  }

  // Incoming call (ringing)
  if (activeCall.direction === 'INCOMING' && activeCall.status === 'ringing') {
    return (
      <IncomingCallScreen
        contact={{
          id: activeCall.remoteUserId,
          displayName: activeCall.remoteUserName,
          username: activeCall.remoteUserUsername,
          avatarUrl: activeCall.remoteUserAvatar,
        }}
        callType={activeCall.type}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />
    );
  }

  // Outgoing call (calling)
  if (activeCall.direction === 'OUTGOING' && activeCall.status === 'calling') {
    return (
      <CallingScreen
        contact={{
          id: activeCall.remoteUserId,
          displayName: activeCall.remoteUserName,
          username: activeCall.remoteUserUsername,
          avatarUrl: activeCall.remoteUserAvatar,
        }}
        localStream={localStream}
        isVideoEnabled={isVideoEnabled}
        onCancel={handleEndCall}
        onTimeout={handleCallTimeout}
      />
    );
  }

  // Active call
  if (activeCall.status === 'active') {
    return (
      <ActiveCallScreen
        contact={{
          id: activeCall.remoteUserId,
          displayName: activeCall.remoteUserName,
          username: activeCall.remoteUserUsername,
          avatarUrl: activeCall.remoteUserAvatar,
        }}
        localStream={localStream}
        remoteStream={remoteStream}
        isMuted={isMuted}
        isVideoEnabled={isVideoEnabled}
        onEnd={handleEndCall}
        onToggleMute={toggleMute}
        onToggleVideo={toggleVideo}
        onToggleSpeaker={toggleSpeaker}
        onSwitchCamera={switchCamera}
      />
    );
  }

  return null;
}

