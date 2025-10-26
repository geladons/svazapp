import Dexie, { type EntityTable } from 'dexie';

/**
 * User interface for offline storage
 */
export interface DBUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  phone: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Contact interface for offline storage
 */
export interface DBContact {
  id: string;
  userId: string;
  contactId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Message interface for offline storage
 */
export interface DBMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'AUDIO' | 'FILE';
  status: 'SENDING' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  createdAt: Date;
  updatedAt: Date;
  localOnly?: boolean; // True if message hasn't been synced to server
}

/**
 * Call interface for offline storage
 */
export interface DBCall {
  id: string;
  callerId: string;
  receiverId: string;
  type: 'AUDIO' | 'VIDEO' | 'SCREEN';
  status: 'INITIATED' | 'RINGING' | 'ANSWERED' | 'ENDED' | 'MISSED' | 'REJECTED';
  direction: 'INCOMING' | 'OUTGOING';
  mode: 'NORMAL' | 'EMERGENCY' | 'ASYMMETRIC';
  startedAt: Date | null;
  endedAt: Date | null;
  duration: number | null;
  createdAt: Date;
}

/**
 * Room interface for offline storage (group calls)
 */
export interface DBRoom {
  id: string;
  name: string;
  creatorId: string;
  livekitRoomName: string | null;
  isActive: boolean;
  allowGuests: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Room participant interface for offline storage
 */
export interface DBRoomParticipant {
  id: string;
  roomId: string;
  userId: string | null;
  guestName: string | null;
  joinedAt: Date;
  leftAt: Date | null;
}

/**
 * Sync queue interface for offline operations
 */
export interface DBSyncQueue {
  id?: number;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity: 'USER' | 'CONTACT' | 'MESSAGE' | 'CALL' | 'ROOM';
  entityId: string;
  data: unknown;
  createdAt: Date;
  attempts: number;
  lastAttempt: Date | null;
  error: string | null;
}

/**
 * Dexie database class for svaz.app
 * Provides offline-first storage for all application data
 */
class SvazAppDatabase extends Dexie {
  users!: EntityTable<DBUser, 'id'>;
  contacts!: EntityTable<DBContact, 'id'>;
  messages!: EntityTable<DBMessage, 'id'>;
  calls!: EntityTable<DBCall, 'id'>;
  rooms!: EntityTable<DBRoom, 'id'>;
  roomParticipants!: EntityTable<DBRoomParticipant, 'id'>;
  syncQueue!: EntityTable<DBSyncQueue, 'id'>;

  constructor() {
    super('svazapp');

    this.version(1).stores({
      // Users table
      // Indexes: id (primary), email, username, isOnline
      users: 'id, email, username, isOnline, lastSeen',

      // Contacts table
      // Indexes: id (primary), userId, contactId, status
      contacts: 'id, userId, contactId, status, [userId+contactId]',

      // Messages table
      // Indexes: id (primary), senderId, receiverId, createdAt, status
      messages:
        'id, senderId, receiverId, createdAt, status, [senderId+receiverId], localOnly',

      // Calls table
      // Indexes: id (primary), callerId, receiverId, createdAt, status
      calls: 'id, callerId, receiverId, createdAt, status, type, mode',

      // Rooms table
      // Indexes: id (primary), creatorId, isActive
      rooms: 'id, creatorId, isActive, livekitRoomName',

      // Room participants table
      // Indexes: id (primary), roomId, userId
      roomParticipants: 'id, roomId, userId, joinedAt',

      // Sync queue table
      // Indexes: id (auto-increment primary), entity, createdAt, attempts
      syncQueue: '++id, entity, createdAt, attempts, lastAttempt',
    });
  }

  /**
   * Clear all data from the database
   */
  async clearAll(): Promise<void> {
    await this.users.clear();
    await this.contacts.clear();
    await this.messages.clear();
    await this.calls.clear();
    await this.rooms.clear();
    await this.roomParticipants.clear();
    await this.syncQueue.clear();
  }

  /**
   * Get database size in bytes (approximate)
   */
  async getSize(): Promise<number> {
    const tables = [
      this.users,
      this.contacts,
      this.messages,
      this.calls,
      this.rooms,
      this.roomParticipants,
      this.syncQueue,
    ];

    let totalSize = 0;
    for (const table of tables) {
      const count = await table.count();
      // Rough estimate: 1KB per record
      totalSize += count * 1024;
    }

    return totalSize;
  }

  /**
   * Export all data as JSON
   */
  async exportData(): Promise<string> {
    const data = {
      users: await this.users.toArray(),
      contacts: await this.contacts.toArray(),
      messages: await this.messages.toArray(),
      calls: await this.calls.toArray(),
      rooms: await this.rooms.toArray(),
      roomParticipants: await this.roomParticipants.toArray(),
      syncQueue: await this.syncQueue.toArray(),
    };

    return JSON.stringify(data, null, 2);
  }

  /**
   * Import data from JSON
   */
  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData);

    await this.transaction('rw', this.tables, async () => {
      if (data.users) await this.users.bulkPut(data.users);
      if (data.contacts) await this.contacts.bulkPut(data.contacts);
      if (data.messages) await this.messages.bulkPut(data.messages);
      if (data.calls) await this.calls.bulkPut(data.calls);
      if (data.rooms) await this.rooms.bulkPut(data.rooms);
      if (data.roomParticipants)
        await this.roomParticipants.bulkPut(data.roomParticipants);
      if (data.syncQueue) await this.syncQueue.bulkPut(data.syncQueue);
    });
  }
}

/**
 * Database instance
 * Use this instance throughout the application
 */
export const db = new SvazAppDatabase();

