import { create } from 'zustand';

/**
 * Contact status enum
 */
export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

/**
 * Contact interface
 */
export interface Contact {
  id: string;
  userId: string;
  contactId: string;
  requestedBy: string; // ID of user who initiated the contact request
  status: ContactStatus;
  createdAt: Date;
  updatedAt: Date;
  contact: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    phone: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeen: Date;
  };
}

/**
 * Contacts state interface
 */
export interface ContactsState {
  /**
   * List of all contacts
   */
  contacts: Contact[];

  /**
   * Whether contacts are being loaded
   */
  isLoading: boolean;

  /**
   * Error message if any
   */
  error: string | null;

  /**
   * Set contacts list
   */
  setContacts: (contacts: Contact[]) => void;

  /**
   * Add a new contact
   */
  addContact: (contact: Contact) => void;

  /**
   * Update a contact
   */
  updateContact: (contactId: string, updates: Partial<Contact>) => void;

  /**
   * Remove a contact
   */
  removeContact: (contactId: string) => void;

  /**
   * Update contact status
   */
  updateContactStatus: (contactId: string, status: ContactStatus) => void;

  /**
   * Update contact online status
   */
  updateContactOnlineStatus: (userId: string, isOnline: boolean) => void;

  /**
   * Get accepted contacts only
   */
  getAcceptedContacts: () => Contact[];

  /**
   * Get pending contacts only
   */
  getPendingContacts: () => Contact[];

  /**
   * Get incoming contact requests (requests sent to me)
   * These are pending contacts where someone else initiated the request
   */
  getIncomingRequests: (currentUserId: string) => Contact[];

  /**
   * Get outgoing contact requests (requests I sent)
   * These are pending contacts where I initiated the request
   */
  getOutgoingRequests: (currentUserId: string) => Contact[];

  /**
   * Get blocked contacts only
   */
  getBlockedContacts: () => Contact[];

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Set error
   */
  setError: (error: string | null) => void;

  /**
   * Clear all contacts
   */
  clearContacts: () => void;
}

/**
 * Contacts store
 * Manages user contacts and their statuses
 */
export const useContactsStore = create<ContactsState>((set, get) => ({
  contacts: [],
  isLoading: false,
  error: null,

  setContacts: (contacts: Contact[]) => {
    set({ contacts, isLoading: false, error: null });
  },

  addContact: (contact: Contact) => {
    set((state) => ({
      contacts: [...state.contacts, contact],
    }));
  },

  updateContact: (contactId: string, updates: Partial<Contact>) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === contactId ? { ...c, ...updates } : c
      ),
    }));
  },

  removeContact: (contactId: string) => {
    set((state) => ({
      contacts: state.contacts.filter((c) => c.id !== contactId),
    }));
  },

  updateContactStatus: (contactId: string, status: ContactStatus) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.id === contactId ? { ...c, status, updatedAt: new Date() } : c
      ),
    }));
  },

  updateContactOnlineStatus: (userId: string, isOnline: boolean) => {
    set((state) => ({
      contacts: state.contacts.map((c) =>
        c.contact.id === userId
          ? {
              ...c,
              contact: {
                ...c.contact,
                isOnline,
                lastSeen: isOnline ? c.contact.lastSeen : new Date(),
              },
            }
          : c
      ),
    }));
  },

  getAcceptedContacts: () => {
    return get().contacts.filter((c) => c.status === 'ACCEPTED');
  },

  getPendingContacts: () => {
    return get().contacts.filter((c) => c.status === 'PENDING');
  },

  getIncomingRequests: (currentUserId: string) => {
    return get().contacts.filter(
      (c) => c.status === 'PENDING' && c.requestedBy !== currentUserId
    );
  },

  getOutgoingRequests: (currentUserId: string) => {
    return get().contacts.filter(
      (c) => c.status === 'PENDING' && c.requestedBy === currentUserId
    );
  },

  getBlockedContacts: () => {
    return get().contacts.filter((c) => c.status === 'BLOCKED');
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error });
  },

  clearContacts: () => {
    set({ contacts: [], isLoading: false, error: null });
  },
}));

