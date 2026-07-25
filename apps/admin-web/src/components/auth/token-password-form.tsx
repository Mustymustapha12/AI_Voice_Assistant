'use client';

// eslint-disable-next-line import-x/no-internal-modules -- official React Hook Form Zod adapter entrypoint.
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError, publicRequest } from '@/lib/api-client';

const schema = z
  .object({
    confirmPassword: z.string(),
    password: z
      .string()
      .min(12)
      .regex(/[a-z]/, 'Include a lowercase letter.')
      .regex(/[A-Z]/, 'Include an uppercase letter.')
      .regex(/[0-9]/, 'Include a number.')
      .regex(/[^A-Za-z0-9]/, 'Include a symbol.'),
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });
type PasswordInput = z.infer<typeof schema>;

export function TokenPasswordForm({ endpoint }: { readonly endpoint: string }): React.JSX.Element {
  const token = useSearchParams().get('token') ?? '';
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PasswordInput>({ resolver: zodResolver(schema) });

  async function submit(input: PasswordInput): Promise<void> {
    setError(null);
    try {
      await publicRequest(endpoint, { password: input.password, token });
      setComplete(true);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The request could not be completed.');
    }
  }

  if (complete) {
    return (
      <div className="space-y-4 text-sm">
        <p>Your password is set. You can now sign in.</p>
        <Link className="text-primary hover:underline" href="/login">
          Continue to sign in
        </Link>
      </div>
    );
  }
  if (token.length === 0) {
    return <p className="text-sm text-red-600">This link is incomplete. Request a new email.</p>;
  }
  return (
    <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
      <label className="block space-y-2 text-sm font-medium" htmlFor="new-password">
        New password
        <Input
          autoComplete="new-password"
          id="new-password"
          type="password"
          {...form.register('password')}
        />
        <span className="text-sm text-red-600">{form.formState.errors.password?.message}</span>
      </label>
      <label className="block space-y-2 text-sm font-medium" htmlFor="confirm-password">
        Confirm password
        <Input
          autoComplete="new-password"
          id="confirm-password"
          type="password"
          {...form.register('confirmPassword')}
        />
        <span className="text-sm text-red-600">
          {form.formState.errors.confirmPassword?.message}
        </span>
      </label>
      {error === null ? null : (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
        Save password
      </Button>
    </form>
  );
}
