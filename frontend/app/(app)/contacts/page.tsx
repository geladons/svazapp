'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, UserPlus, X } from 'lucide-react';
import { ContactsList } from '@/components/contacts/contacts-list';
import { ContactSearch } from '@/components/contacts/contact-search';
import { QuickCallButton } from '@/components/calls/quick-call-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContactsStore } from '@/store/contacts-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * Contacts page
 * Shows contacts list and search functionality
 */
export default function ContactsPage() {
  const router = useRouter();
  const [showSearch, setShowSearch] = useState(false);
  const user = useAuthStore((state) => state.user);
  const getIncomingRequests = useContactsStore(
    (state) => state.getIncomingRequests
  );
  const pendingCount = user ? getIncomingRequests(user.id).length : 0;

  return (
    <div className="h-full flex flex-col">
      {/* Pending Requests Banner */}
      {pendingCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <p className="text-sm text-blue-900 dark:text-blue-100">
                You have{' '}
                <span className="font-semibold">
                  {pendingCount} pending contact{' '}
                  {pendingCount === 1 ? 'request' : 'requests'}
                </span>
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/contacts/requests')}
              className="border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40"
            >
              View Requests
              <Badge
                variant="secondary"
                className="ml-2 bg-blue-600 text-white hover:bg-blue-600"
              >
                {pendingCount}
              </Badge>
            </Button>
          </div>
        </div>
      )}

      {/* Quick Call and Add Contact Buttons */}
      {!showSearch && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 space-y-3">
          {/* Quick Call Button */}
          <QuickCallButton />

          {/* Add Contact Button */}
          <Button
            onClick={() => setShowSearch(true)}
            variant="outline"
            className="w-full"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Add Contact
          </Button>
        </div>
      )}

      {/* Contact Search (when active) */}
      {showSearch && (
        <div className="flex-1 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Search Contacts
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowSearch(false)}
              className="text-gray-600 dark:text-gray-400"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ContactSearch />
          </div>
        </div>
      )}

      {/* Contacts List (when search is not active) */}
      {!showSearch && (
        <div className="flex-1 overflow-hidden">
          <ContactsList />
        </div>
      )}
    </div>
  );
}

