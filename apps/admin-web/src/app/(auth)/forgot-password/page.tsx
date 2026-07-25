'use client';

// eslint-disable-next-line import-x/no-internal-modules -- official React Hook Form Zod adapter entrypoint.
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { AuthShell } from '@/components/auth/auth-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { publicRequest } from '@/lib/api-client';

const schema = z.object({ email: z.email() });
type ForgotPasswordInput = z.infer<typeof schema>;

export default function ForgotPasswordPage(): React.JSX.Element {
  const [accepted, setAccepted] = useState(false);
  const form = useForm<ForgotPasswordInput>({ resolver: zodResolver(schema) });

  async function submit(input: ForgotPasswordInput): Promise<void> {
    await publicRequest('/auth/forgot-password', input);
    setAccepted(true);
  }

  return (
    <AuthShell
      description="If the account is eligible, we will send a time-limited reset link."
      title="Reset your password"
    >
      {accepted ? (
        <div className="space-y-4 text-sm">
          <p>Check your inbox for the next step. The response is the same for every email.</p>
          <Link className="text-primary hover:underline" href="/login">
            Return to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(event) => void form.handleSubmit(submit)(event)}>
          <label className="block space-y-2 text-sm font-medium" htmlFor="recovery-email">
            Email
            <Input
              autoComplete="email"
              id="recovery-email"
              type="email"
              {...form.register('email')}
            />
          </label>
          <Button className="w-full" disabled={form.formState.isSubmitting} type="submit">
            Send reset link
          </Button>
        </form>
      )}
    </AuthShell>
  );
}
