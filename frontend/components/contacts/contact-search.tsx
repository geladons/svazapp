'use client';

import { useState, useEffect, useMemo } from 'react';
import { Search, X, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchResultItem } from './search-result-item';
import { useDebounce } from '@/hooks/use-debounce';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';
import { useContactsStore } from '@/store/contacts-store';
import type { ApiUser } from '@/lib/api-types';
import { useRouter } from 'next/navigation';

/**
 * Search type filter
 */
type SearchType = 'all' | 'email' | 'phone' | 'username';

/**
 * Contact search component
 * Allows users to search for other users and add them as contacts
 */
export function ContactSearch() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const tokens = useAuthStore((state) => state.tokens);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const contacts = useContactsStore((state) => state.contacts);
  const addContact = useContactsStore((state) => state.addContact);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState<SearchType>('all');
  const [results, setResults] = useState<ApiUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debounce search query
  const debouncedSearchQuery = useDebounce(searchQuery, 500);

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
   * Perform search when debounced query changes
   */
  useEffect(() => {
    const performSearch = async () => {
      // Don't search if query is too short
      if (debouncedSearchQuery.trim().length < 2) {
        setResults([]);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await apiClient.searchUsers({
          q: debouncedSearchQuery.trim(),
          type: searchType === 'all' ? undefined : searchType,
          limit: 20,
        });

        setResults(response.results);
      } catch (err) {
        if (err && typeof err === 'object' && 'message' in err) {
          setError((err as { message: string }).message);
        } else {
          setError('Failed to search users. Please try again.');
        }
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedSearchQuery, searchType, apiClient]);

  /**
   * Handle add contact
   */
  const handleAddContact = async (contactId: string) => {
    const response = await apiClient.createContactRequest({ contactId });

    // Add to contacts store
    const contactUser = results.find((u) => u.id === contactId);
    if (contactUser) {
      addContact({
        id: response.id,
        userId: response.userId,
        contactId: response.contactId,
        requestedBy: response.requestedBy,
        status: response.status,
        createdAt: new Date(response.createdAt),
        updatedAt: new Date(response.updatedAt),
        contact: {
          id: contactUser.id,
          email: contactUser.email,
          username: contactUser.username,
          displayName: contactUser.displayName,
          phone: contactUser.phone,
          avatarUrl: contactUser.avatarUrl,
          isOnline: contactUser.isOnline,
          lastSeen: new Date(contactUser.lastSeen),
        },
      });
    }
  };

  /**
   * Clear search
   */
  const handleClearSearch = () => {
    setSearchQuery('');
    setResults([]);
    setError(null);
  };

  /**
   * Check if user is already a contact
   */
  const isAlreadyContact = (userId: string): boolean => {
    return contacts.some((c) => c.contactId === userId);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Search Contacts
        </h2>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by email, username, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <Tabs value={searchType} onValueChange={(v) => setSearchType(v as SearchType)}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
            <TabsTrigger value="username">Username</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Error State */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-9 w-20" />
              </div>
            ))}
          </div>
        )}

        {/* Empty State - No Query */}
        {!isLoading && !error && searchQuery.trim().length === 0 && (
          <div className="text-center py-12">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              Start typing to search for contacts
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Search by email, username, or phone number
            </p>
          </div>
        )}

        {/* Empty State - Query Too Short */}
        {!isLoading &&
          !error &&
          searchQuery.trim().length > 0 &&
          searchQuery.trim().length < 2 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                Please enter at least 2 characters
              </p>
            </div>
          )}

        {/* Empty State - No Results */}
        {!isLoading &&
          !error &&
          debouncedSearchQuery.trim().length >= 2 &&
          results.length === 0 && (
            <div className="text-center py-12">
              <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No users found matching &quot;{debouncedSearchQuery}&quot;
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
                Try a different search term or filter
              </p>
            </div>
          )}

        {/* Results List */}
        {!isLoading && !error && results.length > 0 && (
          <div className="space-y-2">
            {results.map((resultUser) => (
              <SearchResultItem
                key={resultUser.id}
                user={resultUser}
                onAddContact={handleAddContact}
                isAlreadyContact={isAlreadyContact(resultUser.id)}
                isSelf={user?.id === resultUser.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

