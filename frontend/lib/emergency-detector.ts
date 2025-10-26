import { useAppStore } from '@/store/app-store';

/**
 * Health check timeout in milliseconds
 */
const HEALTH_CHECK_TIMEOUT = 5000;

/**
 * Interval between health checks in milliseconds
 */
const CHECK_INTERVAL = 10000;

/**
 * Retry delays in milliseconds (exponential backoff)
 */
const RETRY_DELAYS = [1000, 2000, 4000];

/**
 * Checks if the API server is reachable
 * 
 * @returns Promise<boolean> - true if server is reachable, false otherwise
 */
async function checkHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_CHECK_TIMEOUT);

    const response = await fetch('/api/health', {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeoutId);

    return response.ok;
  } catch {
    // Network error, timeout, or server unreachable
    return false;
  }
}

/**
 * Performs health check with exponential backoff retry
 * 
 * @returns Promise<boolean> - true if server is reachable after retries, false otherwise
 */
async function checkHealthWithRetry(): Promise<boolean> {
  // First attempt
  const firstAttempt = await checkHealth();
  if (firstAttempt) {
    return true;
  }

  // Retry with exponential backoff
  for (const delay of RETRY_DELAYS) {
    await new Promise((resolve) => setTimeout(resolve, delay));
    
    const retryAttempt = await checkHealth();
    if (retryAttempt) {
      return true;
    }
  }

  // All retries failed
  return false;
}

/**
 * Starts the emergency mode detector
 * 
 * Continuously monitors API health and updates the app store mode state.
 * - On app start: Immediate health check
 * - Every 10 seconds: Background health check
 * - On fetch error: Retry 3 times with exponential backoff (1s, 2s, 4s)
 * - After 3 failures: Switch to Emergency mode
 * - On success after Emergency: Switch back to Normal mode
 * 
 * @param interval - Check interval in milliseconds (default: 10000)
 * @returns Cleanup function to stop the detector
 * 
 * @example
 * ```typescript
 * const cleanup = startEmergencyDetector();
 * 
 * // Later, when component unmounts:
 * cleanup();
 * ```
 */
export function startEmergencyDetector(interval: number = CHECK_INTERVAL): () => void {
  let intervalId: NodeJS.Timeout | null = null;
  let isRunning = true;

  /**
   * Performs a single health check cycle
   */
  async function performCheck() {
    if (!isRunning) {
      return;
    }

    const isReachable = await checkHealthWithRetry();
    
    // Update app store
    useAppStore.getState().setApiReachable(isReachable);

    if (isReachable) {
      console.log('[EmergencyDetector] API is reachable - Normal mode');
    } else {
      console.warn('[EmergencyDetector] API is unreachable - Emergency mode');
    }
  }

  // Immediate check on start
  performCheck();

  // Set up periodic checks
  intervalId = setInterval(() => {
    performCheck();
  }, interval);

  // Return cleanup function
  return () => {
    isRunning = false;
    if (intervalId) {
      clearInterval(intervalId);
      intervalId = null;
    }
    console.log('[EmergencyDetector] Stopped');
  };
}

