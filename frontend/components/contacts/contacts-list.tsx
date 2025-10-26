'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Users, AlertCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactListItem } from './contact-list-item';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useContactsStore } from '@/store/contacts-store';
import { useCallStore } from '@/store/call-store';

/**
 * Contacts list component
 * Shows list of accepted contacts with online status and action buttons
 */
export function ContactsList() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const contacts = useContactsStore((state) => state.contacts);
  const setContacts = useContactsStore((state) => state.setContacts);
  const updateContactStatus = useContactsStore(
    (state) => state.updateContactStatus
  );
  const getAcceptedContacts = useContactsStore(
    (state) => state.getAcceptedContacts
  );

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create API client instance (memoized to prevent infinite loops)
   */
  const apiClient = useMemo(() => {
    const client = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
      onTokenRefresh: (accessToken, refreshToken) => {
        if (user) {
          setAuth(user, { accessToken, refreshToken });
        }
      },
      onAuthError: () => {
        clearAuth();
        router.push('/login');
      },
    });

    // Set tokens if available
    if (tokens) {
      client.setTokens(tokens.accessToken, tokens.refreshToken);
    }

    return client;
  }, [user, tokens, setAuth, clearAuth, router]);

  /**
   * Load accepted contacts
   */
  useEffect(() => {
    const loadAcceptedContacts = async () => {
      // If we already have contacts in store, don't fetch again
      if (contacts.length > 0) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.getContacts('ACCEPTED');

        // Convert API response to store format
        const formattedContacts = response.contacts.map((c) => ({
          id: c.id,
          userId: c.userId,
          contactId: c.contactId,
          requestedBy: c.requestedBy,
          status: c.status,
          createdAt: new Date(c.createdAt),
          updatedAt: new Date(c.updatedAt),
          contact: {
            id: c.contact.id,
            email: c.contact.email,
            username: c.contact.username,
            displayName: c.contact.displayName,
            phone: null, // API doesn't return phone in contact search
            avatarUrl: c.contact.avatarUrl,
            isOnline: c.contact.isOnline,
            lastSeen: new Date(c.contact.lastSeenAt),
          },
        }));

        setContacts(formattedContacts);
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Failed to load contacts. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadAcceptedContacts();
  }, []);

  /**
   * Handle chat action
   */
  const handleChat = (contactId: string) => {
    router.push(`/chats/${contactId}`);
  };

  /**
   * Handle call action
   */
  const handleCall = (contactId: string) => {
    const contact = contacts.find((c) => c.contactId === contactId);
    if (!contact) return;

    // Set active call in call store
    const { setActiveCall } = useCallStore.getState();
    setActiveCall({
      remoteUserId: contact.contactId,
      remoteUserName: contact.contact.displayName || contact.contact.username,
      remoteUserUsername: contact.contact.username,
      remoteUserAvatar: contact.contact.avatarUrl,
      type: 'VIDEO',
      direction: 'OUTGOING',
      status: 'calling',
    });
  };

  /**
   * Handle block action
   */
  const handleBlock = async (contactId: string) => {
    await apiClient.blockContact(contactId);

    // Update contact status in store
    updateContactStatus(contactId, 'BLOCKED');
  };

  /**
   * Get accepted contacts and sort them
   * Online contacts first, then alphabetically by displayName/username
   */
  const acceptedContacts = getAcceptedContacts().sort((a, b) => {
    // Online status first
    if (a.contact.isOnline !== b.contact.isOnline) {
      return a.contact.isOnline ? -1 : 1;
    }

    // Then alphabetically
    const nameA = (
      a.contact.displayName || a.contact.username
    ).toLowerCase();
    const nameB = (
      b.contact.displayName || b.contact.username
    ).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return (
    <div className="flex flex-col h-full">
      {/* Error State */}
      {error && (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
                className="ml-4"
              >
                Try again
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="flex-1 overflow-y-auto">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-4 border-b border-gray-200 dark:border-gray-800"
            >
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
                <Skeleton className="h-9 w-9 rounded-md" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && acceptedContacts.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <Users className="h-16 w-16 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No Contacts Yet
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-sm">
            Add contacts to start chatting and calling with your friends and
            family.
          </p>
          <Button
            onClick={() => {
              // Scroll to search section or open search modal
              // For now, just scroll to top where search is
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      )}

      {/* Contacts List */}
      {!isLoading && !error && acceptedContacts.length > 0 && (
        <div className="flex-1 overflow-y-auto">
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {acceptedContacts.map((contact) => (
              <ContactListItem
                key={contact.id}
                contact={contact}
                onChat={handleChat}
                onCall={handleCall}
                onBlock={handleBlock}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

