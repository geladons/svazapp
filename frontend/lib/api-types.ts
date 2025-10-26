/**
 * API request and response types
 */

/**
 * User data from API
 */
export interface ApiUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  phone: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeen: string;
  createdAt: string;
}

/**
 * Authentication tokens
 */
export interface ApiAuthTokens {
  accessToken: string;
  refreshToken: string;
}

/**
 * Register request
 */
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  displayName: string;
  phone?: string;
}

/**
 * Register response
 */
export interface RegisterResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Login request
 */
export interface LoginRequest {
  identifier: string; // email or username
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Refresh token response
 */
export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Update user request
 */
export interface UpdateUserRequest {
  displayName?: string;
  bio?: string;
  phone?: string;
  avatarUrl?: string;
}

/**
 * Search users request
 */
export interface SearchUsersRequest {
  q: string;
  type?: 'email' | 'phone' | 'username' | 'all';
  limit?: number;
  offset?: number;
}

/**
 * Search users response
 */
export interface SearchUsersResponse {
  results: ApiUser[];
  count: number;
  limit: number;
  offset: number;
}

/**
 * LiveKit token request
 */
export interface LiveKitTokenRequest {
  roomName: string;
  participantName: string;
  metadata?: string;
}

/**
 * LiveKit token response
 */
export interface LiveKitTokenResponse {
  token: string;
  url: string;
}

/**
 * API error response
 */
export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode?: number;
}

/**
 * Generic API response wrapper
 */
export interface ApiResponse<T> {
  data?: T;
  error?: ApiErrorResponse;
}

// ==================== Contact API Types ====================

/**
 * Contact status enum
 */
export type ContactStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

/**
 * Contact with user data
 */
export interface ContactWithUser {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  contactId: string;
  requestedBy: string; // ID of user who initiated the contact request
  status: ContactStatus;
  nickname: string | null;
  isFavorite: boolean;
  isBlocked: boolean;
  contact: {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isOnline: boolean;
    lastSeenAt: string;
  };
}

/**
 * Create contact request
 */
export interface CreateContactRequest {
  contactId: string;
}

/**
 * Create contact response
 */
export interface CreateContactResponse {
  id: string;
  createdAt: string;
  updatedAt: string;
  userId: string;
  contactId: string;
  requestedBy: string;
  status: ContactStatus;
  nickname: string | null;
  isFavorite: boolean;
  isBlocked: boolean;
}

/**
 * Get contacts response
 */
export interface GetContactsResponse {
  contacts: ContactWithUser[];
  count: number;
}

// ==================== Chat API Types ====================

/**
 * Chat participant data
 */
export interface ChatParticipant {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string;
}

/**
 * Chat with participant data
 */
export interface ChatWithParticipant {
  id: string;
  createdAt: string;
  updatedAt: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
  lastMessageBy: string | null;
  unreadCount: number;
  participant: ChatParticipant;
}

/**
 * Get chats response
 */
export interface GetChatsResponse {
  chats: ChatWithParticipant[];
}

// ==================== Call API Types ====================

/**
 * Call type enum
 */
export type CallType = 'AUDIO' | 'VIDEO' | 'SCREEN';

/**
 * Call status enum
 */
export type CallStatus =
  | 'INITIATED'
  | 'RINGING'
  | 'ANSWERED'
  | 'ENDED'
  | 'MISSED'
  | 'REJECTED';

/**
 * Call direction enum
 */
export type CallDirection = 'INCOMING' | 'OUTGOING';

/**
 * Call mode enum
 */
export type CallMode = 'NORMAL' | 'EMERGENCY' | 'ASYMMETRIC';

/**
 * Call participant data
 */
export interface CallParticipant {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isOnline: boolean;
  lastSeenAt: string;
}

/**
 * Call with participant data
 */
export interface CallWithParticipant {
  id: string;
  createdAt: string;
  updatedAt: string;
  callerId: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  direction: CallDirection;
  mode: CallMode;
  startedAt: string | null;
  endedAt: string | null;
  duration: number | null;
  participant: CallParticipant;
}

/**
 * Get call history response
 */
export interface GetCallHistoryResponse {
  calls: CallWithParticipant[];
}
