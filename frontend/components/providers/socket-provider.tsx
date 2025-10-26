/**
 * Socket Provider
 *
 * React Context Provider for Socket.io integration.
 * Initializes Socket.io connection globally and manages lifecycle.
 *
 * This provider should be placed high in the component tree (e.g., in layout.tsx)
 * to ensure Socket.io is available throughout the app.
 *
 * @module components/providers/socket-provider
 */

'use client';

import { useSocket } from '@/hooks/use-socket';

/**
 * Socket Provider Props
 */
interface SocketProviderProps {
  children: React.ReactNode;
}

/**
 * Socket Provider Component
 *
 * Initializes Socket.io connection and manages lifecycle.
 * Uses useSocket hook internally to handle connection logic.
 *
 * @param props - Component props
 * @returns Provider component
 *
 * @example
 * ```tsx
 * // In app/layout.tsx
 * export default function RootLayout({ children }) {
 *   return (
 *     <html>
 *       <body>
 *         <SocketProvider>
 *           {children}
 *         </SocketProvider>
 *       </body>
 *     </html>
 *   );
 * }
 * ```
 */
export function SocketProvider({ children }: SocketProviderProps) {
  // Initialize Socket.io connection
  // The useSocket hook handles all connection logic based on mode and auth
  useSocket();

  // Simply render children - no context needed
  // Components can use useSocket hook directly to access socket
  return <>{children}</>;
}

