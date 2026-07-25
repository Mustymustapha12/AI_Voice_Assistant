'use client';

// eslint-disable-next-line import-x/no-internal-modules -- official React Hook Form Zod adapter entrypoint.
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/auth-shell';
import { useAuth } from '@/components/providers/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/lib/api-client';

const schema = z.object({
  email: z.email(),
  password: z.string().min(1),
});
type LoginInput = z.infer<typeof schema>;

export default function LoginPage(): React.JSX.Element {
  const auth = useAuth();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<LoginInput>({ resolver: zodResolver(schema) });

  async function submit(input: LoginInput): Promise<void> {
    setError(null);
    try {
      await auth.login(input.email, input.password);
      router.replace('/dashboard');
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Sign in failed. Please try again.');
    }
  }

  return (
    <AuthShell description="Use your verified platform administrator account." title="Sign in">
      <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
        <label className="block space-y-2 text-sm font-medium" htmlFor="email">
          Email
          <Input autoComplete="email" id="email" type="email" {...form.register('email')} />
          <span className="text-sm text-red-600">{form.formState.errors.email?.message}</span>
        </label>
        <label className="block space-y-2 text-sm font-medium" htmlFor="password">
          Password
          <Input
            autoComplete="current-password"
            id="password"
            type="password"
            {...form.register('password')}
          />
        </label>
        {error === null ? null : (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
          {form.formState.isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
        <Link
          className="text-primary block text-center text-sm hover:underline"
          href="/forgot-password"
        >
          Forgot your password?
        </Link>
      </form>
    </AuthShell>
  );
}
