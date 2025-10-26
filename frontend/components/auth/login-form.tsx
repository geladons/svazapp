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
import { loginSchema, type LoginFormData } from '@/lib/validations/auth';
import { createApiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

/**
 * Login form component
 * Handles user authentication with email/username and password
 */
export function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<LoginFormData>({
    identifier: '',
    password: '',
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof LoginFormData, string>>
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
      const validatedData = loginSchema.parse(formData);

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

      // Login
      const response = await apiClient.login({
        identifier: validatedData.identifier,
        password: validatedData.password,
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
        const errors: Partial<Record<keyof LoginFormData, string>> = {};
        zodError.issues.forEach((issue) => {
          const field = issue.path[0] as keyof LoginFormData;
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
  const handleChange = (field: keyof LoginFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Login</CardTitle>
        <CardDescription>
          Enter your email or username and password to access your account
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
            <Label htmlFor="identifier">Email or Username</Label>
            <Input
              id="identifier"
              type="text"
              placeholder="Enter your email or username"
              value={formData.identifier}
              onChange={(e) => handleChange('identifier', e.target.value)}
              disabled={isLoading}
              className={fieldErrors.identifier ? 'border-red-500' : ''}
            />
            {fieldErrors.identifier && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {fieldErrors.identifier}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
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
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Logging in...' : 'Login'}
          </Button>
          <p className="text-sm text-center text-gray-600 dark:text-gray-400">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}

