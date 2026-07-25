import Link from 'next/link';
import type { PropsWithChildren } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface AuthShellProps extends PropsWithChildren {
  readonly description: string;
  readonly title: string;
}

export function AuthShell({ children, description, title }: AuthShellProps): React.JSX.Element {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link className="mb-6 block text-center text-sm font-semibold tracking-wide" href="/">
          AI Voice Commerce
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
