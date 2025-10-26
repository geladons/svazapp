'use client';

import { ChatList } from '@/components/chats/chat-list';

/**
 * Chats page
 * Main screen showing list of all conversations
 */
export default function ChatsPage() {
  return (
    <div className="h-full bg-white dark:bg-gray-900">
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Chats
        </h1>
      </div>
      <div className="h-[calc(100%-73px)] overflow-y-auto">
        <ChatList />
      </div>
    </div>
  );
}

