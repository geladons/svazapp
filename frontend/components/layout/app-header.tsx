'use client';

import { Search, UserCircle2, Bell, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useContactsStore } from '@/store/contacts-store';
import { useAuthStore } from '@/store/auth-store';

/**
 * App header component
 * Displays screen title, search icon, notifications icon, and profile icon
 *
 * Design changes:
 * - Removed duplicate User icon (contact requests moved to Contacts page)
 * - Added Bell icon for notifications
 * - Changed profile icon to UserCircle2 for better distinction
 */
export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  // Get incoming contact requests count from store
  const getIncomingRequests = useContactsStore(
    (state) => state.getIncomingRequests
  );
  const pendingCount = user ? getIncomingRequests(user.id).length : 0;

  // Determine screen title based on current route
  const getScreenTitle = () => {
    if (pathname.includes('/chats')) return 'Chats';
    if (pathname.includes('/calls')) return 'Calls';
    if (pathname.includes('/contacts')) return 'Contacts';
    if (pathname.includes('/home')) return 'Home';
    return 'svaz.app';
  };

  const handleSearch = () => {
    // Navigate to contacts page where search is available
    router.push('/contacts');
  };

  const handleProfile = () => {
    // Navigate to profile page
    router.push('/profile');
  };

  const handleNotifications = () => {
    // Navigate to contact requests page (notifications)
    router.push('/contacts/requests');
  };

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
          {getScreenTitle()}
        </h1>
        <div className="flex items-center gap-2">
          {/* Search button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearch}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>

          {/* Notifications button (contact requests) */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotifications}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {pendingCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-5 flex items-center justify-center p-0 px-1 text-xs font-semibold animate-pulse"
              >
                {pendingCount > 9 ? '9+' : pendingCount}
              </Badge>
            )}
          </div>

          {/* Settings button */}
          <Link href="/settings">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          </Link>
          {/* Profile button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleProfile}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-all duration-200 hover:scale-110"
            aria-label="Profile"
          >
            <UserCircle2 className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}

