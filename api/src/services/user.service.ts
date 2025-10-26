/**
 * User Service
 *
 * Handles all user-related CRUD operations using Prisma.
 * Provides methods for creating, reading, updating, and deleting users.
 *
 * @module services/user.service
 */

import { PrismaClient, User, Prisma } from '@prisma/client';

/**
 * User creation data (without sensitive fields)
 */
export interface CreateUserData {
  email: string;
  username: string;
  passwordHash: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
}

/**
 * User update data (all fields optional)
 */
export interface UpdateUserData {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
  phone?: string;
}

/**
 * User without password hash (safe for API responses)
 */
export type SafeUser = Omit<User, 'passwordHash'>;

/**
 * Search type for user search
 */
export type SearchType = 'email' | 'phone' | 'username' | 'all';

/**
 * Search options for user search
 */
export interface SearchUsersOptions {
  query: string;
  type: SearchType;
  currentUserId: string;
  limit?: number;
  offset?: number;
}

/**
 * User Service
 *
 * Provides CRUD operations for users with Prisma ORM.
 * All methods are async and return Promises.
 */
export class UserService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Create a new user
   *
   * @param data - User creation data including email, username, and password hash
   * @returns Created user (without password hash)
   * @throws Error if email or username already exists
   *
   * @example
   * ```typescript
   * const user = await userService.createUser({
   *   email: 'user@example.com',
   *   username: 'johndoe',
   *   passwordHash: hashedPassword,
   *   displayName: 'John Doe'
   * });
   * ```
   */
  async createUser(data: CreateUserData): Promise<SafeUser> {
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        username: data.username,
        passwordHash: data.passwordHash,
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        phone: data.phone,
      },
    });

    return this.excludePasswordHash(user);
  }

  /**
   * Find user by ID
   *
   * @param id - User ID
   * @returns User if found, null otherwise (without password hash)
   *
   * @example
   * ```typescript
   * const user = await userService.findById('user-id-123');
   * if (user) {
   *   console.log('Found user:', user.username);
   * }
   * ```
   */
  async findById(id: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    return user ? this.excludePasswordHash(user) : null;
  }

  /**
   * Find user by email
   *
   * @param email - User email
   * @returns User if found, null otherwise (without password hash)
   *
   * @example
   * ```typescript
   * const user = await userService.findByEmail('user@example.com');
   * ```
   */
  async findByEmail(email: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    return user ? this.excludePasswordHash(user) : null;
  }

  /**
   * Find user by username
   *
   * @param username - Username
   * @returns User if found, null otherwise (without password hash)
   *
   * @example
   * ```typescript
   * const user = await userService.findByUsername('johndoe');
   * ```
   */
  async findByUsername(username: string): Promise<SafeUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    return user ? this.excludePasswordHash(user) : null;
  }

  /**
   * Find user by email or username (for login)
   *
   * @param identifier - Email or username
   * @returns User if found, null otherwise (WITH password hash for verification)
   *
   * @example
   * ```typescript
   * const user = await userService.findByEmailOrUsername('johndoe');
   * if (user) {
   *   const isValid = await authService.verifyPassword(password, user.passwordHash);
   * }
   * ```
   */
  async findByEmailOrUsername(identifier: string): Promise<User | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
    });

    return user;
  }

  /**
   * Update user by ID
   *
   * @param id - User ID
   * @param data - User update data
   * @returns Updated user (without password hash)
   * @throws Error if user not found
   *
   * @example
   * ```typescript
   * const updatedUser = await userService.updateUser('user-id-123', {
   *   displayName: 'John Smith',
   *   bio: 'Software developer'
   * });
   * ```
   */
  async updateUser(id: string, data: UpdateUserData): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        displayName: data.displayName,
        avatarUrl: data.avatarUrl,
        bio: data.bio,
        phone: data.phone,
        updatedAt: new Date(),
      },
    });

    return this.excludePasswordHash(user);
  }

  /**
   * Update user's online status
   *
   * @param id - User ID
   * @param isOnline - Online status
   * @returns Updated user (without password hash)
   *
   * @example
   * ```typescript
   * await userService.updateOnlineStatus('user-id-123', true);
   * ```
   */
  async updateOnlineStatus(id: string, isOnline: boolean): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        isOnline,
        lastSeenAt: new Date(),
        lastActiveAt: isOnline ? new Date() : undefined,
      },
    });

    return this.excludePasswordHash(user);
  }

  /**
   * Update user's last active timestamp
   *
   * @param id - User ID
   * @returns Updated user (without password hash)
   *
   * @example
   * ```typescript
   * await userService.updateLastActive('user-id-123');
   * ```
   */
  async updateLastActive(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.update({
      where: { id },
      data: {
        lastActiveAt: new Date(),
      },
    });

    return this.excludePasswordHash(user);
  }

  /**
   * Delete user by ID
   *
   * @param id - User ID
   * @returns Deleted user (without password hash)
   * @throws Error if user not found
   *
   * @example
   * ```typescript
   * await userService.deleteUser('user-id-123');
   * ```
   */
  async deleteUser(id: string): Promise<SafeUser> {
    const user = await this.prisma.user.delete({
      where: { id },
    });

    return this.excludePasswordHash(user);
  }

  /**
   * Check if email exists
   *
   * @param email - Email to check
   * @returns True if email exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await userService.emailExists('user@example.com');
   * if (exists) {
   *   throw new Error('Email already in use');
   * }
   * ```
   */
  async emailExists(email: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { email },
    });

    return count > 0;
  }

  /**
   * Check if username exists
   *
   * @param username - Username to check
   * @returns True if username exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await userService.usernameExists('johndoe');
   * if (exists) {
   *   throw new Error('Username already taken');
   * }
   * ```
   */
  async usernameExists(username: string): Promise<boolean> {
    const count = await this.prisma.user.count({
      where: { username },
    });

    return count > 0;
  }

  /**
   * Search for users by email, phone, or username
   *
   * @param options - Search options including query, type, and pagination
   * @returns Array of users matching the search criteria (without password hash)
   *
   * @example
   * ```typescript
   * // Search by username
   * const users = await userService.searchUsers({
   *   query: 'john',
   *   type: 'username',
   *   currentUserId: 'user-123',
   *   limit: 20
   * });
   *
   * // Search by email
   * const users = await userService.searchUsers({
   *   query: 'john@example.com',
   *   type: 'email',
   *   currentUserId: 'user-123'
   * });
   *
   * // Universal search
   * const users = await userService.searchUsers({
   *   query: 'john',
   *   type: 'all',
   *   currentUserId: 'user-123'
   * });
   * ```
   */
  async searchUsers(options: SearchUsersOptions): Promise<SafeUser[]> {
    const { query, type, currentUserId, limit = 20, offset = 0 } = options;

    // Get current user's contacts to exclude them from search results
    const contacts = await this.prisma.contact.findMany({
      where: {
        userId: currentUserId,
        status: 'ACCEPTED',
      },
      select: {
        contactId: true,
      },
    });

    const contactIds = contacts.map((c) => c.contactId);
    const excludeIds = [...contactIds, currentUserId];

    // Build search conditions based on type
    let whereConditions: Prisma.UserWhereInput = {
      id: {
        notIn: excludeIds,
      },
    };

    if (type === 'email') {
      // Email: case-insensitive partial match
      whereConditions.email = {
        contains: query,
        mode: 'insensitive',
      };
    } else if (type === 'phone') {
      // Phone: exact match only
      whereConditions.phone = query;
    } else if (type === 'username') {
      // Username: case-insensitive partial match
      whereConditions.username = {
        contains: query,
        mode: 'insensitive',
      };
    } else if (type === 'all') {
      // Search across all fields
      whereConditions.OR = [
        {
          email: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          username: {
            contains: query,
            mode: 'insensitive',
          },
        },
        {
          phone: query,
        },
      ];
    }

    const users = await this.prisma.user.findMany({
      where: whereConditions,
      take: limit,
      skip: offset,
      orderBy: [
        { isOnline: 'desc' }, // Online users first
        { username: 'asc' }, // Then alphabetically by username
      ],
    });

    return users.map((user) => this.excludePasswordHash(user));
  }

  /**
   * Remove password hash from user object
   *
   * @param user - User object with password hash
   * @returns User object without password hash
   * @private
   */
  private excludePasswordHash(user: User): SafeUser {
    const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}

