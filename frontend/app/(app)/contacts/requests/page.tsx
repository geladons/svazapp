'use client';

import { useEffect, useState, useMemo } from 'react';
import { UserPlus, AlertCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { ContactRequestItem } from '@/components/contacts/contact-request-item';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useContactsStore } from '@/store/contacts-store';

/**
 * Contact requests page
 * Shows list of pending contact requests with accept/reject actions
 */
export default function ContactRequestsPage() {
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
  const removeContact = useContactsStore((state) => state.removeContact);
  const getIncomingRequests = useContactsStore(
    (state) => state.getIncomingRequests
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
   * Load pending contact requests
   */
  useEffect(() => {
    const loadPendingRequests = async () => {
      // If we already have contacts in store, don't fetch again
      if (contacts.length > 0) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.getContacts('PENDING');

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
          setError('Failed to load contact requests. Please try again.');
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadPendingRequests();
  }, []);

  /**
   * Handle accept contact request
   */
  const handleAccept = async (contactId: string) => {
    await apiClient.acceptContact(contactId);

    // Update contact status in store
    updateContactStatus(contactId, 'ACCEPTED');
  };

  /**
   * Handle reject contact request
   */
  const handleReject = async (contactId: string) => {
    await apiClient.rejectContact(contactId);

    // Remove contact from store
    removeContact(contactId);
  };

  /**
   * Get incoming contact requests from store
   * Only show requests where someone else sent the request to me
   */
  const incomingRequests = user ? getIncomingRequests(user.id) : [];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/contacts')}
            className="text-gray-600 dark:text-gray-400"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Contact Requests
          </h2>
        </div>
        {!isLoading && incomingRequests.length > 0 && (
          <p className="text-sm text-gray-600 dark:text-gray-400 ml-12">
            {incomingRequests.length}{' '}
            {incomingRequests.length === 1 ? 'incoming request' : 'incoming requests'}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-4">
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
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-20" />
                  <Skeleton className="h-9 w-20" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && incomingRequests.length === 0 && (
          <div className="text-center py-12">
            <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium mb-2">
              No Incoming Requests
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              You don&apos;t have any incoming contact requests at the moment.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/contacts')}
              className="mt-6"
            >
              Back to Contacts
            </Button>
          </div>
        )}

        {/* Requests List */}
        {!isLoading && !error && incomingRequests.length > 0 && (
          <div className="space-y-3">
            {incomingRequests.map((contact) => (
              <ContactRequestItem
                key={contact.id}
                contact={contact}
                onAccept={handleAccept}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

