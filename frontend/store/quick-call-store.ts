/**
 * Quick Call Store
 *
 * Manages state for quick call (guest call) feature.
 * Tracks active quick call room information.
 *
 * @module store/quick-call-store
 */

'use client';

import { create } from 'zustand';

/**
 * Active quick call information
 */
export interface ActiveQuickCall {
  /** Unique room ID */
  roomId: string;
  /** LiveKit room name */
  roomName: string;
  /** LiveKit access token */
  token: string;
  /** LiveKit server URL */
  url: string;
  /** Whether current user is host */
  isHost: boolean;
  /** Guest name (if current user is guest) */
  guestName?: string;
}

/**
 * Quick call store state
 */
interface QuickCallState {
  /** Active quick call */
  activeQuickCall: ActiveQuickCall | null;
  /** Set active quick call */
  setActiveQuickCall: (call: ActiveQuickCall | null) => void;
  /** Clear quick call */
  clearQuickCall: () => void;
}

/**
 * Quick Call Store
 *
 * Global state management for quick call feature.
 * Stores active quick call room information.
 *
 * @example
 * ```tsx
 * const { activeQuickCall, setActiveQuickCall, clearQuickCall } = useQuickCallStore();
 *
 * // Start quick call
 * setActiveQuickCall({
 *   roomId: 'quick-call-123',
 *   roomName: 'quick-call-123',
 *   token: 'eyJhbGc...',
 *   url: 'wss://livekit.example.com',
 *   isHost: true,
 * });
 *
 * // Clear quick call
 * clearQuickCall();
 * ```
 */
export const useQuickCallStore = create<QuickCallState>((set) => ({
  activeQuickCall: null,

  setActiveQuickCall: (call) => {
    set({ activeQuickCall: call });
  },

  clearQuickCall: () => {
    set({ activeQuickCall: null });
  },
}));

