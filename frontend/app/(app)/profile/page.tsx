/**
 * Profile Page
 *
 * Displays and allows editing of user profile information.
 * Shows avatar, display name, username, email, bio, and phone.
 *
 * @module app/(app)/profile/page
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Edit2, Save, X, Loader2, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/auth-store';
import { getUserInitials } from '@/lib/utils';
import { createApiClient } from '@/lib/api-client';

/**
 * Profile Page
 *
 * Shows user profile with edit functionality.
 * Integrates with PATCH /api/users/me for updates.
 *
 * @returns Profile page component
 */
export default function ProfilePage() {
  const router = useRouter();
  const { user, tokens, setAuth, clearAuth } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  /**
   * Create memoized API client
   */
  const apiClient = useMemo(() => {
    const client = createApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:80/api',
      onTokenRefresh: (accessToken, refreshToken) => {
        if (user) {
          setAuth(user, { accessToken, refreshToken });
        }
      },
      onAuthError: () => {
        clearAuth();
        router.push('/login');
      },
    });

    if (tokens) {
      client.setTokens(tokens.accessToken, tokens.refreshToken);
    }

    return client;
  }, [user, tokens, setAuth, clearAuth, router]);

  /**
   * Load user profile
   */
  useEffect(() => {
    const loadProfile = async () => {
      if (!user || !tokens) {
        router.push('/login');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const data = await apiClient.getCurrentUser();

        // Update form state
        setDisplayName(data.displayName || '');
        setBio(data.bio || '');
        setPhone(data.phone || '');
        setAvatarUrl(data.avatarUrl || '');
      } catch (err) {
        console.error('[Profile] Error loading profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, tokens, router, apiClient]);

  /**
   * Save profile changes
   */
  const handleSave = async () => {
    if (!tokens) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(false);

      const updatedUser = await apiClient.updateCurrentUser({
        displayName: displayName.trim() || undefined,
        bio: bio.trim() || undefined,
        phone: phone.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });

      // Update auth store (convert API response to User type)
      setAuth(
        {
          id: updatedUser.id,
          email: updatedUser.email,
          username: updatedUser.username,
          displayName: updatedUser.displayName,
          phone: updatedUser.phone,
          avatarUrl: updatedUser.avatarUrl,
          bio: updatedUser.bio || null,
          isOnline: updatedUser.isOnline,
          lastSeen: new Date(updatedUser.lastSeen),
          createdAt: new Date(updatedUser.createdAt),
        },
        tokens
      );

      setSuccess(true);
      setIsEditing(false);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('[Profile] Error saving profile:', err);
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Cancel editing
   */
  const handleCancel = () => {
    if (!user) return;

    // Reset form to current user data
    setDisplayName(user.displayName || '');
    setBio(user.bio || '');
    setPhone(user.phone || '');
    setAvatarUrl(user.avatarUrl || '');

    setIsEditing(false);
    setError(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-900">
      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Profile</h1>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} variant="outline">
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCancel} variant="outline" disabled={isSaving}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Success message */}
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              Profile updated successfully!
            </p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Profile card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Avatar section */}
          <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="absolute -bottom-16 left-6">
              <div className="relative">
                <Avatar className="w-32 h-32 border-4 border-white dark:border-gray-800">
                  <AvatarImage src={avatarUrl || user.avatarUrl || undefined} alt={user.displayName || user.username} />
                  <AvatarFallback className="text-3xl bg-blue-600 text-white">
                    {getUserInitials(user.displayName || user.username)}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <div className="absolute bottom-0 right-0 bg-blue-600 rounded-full p-2 cursor-pointer hover:bg-blue-700 transition-colors">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Profile info */}
          <div className="pt-20 px-6 pb-6 space-y-6">
            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              {isEditing ? (
                <Input
                  id="displayName"
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                  maxLength={100}
                />
              ) : (
                <p className="text-gray-900 dark:text-white font-medium">
                  {user.displayName || 'Not set'}
                </p>
              )}
            </div>

            {/* Username (read-only) */}
            <div className="space-y-2">
              <Label>Username</Label>
              <p className="text-gray-600 dark:text-gray-400">@{user.username}</p>
            </div>

            {/* Email (read-only) */}
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="text-gray-600 dark:text-gray-400">{user.email}</p>
            </div>

            {/* Bio */}
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              {isEditing ? (
                <Textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell us about yourself"
                  maxLength={500}
                  rows={4}
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {user.bio || 'No bio yet'}
                </p>
              )}
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              {isEditing ? (
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1234567890"
                  maxLength={20}
                />
              ) : (
                <p className="text-gray-600 dark:text-gray-400">
                  {user.phone || 'Not set'}
                </p>
              )}
            </div>

            {/* Avatar URL (for testing - will be replaced with upload) */}
            {isEditing && (
              <div className="space-y-2">
                <Label htmlFor="avatarUrl">Avatar URL (temporary)</Label>
                <Input
                  id="avatarUrl"
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Avatar upload will be implemented in a future update
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

