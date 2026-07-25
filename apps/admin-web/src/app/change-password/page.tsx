'use client';

// eslint-disable-next-line import-x/no-internal-modules -- official React Hook Form Zod adapter entrypoint.
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/auth-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';

const schema = z
  .object({
    confirmPassword: z.string(),
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(12)
      .regex(/[a-z]/)
      .regex(/[A-Z]/)
      .regex(/[0-9]/)
      .regex(/[^A-Za-z0-9]/),
  })
  .refine((input) => input.newPassword === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })
  .refine((input) => input.newPassword !== input.currentPassword, {
    message: 'Choose a different password.',
    path: ['newPassword'],
  });
type ChangePasswordInput = z.infer<typeof schema>;

export default function ChangePasswordPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<ChangePasswordInput>({ resolver: zodResolver(schema) });

  async function submit(input: ChangePasswordInput): Promise<void> {
    setError(null);
    try {
      await auth.changePassword(input.currentPassword, input.newPassword);
      router.replace('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Password change failed.');
    }
  }

  return (
    <AuthShell
      description="Your bootstrap password must be replaced before accessing the platform."
      title="Change your password"
    >
      <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <label className="block space-y-2 text-sm font-medium" htmlFor="current-password">
          Current password
          <Input
            autoComplete="current-password"
            id="current-password"
            type="password"
            {...form.register('currentPassword')}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium" htmlFor="required-new-password">
          New password
          <Input
            autoComplete="new-password"
            id="required-new-password"
            type="password"
            {...form.register('newPassword')}
          />
          <span className="text-sm text-red-600">{form.formState.errors.newPassword?.message}</span>
        </label>
        <label className="block space-y-2 text-sm font-medium" htmlFor="required-confirm-password">
          Confirm password
          <Input
            autoComplete="new-password"
            id="required-confirm-password"
            type="password"
            {...form.register('confirmPassword')}
          />
        </label>
        {error === null ? null : (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          Change password
        </Button>
      </form>
    </AuthShell>
  );
}
