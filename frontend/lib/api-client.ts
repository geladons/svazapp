import type {
  ApiUser,
  RegisterRequest,
  RegisterResponse,
  LoginRequest,
  LoginResponse,
  RefreshTokenResponse,
  UpdateUserRequest,
  SearchUsersRequest,
  SearchUsersResponse,
  LiveKitTokenRequest,
  LiveKitTokenResponse,
  ApiErrorResponse,
  CreateContactRequest,
  CreateContactResponse,
  GetContactsResponse,
  ContactStatus,
  GetChatsResponse,
  GetCallHistoryResponse,
} from './api-types';

/**
 * API client configuration
 */
interface ApiClientConfig {
  baseUrl: string;
  onTokenRefresh?: (accessToken: string, refreshToken: string) => void;
  onAuthError?: () => void;
}

/**
 * API client class
 * Handles all HTTP requests to the backend API with automatic token management
 */
export class ApiClient {
  private baseUrl: string;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (accessToken: string, refreshToken: string) => void;
  private onAuthError?: () => void;
  private isRefreshing = false;
  private refreshPromise: Promise<void> | null = null;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl;
    this.onTokenRefresh = config.onTokenRefresh;
    this.onAuthError = config.onAuthError;
  }

  /**
   * Set authentication tokens
   */
  setTokens(accessToken: string, refreshToken: string): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add existing headers
    if (options.headers) {
      Object.entries(options.headers).forEach(([key, value]) => {
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
    }

    // Add authorization header if token exists
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && this.refreshToken) {
        await this.handleTokenRefresh();
        // Retry the request with new token
        return this.request<T>(endpoint, options);
      }

      // Parse response
      const data = await response.json();

      if (!response.ok) {
        throw {
          error: data.error || 'Request failed',
          message: data.message || response.statusText,
          statusCode: response.status,
        } as ApiErrorResponse;
      }

      return data as T;
    } catch (error) {
      if (error && typeof error === 'object' && 'error' in error) {
        throw error;
      }
      throw {
        error: 'Network Error',
        message: 'Failed to connect to the server',
        statusCode: 0,
      } as ApiErrorResponse;
    }
  }

  /**
   * Handle token refresh
   */
  private async handleTokenRefresh(): Promise<void> {
    // If already refreshing, wait for that promise
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = (async () => {
      try {
        if (!this.refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken: this.refreshToken }),
        });

        if (!response.ok) {
          throw new Error('Token refresh failed');
        }

        const data: RefreshTokenResponse = await response.json();
        this.setTokens(data.accessToken, data.refreshToken);

        // Notify about token refresh
        if (this.onTokenRefresh) {
          this.onTokenRefresh(data.accessToken, data.refreshToken);
        }
      } catch (error) {
        // Clear tokens and notify about auth error
        this.clearTokens();
        if (this.onAuthError) {
          this.onAuthError();
        }
        throw error;
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * GET request
   */
  private async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  /**
   * POST request
   */
  private async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  private async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * PATCH request
   */
  private async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // ==================== Auth API ====================

  /**
   * Register a new user
   */
  async register(data: RegisterRequest): Promise<RegisterResponse> {
    const response = await this.post<RegisterResponse>('/auth/register', data);
    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /**
   * Login user
   */
  async login(data: LoginRequest): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/auth/login', data);
    this.setTokens(response.accessToken, response.refreshToken);
    return response;
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(
    refreshToken: string
  ): Promise<RefreshTokenResponse> {
    return this.post<RefreshTokenResponse>('/auth/refresh', {
      refreshToken,
    });
  }

  // ==================== User API ====================

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiUser> {
    return this.get<ApiUser>('/users/me');
  }

  /**
   * Update current user profile
   */
  async updateCurrentUser(data: UpdateUserRequest): Promise<ApiUser> {
    return this.patch<ApiUser>('/users/me', data);
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<ApiUser> {
    return this.get<ApiUser>(`/users/${userId}`);
  }

  /**
   * Search users
   */
  async searchUsers(params: SearchUsersRequest): Promise<SearchUsersResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('q', params.q);
    if (params.type) queryParams.append('type', params.type);
    if (params.limit) queryParams.append('limit', params.limit.toString());
    if (params.offset) queryParams.append('offset', params.offset.toString());

    return this.get<SearchUsersResponse>(
      `/users/search?${queryParams.toString()}`
    );
  }

  /**
   * Delete current user account
   */
  async deleteCurrentUser(): Promise<{ message: string }> {
    return this.delete<{ message: string }>('/users/me');
  }

  // ==================== Contact API ====================

  /**
   * Create contact request (send friend request)
   */
  async createContactRequest(
    data: CreateContactRequest
  ): Promise<CreateContactResponse> {
    return this.post<CreateContactResponse>('/contacts', data);
  }

  /**
   * Get contacts list
   */
  async getContacts(status?: ContactStatus): Promise<GetContactsResponse> {
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);

    const endpoint =
      queryParams.toString().length > 0
        ? `/contacts?${queryParams.toString()}`
        : '/contacts';

    return this.get<GetContactsResponse>(endpoint);
  }

  /**
   * Accept contact request
   */
  async acceptContact(contactId: string): Promise<CreateContactResponse> {
    return this.patch<CreateContactResponse>(
      `/contacts/${contactId}/accept`
    );
  }

  /**
   * Reject contact request
   */
  async rejectContact(contactId: string): Promise<{ message: string }> {
    return this.patch<{ message: string }>(`/contacts/${contactId}/reject`);
  }

  /**
   * Block contact
   */
  async blockContact(contactId: string): Promise<CreateContactResponse> {
    return this.patch<CreateContactResponse>(`/contacts/${contactId}/block`);
  }

  /**
   * Delete contact
   */
  async deleteContact(contactId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/contacts/${contactId}`);
  }

  // ==================== Chat API ====================

  /**
   * Get all chats for authenticated user
   */
  async getChats(): Promise<GetChatsResponse> {
    return this.get<GetChatsResponse>('/chats');
  }

  /**
   * Mark chat as read
   */
  async markChatAsRead(chatId: string): Promise<{ message: string }> {
    return this.patch<{ message: string }>(`/chats/${chatId}/read`);
  }

  /**
   * Delete chat
   */
  async deleteChat(chatId: string): Promise<{ message: string }> {
    return this.delete<{ message: string }>(`/chats/${chatId}`);
  }

  // ==================== Call API ====================

  /**
   * Get call history
   */
  async getCallHistory(
    filter: 'all' | 'missed' = 'all',
    limit: number = 50
  ): Promise<GetCallHistoryResponse> {
    const queryParams = new URLSearchParams();
    queryParams.append('filter', filter);
    queryParams.append('limit', limit.toString());

    return this.get<GetCallHistoryResponse>(`/calls?${queryParams.toString()}`);
  }

  // ==================== LiveKit API ====================

  /**
   * Generate LiveKit access token
   */
  async generateLiveKitToken(
    data: LiveKitTokenRequest
  ): Promise<LiveKitTokenResponse> {
    return this.post<LiveKitTokenResponse>('/livekit/token', data);
  }

  // ==================== Health Check ====================

  /**
   * Check API health
   */
  async healthCheck(): Promise<{ status: string }> {
    return this.get<{ status: string }>('/health');
  }
}

/**
 * Create API client instance
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

/**
 * Default API client instance
 *
 * This is a singleton instance used by sync-manager and other utilities.
 * It uses environment variables for configuration.
 *
 * Note: This instance does NOT have tokens set by default.
 * Components should use createApiClient() with proper token callbacks.
 */
export const apiClient = new ApiClient({
  baseUrl:
    typeof window !== 'undefined'
      ? '/api' // Browser: use relative URL
      : process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api', // Server: use absolute URL
  onTokenRefresh: () => {
    // No-op for default instance
    // Components should use createApiClient() with proper callbacks
  },
  onAuthError: () => {
    // No-op for default instance
    // Components should use createApiClient() with proper callbacks
  },
});
