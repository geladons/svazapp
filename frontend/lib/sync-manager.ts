import { db, type DBUser, type DBContact, type DBCall, type DBMessage } from './db';
import { apiClient } from './api-client';

/**
 * Sync Manager
 *
 * Handles bidirectional synchronization between API and IndexedDB.
 *
 * Normal Mode: API → IndexedDB (cache)
 * Emergency Mode: IndexedDB → Memory (read-only)
 * Recovery: IndexedDB → API (pending operations)
 */
export class SyncManager {
  /**
   * Set authentication tokens for API client
   *
   * This must be called before any sync operations.
   *
   * @param accessToken - JWT access token
   * @param refreshToken - JWT refresh token
   */
  setTokens(accessToken: string, refreshToken: string): void {
    apiClient.setTokens(accessToken, refreshToken);
  }

  /**
   * Sync current user data from API to IndexedDB
   */
  async syncUser(): Promise<void> {
    try {
      const user = await apiClient.getCurrentUser();
      
      const dbUser: DBUser = {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        isOnline: user.isOnline,
        lastSeen: new Date(user.lastSeen),
        createdAt: new Date(user.createdAt),
        updatedAt: new Date(),
      };

      await db.users.put(dbUser);
      console.log('[SyncManager] User synced to IndexedDB');
    } catch (error) {
      console.error('[SyncManager] Failed to sync user:', error);
      throw error;
    }
  }

  /**
   * Sync contacts from API to IndexedDB
   */
  async syncContacts(): Promise<void> {
    try {
      const response = await apiClient.getContacts();
      
      const dbContacts: DBContact[] = response.contacts.map((contact) => ({
        id: contact.id,
        userId: contact.userId,
        contactId: contact.contactId,
        status: contact.status,
        createdAt: new Date(contact.createdAt),
        updatedAt: new Date(contact.updatedAt),
      }));

      // Also sync contact user data to users table
      const contactUsers: DBUser[] = response.contacts.map((contact) => ({
        id: contact.contact.id,
        email: contact.contact.email,
        username: contact.contact.username,
        displayName: contact.contact.displayName || contact.contact.username,
        phone: null,
        avatarUrl: contact.contact.avatarUrl,
        isOnline: contact.contact.isOnline,
        lastSeen: new Date(contact.contact.lastSeenAt),
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      await db.transaction('rw', [db.contacts, db.users], async () => {
        await db.contacts.bulkPut(dbContacts);
        await db.users.bulkPut(contactUsers);
      });

      console.log(`[SyncManager] ${dbContacts.length} contacts synced to IndexedDB`);
    } catch (error) {
      console.error('[SyncManager] Failed to sync contacts:', error);
      throw error;
    }
  }

  /**
   * NOTE: Messages are NOT synced from API
   *
   * Messages are sent via Socket.io and stored only in Dexie.js.
   * The server does not store message content, only chat metadata.
   *
   * This method is kept for future reference but does nothing.
   */
  async syncMessages(): Promise<void> {
    console.log('[SyncManager] Messages are not synced from API (Socket.io only)');
  }

  /**
   * Sync call history from API to IndexedDB
   */
  async syncCallHistory(): Promise<void> {
    try {
      const response = await apiClient.getCallHistory();
      
      const dbCalls: DBCall[] = response.calls.map((call) => ({
        id: call.id,
        callerId: call.callerId,
        receiverId: call.receiverId,
        type: call.type,
        status: call.status,
        direction: call.direction,
        mode: 'NORMAL',
        startedAt: call.startedAt ? new Date(call.startedAt) : null,
        endedAt: call.endedAt ? new Date(call.endedAt) : null,
        duration: call.duration,
        createdAt: new Date(call.createdAt),
      }));

      await db.calls.bulkPut(dbCalls);
      console.log(`[SyncManager] ${dbCalls.length} calls synced to IndexedDB`);
    } catch (error) {
      console.error('[SyncManager] Failed to sync call history:', error);
      throw error;
    }
  }

  /**
   * Perform full sync of all data from API to IndexedDB
   * 
   * This is called on login or when transitioning from Emergency → Normal mode.
   */
  async fullSync(): Promise<void> {
    console.log('[SyncManager] Starting full sync...');

    try {
      await Promise.all([
        this.syncUser(),
        this.syncContacts(),
        this.syncCallHistory(),
      ]);

      console.log('[SyncManager] Full sync complete');
    } catch (error) {
      console.error('[SyncManager] Full sync failed:', error);
      throw error;
    }
  }

  /**
   * Load all data from IndexedDB to memory
   * 
   * This is called when transitioning to Emergency mode.
   * Returns all cached data for offline use.
   */
  async loadOfflineData(): Promise<{
    user: DBUser | undefined;
    contacts: DBContact[];
    messages: DBMessage[];
    calls: DBCall[];
  }> {
    console.log('[SyncManager] Loading offline data from IndexedDB...');

    try {
      const [user, contacts, messages, calls] = await Promise.all([
        db.users.toCollection().first(),
        db.contacts.toArray(),
        db.messages.toArray(),
        db.calls.toArray(),
      ]);

      console.log('[SyncManager] Offline data loaded:', {
        user: user ? 'found' : 'not found',
        contacts: contacts.length,
        messages: messages.length,
        calls: calls.length,
      });

      return {
        user,
        contacts,
        messages,
        calls,
      };
    } catch (error) {
      console.error('[SyncManager] Failed to load offline data:', error);
      throw error;
    }
  }

  /**
   * Clear all synced data from IndexedDB
   * 
   * This is called on logout.
   */
  async clearAll(): Promise<void> {
    console.log('[SyncManager] Clearing all data from IndexedDB...');

    try {
      await db.clearAll();
      console.log('[SyncManager] All data cleared');
    } catch (error) {
      console.error('[SyncManager] Failed to clear data:', error);
      throw error;
    }
  }
}

/**
 * Singleton sync manager instance
 */
export const syncManager = new SyncManager();

