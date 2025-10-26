import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Application mode type
 * - Normal: Server-based communication (default)
 * - Emergency: P2P-only communication (offline/degraded mode)
 */
export type AppMode = 'Normal' | 'Emergency';

/**
 * Application state interface
 */
export interface AppState {
  /**
   * Current application mode
   */
  mode: AppMode;

  /**
   * Whether the app is online (has network connectivity)
   */
  isOnline: boolean;

  /**
   * Whether the API server is reachable
   */
  isApiReachable: boolean;

  /**
   * Whether Socket.io is connected
   */
  isSocketConnected: boolean;

  /**
   * Last time the mode was checked
   */
  lastModeCheck: number | null;

  /**
   * Last successful contact with the server
   * Used to display "Last seen" in Emergency mode
   */
  lastServerContact: Date | null;

  /**
   * Switch to Normal mode
   */
  switchToNormalMode: () => void;

  /**
   * Switch to Emergency mode
   */
  switchToEmergencyMode: () => void;

  /**
   * Update online status
   */
  setOnlineStatus: (isOnline: boolean) => void;

  /**
   * Update API reachability status
   */
  setApiReachable: (isReachable: boolean) => void;

  /**
   * Update Socket.io connection status
   */
  setSocketConnected: (isConnected: boolean) => void;

  /**
   * Check and update mode based on network and API status
   */
  checkAndUpdateMode: () => void;
}

/**
 * Main application store
 * Manages application mode (Normal/Emergency) and connectivity status
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      mode: 'Normal',
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      isApiReachable: true,
      isSocketConnected: false,
      lastModeCheck: null,
      lastServerContact: null,

      switchToNormalMode: () => {
        set({
          mode: 'Normal',
          lastModeCheck: Date.now(),
        });
      },

      switchToEmergencyMode: () => {
        set({
          mode: 'Emergency',
          lastModeCheck: Date.now(),
        });
      },

      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
        get().checkAndUpdateMode();
      },

      setApiReachable: (isReachable: boolean) => {
        set({
          isApiReachable: isReachable,
          // Update lastServerContact when API becomes reachable
          ...(isReachable && { lastServerContact: new Date() })
        });
        get().checkAndUpdateMode();
      },

      setSocketConnected: (isConnected: boolean) => {
        set({ isSocketConnected: isConnected });
      },

      checkAndUpdateMode: () => {
        const { isOnline, isApiReachable } = get();

        // Switch to Emergency mode if offline or API unreachable
        if (!isOnline || !isApiReachable) {
          get().switchToEmergencyMode();
        } else {
          // Only switch back to Normal if both online and API reachable
          get().switchToNormalMode();
        }
      },
    }),
    {
      name: 'svazapp-app-store',
      partialize: (state) => ({
        mode: state.mode,
        lastModeCheck: state.lastModeCheck,
      }),
    }
  )
);

