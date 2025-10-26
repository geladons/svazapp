/**
 * Call Store
 *
 * Zustand store for managing call state.
 * Handles call lifecycle, incoming calls, and call history.
 *
 * @module store/call-store
 */

import { create } from 'zustand';

/**
 * Call status
 */
export type CallStatus =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'active'
  | 'ended';

/**
 * Call type
 */
export type CallType = 'AUDIO' | 'VIDEO';

/**
 * Call direction
 */
export type CallDirection = 'INCOMING' | 'OUTGOING';

/**
 * Active call information
 */
export interface ActiveCall {
  /** Call ID (from backend) */
  id?: string;
  /** Remote user ID */
  remoteUserId: string;
  /** Remote user display name */
  remoteUserName: string;
  /** Remote user username */
  remoteUserUsername: string;
  /** Remote user avatar URL */
  remoteUserAvatar?: string | null;
  /** Call type */
  type: CallType;
  /** Call direction */
  direction: CallDirection;
  /** Call status */
  status: CallStatus;
  /** Call start time */
  startedAt?: Date;
  /** WebRTC offer (for incoming calls) */
  offer?: RTCSessionDescriptionInit;
}

/**
 * Call store state
 */
export interface CallState {
  /** Active call (if any) */
  activeCall: ActiveCall | null;

  /** Set active call */
  setActiveCall: (call: ActiveCall | null) => void;

  /** Update call status */
  updateCallStatus: (status: CallStatus) => void;

  /** Update call ID (after backend creates record) */
  updateCallId: (id: string) => void;

  /** Clear active call */
  clearCall: () => void;
}

/**
 * Call store
 * Manages active call state
 */
export const useCallStore = create<CallState>((set) => ({
  activeCall: null,

  setActiveCall: (call: ActiveCall | null) => {
    set({ activeCall: call });
  },

  updateCallStatus: (status: CallStatus) => {
    set((state) => {
      if (!state.activeCall) return state;
      return {
        activeCall: {
          ...state.activeCall,
          status,
        },
      };
    });
  },

  updateCallId: (id: string) => {
    set((state) => {
      if (!state.activeCall) return state;
      return {
        activeCall: {
          ...state.activeCall,
          id,
        },
      };
    });
  },

  clearCall: () => {
    set({ activeCall: null });
  },
}));

