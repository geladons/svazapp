'use client';

import { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CallHistoryItem } from '@/components/calls/call-history-item';
import { useCallStore } from '@/store/call-store';
import { useAuthStore } from '@/store/auth-store';
import { createApiClient } from '@/lib/api-client';

/**
 * Call record from API
 */
interface CallRecord {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'AUDIO' | 'VIDEO';
  status: 'RINGING' | 'ANSWERED' | 'ENDED' | 'MISSED' | 'REJECTED' | 'FAILED' | 'CANCELLED';
  mode: 'NORMAL' | 'EMERGENCY' | 'ASYMMETRIC';
  startedAt: string;
  endedAt: string | null;
  duration: number | null;
  createdAt: string;
  caller: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
  receiver: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

/**
 * Calls page
 * Shows call history with tabs for All and Missed calls
 */
export default function CallsPage() {
  const { user, tokens } = useAuthStore();
  const { setActiveCall } = useCallStore();

  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load call history
   */
  useEffect(() => {
    const loadCalls = async () => {
      if (!tokens?.accessToken || !user) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const apiClient = createApiClient({
          baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
        });
        apiClient.setTokens(tokens.accessToken, tokens.refreshToken);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/calls`,
          {
            headers: {
              Authorization: `Bearer ${tokens.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load call history');
        }

        const data = await response.json();
        setCalls(data.calls || []);
      } catch (err) {
        console.error('[CallsPage] Error loading calls:', err);
        setError('Failed to load call history');
      } finally {
        setIsLoading(false);
      }
    };

    loadCalls();
  }, [tokens, user]);

  /**
   * Handle call-back
   */
  const handleCallBack = (userId: string) => {
    const call = calls.find(
      (c) => c.callerId === userId || c.receiverId === userId
    );
    if (!call) return;

    const otherUser = call.callerId === user?.id ? call.receiver : call.caller;

    setActiveCall({
      remoteUserId: otherUser.id,
      remoteUserName: otherUser.displayName,
      remoteUserUsername: otherUser.username,
      remoteUserAvatar: otherUser.avatarUrl,
      type: 'VIDEO',
      direction: 'OUTGOING',
      status: 'calling',
    });
  };

  /**
   * Format calls for display
   */
  const formattedCalls = calls.map((call) => {
    const isIncoming = call.receiverId === user?.id;
    const otherUser = isIncoming ? call.caller : call.receiver;

    return {
      id: call.id,
      type: call.type,
      status: call.status,
      direction: isIncoming ? ('INCOMING' as const) : ('OUTGOING' as const),
      duration: call.duration,
      createdAt: new Date(call.createdAt),
      otherUser: {
        id: otherUser.id,
        displayName: otherUser.displayName,
        username: otherUser.username,
        avatarUrl: otherUser.avatarUrl,
      },
    };
  });

  /**
   * Filter missed calls
   */
  const missedCalls = formattedCalls.filter((call) => call.status === 'MISSED');

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading call history...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 mb-6">
            <Phone className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Error Loading Calls
          </h2>
          <p className="text-gray-600 dark:text-gray-400">{error}</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (calls.length === 0) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/20 mb-6">
            <Phone className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            No Calls Yet
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your call history will appear here. Make a call by selecting a contact.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Tabs defaultValue="all" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start rounded-none border-b">
          <TabsTrigger value="all" className="flex-1">
            All ({formattedCalls.length})
          </TabsTrigger>
          <TabsTrigger value="missed" className="flex-1 relative">
            Missed ({missedCalls.length})
            {missedCalls.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-600 rounded-full" />
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="flex-1 overflow-y-auto mt-0">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {formattedCalls.map((call) => (
              <CallHistoryItem
                key={call.id}
                call={call}
                onCallBack={handleCallBack}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="missed" className="flex-1 overflow-y-auto mt-0">
          {missedCalls.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <div className="text-center">
                <p className="text-gray-600 dark:text-gray-400">
                  No missed calls
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {missedCalls.map((call) => (
                <CallHistoryItem
                  key={call.id}
                  call={call}
                  onCallBack={handleCallBack}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

