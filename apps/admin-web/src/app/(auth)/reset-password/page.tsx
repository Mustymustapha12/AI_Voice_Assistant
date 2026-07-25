import { Suspense } from 'react';

import { AuthShell } from '@/components/auth/auth-shell';
import { TokenPasswordForm } from '@/components/auth/token-password-form';

export default function ResetPasswordPage(): React.JSX.Element {
  return (
    <AuthShell
      description="The link is single-use and expires after 30 minutes."
      title="Choose a new password"
    >
      <Suspense fallback={<p className="text-sm">Loading…</p>}>
        <TokenPasswordForm endpoint="/auth/reset-password" />
      </Suspense>
    </AuthShell>
  );
}
