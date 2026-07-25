import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { TokenPasswordForm } from '@/components/auth/token-password-form';

export default function VerifyEmailPage(): React.JSX.Element {
  return (
    <AuthShell
      description="Verify your invitation and create your administrator password."
      title="Activate account"
    >
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TokenPasswordForm endpoint="/auth/verify-email" />
      </Suspense>
    </AuthShell>
  );
}
