'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { registerSchema, type RegisterFormData } from '@/lib/validations/auth';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Register form component
 * Handles new user registration
 */
export function RegisterForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    username: '',
    displayName: '',
    password: '',
    confirmPassword: '',
    phone: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof RegisterFormData, string>>
  >({});

  /**
   * Handle form submission
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setIsLoading(true);

    try {
      // Validate form data
      const validatedData = registerSchema.parse(formData);

      // Create API client
      const apiClient = createApiClient({
        baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
        onTokenRefresh: (accessToken, refreshToken) => {
          setAuth(
            useAuthStore.getState().user!,
            { accessToken, refreshToken }
          );
        },
        onAuthError: () => {
          useAuthStore.getState().clearAuth();
          router.push('/login');
        },
      });

      // Register
      const response = await apiClient.register({
        email: validatedData.email,
        username: validatedData.username,
        displayName: validatedData.displayName,
        password: validatedData.password,
        phone: validatedData.phone || undefined,
      });

      // Update auth store
      setAuth(
        {
          id: response.user.id,
          email: response.user.email,
          username: response.user.username,
          displayName: response.user.displayName,
          bio: response.user.bio || null,
          phone: response.user.phone,
          avatarUrl: response.user.avatarUrl,
          isOnline: response.user.isOnline,
          lastSeen: new Date(response.user.lastSeen),
          createdAt: new Date(response.user.createdAt),
        },
        {
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
        }
      );

      // Redirect to home
      router.push('/');
    } catch (err) {
      if (err && typeof err === 'object' && 'issues' in err) {
        // Zod validation errors
        const zodError = err as { issues: Array<{ path: string[]; message: string }> };
        const errors: Partial<Record<keyof RegisterFormData, string>> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof RegisterFormData;
          errors[field] = issue.message;
        });
        setFieldErrors(errors);
      } else if (err && typeof err === 'object' && 'message' in err) {
        // API error
        setError((err as { message: string }).message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle input change
   */
  const handleChange = (field: keyof RegisterFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          Fill in the information below to create your account
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.email ? 'border-red-500' : ''}
            />
            {fieldErrors.email && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="username"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.username ? 'border-red-500' : ''}
            />
            {fieldErrors.username && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.username}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              type="text"
              placeholder="Your Name"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.displayName ? 'border-red-500' : ''}
            />
            {fieldErrors.displayName && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.displayName}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">
              Phone Number <span className="text-gray-500">(optional)</span>
            </Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.phone ? 'border-red-500' : ''}
            />
            {fieldErrors.phone && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.phone}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => handleChange('password', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.password ? 'border-red-500' : ''}
            />
            {fieldErrors.password && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={(e) => handleChange('confirmPassword', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.confirmPassword ? 'border-red-500' : ''}
            />
            {fieldErrors.confirmPassword && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.confirmPassword}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

