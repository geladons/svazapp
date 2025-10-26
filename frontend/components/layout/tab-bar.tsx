'use client';

import { MessageCircle, Phone, Users } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

/**
 * Tab bar item type
 */
interface TabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

/**
 * Tab bar items configuration
 */
const tabs: TabItem[] = [
  {
    id: 'chats',
    label: 'Chats',
    icon: MessageCircle,
    path: '/chats',
  },
  {
    id: 'calls',
    label: 'Calls',
    icon: Phone,
    path: '/calls',
  },
  {
    id: 'contacts',
    label: 'Contacts',
    icon: Users,
    path: '/contacts',
  },
];

/**
 * Bottom tab bar component
 * Provides navigation between main app sections
 * Enhanced with smooth animations and visual feedback
 */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (path: string) => {
    return pathname.startsWith(path);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-2 py-2 safe-area-inset-bottom transition-colors duration-200">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = isActive(tab.path);

          return (
            <button
              key={tab.id}
              onClick={() => router.push(tab.path)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-200 min-w-[80px] relative',
                active
                  ? 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 hover:scale-105 active:scale-95'
              )}
            >
              <Icon className={cn(
                'h-6 w-6 transition-transform duration-200',
                active && 'stroke-[2.5] scale-110'
              )} />
              <span className={cn(
                'text-xs transition-all duration-200',
                active && 'font-semibold'
              )}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

